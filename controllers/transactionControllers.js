const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');
const path = require('path');
const fs = require('fs');

const handleImageUpload = (files) => {
  const imagePaths = [];
  if (!files || !files.images) return imagePaths;
  
  const images = Array.isArray(files.images) ? files.images : [files.images];
  
  images.forEach(image => {
    const uploadPath = path.join(__dirname, '../uploads', image.name);
    image.mv(uploadPath);
    imagePaths.push(`/uploads/${image.name}`);
  });
  
  return imagePaths;
};

exports.createTransaction = async (req, res) => {
  try {
    const { user, cartItems } = req.body;
    const images = handleImageUpload(req.files);

    if (!cartItems?.length) {
      return res.status(400).json({ error: "Cart items are required" });
    }
    if (!user?.id || !user?.address) {
      return res.status(400).json({ error: "User details are incomplete" });
    }

    const amount = cartItems.reduce((total, item) => {
      return total + (item.product?.price || 0) * (item.quantity || 1);
    }, 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'pkr',
      metadata: { userId: user.id },
      payment_method_types: ['card']
    });

    const retrievedIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
      expand: ['charges.data.payment_method_details.card']
    });
    
    console.log('Retrieved Intent:', retrievedIntent);
    const paymentMethod = retrievedIntent?.charges?.data[0]?.payment_method_details?.card;

    const cardDetails = paymentMethod
      ? {
          brand: paymentMethod.brand, 
          last4: paymentMethod.last4,  
          exp_month: paymentMethod.exp_month, 
          exp_year: paymentMethod.exp_year,   
          country: paymentMethod.country,     
          funding: paymentMethod.funding,    
          cvc_check: paymentMethod.checks?.cvc_check 
        }
      : {};
      console.log('Retrieved cardDetails:', cardDetails);

    const transaction = new Transaction({
      user,
      cartItems,
      paymentDetails: {
        paymentIntentId: paymentIntent.id,
        amount,
        status: 'requires_payment_method',
        method: 'card', 
        card: cardDetails 
      },
      images,
      status: 'processing' // Explicitly set status to 'processing'
    });
    
    await transaction.save();

    res.status(201).json({
      status: 'requires_payment_method',
      transactionId: transaction._id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: 'PKR'
    });

  } catch (error) {
    console.error('Transaction Error:', error);
    res.status(500).json({
      error: 'Transaction failed',
      details: error.message
    });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });
    
    const paymentIntent = await stripe.paymentIntents.retrieve(transaction.paymentDetails.paymentIntentId);
    
    if (paymentIntent.charges.data[0]?.payment_method_details?.card) {
      transaction.paymentDetails.card = paymentIntent.charges.data[0].payment_method_details.card;
      transaction.paymentDetails.receiptUrl = paymentIntent.charges.data[0].receipt_url;
      await transaction.save();
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const images = handleImageUpload(req.files);

    if (images.length > 0) {
      updates.images = images;
    }

    const transaction = await Transaction.findByIdAndUpdate(id, updates, { new: true });
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    transaction.images.forEach(image => {
      const imagePath = path.join(__dirname, '..', image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};