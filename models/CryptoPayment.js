const mongoose = require('mongoose');

const cryptoSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  cryptoAmount: { type: Number },
  cryptoCurrency: { type: String, required: true },
  walletAddress: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'expired'], default: 'pending' },
  customer: {
    name: { type: String },
    email: { type: String },
  },
  items: [
    {
      name: { type: String },
      quantity: { type: Number },
      price: { type: Number }
    }
  ],
  expiresAt: { type: Date },
  paymentUrl: { type: String },
  qrCodeUrl: { type: String },
  nowpaymentsData: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('CryptoPayment', cryptoSchema);
