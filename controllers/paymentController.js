const Payment = require("../models/paymentModel");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const createPayment = async (req, res) => {
  try {
    const { method, orderId, details } = req.body;

    let paymentProofPath = null;
    if (details.paymentProof && details.paymentProof.startsWith('data:')) {
      const matches = details.paymentProof.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const fileExt = fileType.split('/')[1] || 'bin';
        const filename = `payment_${Date.now()}.${fileExt}`;
        paymentProofPath = `uploads/payments/${filename}`;

        const fs = require('fs');
        const path = require('path');
        const dir = path.dirname(paymentProofPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(paymentProofPath, buffer);
      }
    }

    const paymentData = {
      method,
      orderId,
      details: {
        ...details,
        paymentProof: paymentProofPath
      }
    };

    const payment = await Payment.create(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(400).json({ error: error.message });
  }
};
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.status(200).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updatePaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.status(200).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deletePaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePaymentById,
  deletePaymentById,
};

