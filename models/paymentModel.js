const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: [
      "Credit Card",
      "Debit Card",
      "Easypaisa",
      "Jazz Cash",
      "Bank Account Transfer",
      "Bank Transfer",
      "Cash on Delivery",
    ],
  },
  details: {
    cardHolderName: { type: String },
    cardNumber: { type: String },
    expiryDate: { type: String },
    cvv: { type: String },
    billingAddress: { type: String },
    mobileNumber: { type: String },
    transactionId: { type: String },
    cnic: { type: String },
    accountTitle: { type: String },
    bankName: { type: String },
    senderAccountNumber: { type: String },
    transferDate: { type: String },
    deliveryAddress: { type: String },
    recipientName: { type: String },
    notes: { type: String },
    paymentProof: { type: String },
  },
  orderId: { type: String },  
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);