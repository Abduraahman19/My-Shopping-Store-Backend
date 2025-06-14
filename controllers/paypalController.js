const Transaction = require('../models/paypalTransaction');

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { paymentMethod, status, amount, items, transactionId, paymentDetails } = req.body;

    const transaction = new Transaction({
      paymentMethod,
      status,
      amount,
      items: items.map(item => ({
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image
      })),
      transactionId,
      paymentDetails
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get transaction by ID
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ transactionId: req.params.id });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update transaction status
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId: req.params.id },
      { status: req.body.status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};