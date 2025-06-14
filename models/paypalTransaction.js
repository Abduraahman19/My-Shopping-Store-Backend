const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    required: true,
    enum: ['paypal']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded']
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    productId: String,
    title: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  paymentDetails: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Transaction || mongoose.model('paypalTransaction', TransactionSchema);
