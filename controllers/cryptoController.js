const CryptoPayment = require('../models/CryptoPayment');
const axios = require('axios');
const crypto = require('crypto');
const debugLog = (message, data = '') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] BACKEND DEBUG: ${message}`, data);
};
// Real implementation with NOWPayments
exports.createPayment = async (req, res) => {
  try {
    debugLog('Payment creation request received', {
      body: req.body,
      headers: req.headers
    });

    const { amount, currency = 'USD', customer, items } = req.body;

    if (!amount || amount <= 0) {
      debugLog('Invalid amount received', { amount });
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    debugLog('Creating NOWPayments request', {
      price_amount: amount,
      price_currency: currency,
      items_count: items.length
    });

    const paymentData = {
      price_amount: amount,
      price_currency: currency,
      pay_currency: 'LTC',
      ipn_callback_url: `${process.env.BASE_URL}/api/crypto/ipn`,
      order_id: `order_${Date.now()}`,
      order_description: `Payment for ${items.length} items`,
      customer_email: customer.email
    };

    const response = await axios.post('https://api.nowpayments.io/v1/payment', paymentData, {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    debugLog('NOWPayments response received', {
      status: response.status,
      data: response.data
    });

    // In createPayment function, replace the payment object creation with:
    const payment = new CryptoPayment({
      transactionId: response.data.payment_id,
      amount: response.data.price_amount,
      currency: response.data.price_currency,
      cryptoAmount: response.data.pay_amount,
      cryptoCurrency: response.data.pay_currency,
      walletAddress: response.data.pay_address,
      status: 'pending',
      customer,
      items,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      paymentUrl: response.data.invoice_url,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${response.data.pay_address}`,
      nowpaymentsData: response.data
    });

    await payment.save();
    debugLog('Payment record saved to database', {
      paymentId: payment._id,
      transactionId: payment.transactionId
    });

    res.status(201).json({
      success: true,
      ...response.data
    });

  } catch (error) {
    debugLog('Payment creation error', {
      error: error.response?.data || error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Payment creation failed'
    });
  }
};

exports.handleIPN = async (req, res) => {
  try {
    debugLog('IPN callback received', {
      headers: req.headers,
      body: req.body
    });

    const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET);
    const data = JSON.stringify(req.body);
    const signature = hmac.update(data).digest('hex');

    if (signature !== req.headers['x-nowpayments-sig']) {
      debugLog('Invalid IPN signature', {
        received: req.headers['x-nowpayments-sig'],
        calculated: signature
      });
      return res.status(400).send('Invalid signature');
    }

    const { payment_id, payment_status } = req.body;
    debugLog('Processing IPN callback', {
      payment_id,
      payment_status
    });

    const updatedPayment = await CryptoPayment.findOneAndUpdate(
      { transactionId: payment_id },
      {
        status: payment_status === 'finished' ? 'completed' : 'failed',
        nowpaymentsData: req.body
      },
      { new: true }
    );

    if (!updatedPayment) {
      debugLog('Payment not found for IPN', { payment_id });
      return res.status(404).send('Payment not found');
    }

    debugLog('Payment status updated via IPN', {
      paymentId: updatedPayment._id,
      newStatus: updatedPayment.status
    });

    res.status(200).send('OK');
  } catch (error) {
    debugLog('IPN processing error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).send('IPN processing failed');
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    debugLog('Payment verification request received', { transactionId });

    const payment = await CryptoPayment.findOne({ transactionId });
    if (!payment) {
      debugLog('Payment not found in database', { transactionId });
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (payment.status === 'completed') {
      debugLog('Payment already completed in database', {
        transactionId,
        completedAt: payment.updatedAt
      });
      return res.json({
        success: true,
        verified: true,
        payment
      });
    }

    debugLog('Checking payment status with NOWPayments', { transactionId });
    const response = await axios.get(`https://api.nowpayments.io/v1/payment/${transactionId}`, {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY
      }
    });

    const paymentStatus = response.data.payment_status;
    debugLog('NOWPayments verification response', {
      transactionId,
      paymentStatus
    });

    if (paymentStatus === 'finished') {
      const updatedPayment = await CryptoPayment.findOneAndUpdate(
        { transactionId },
        {
          status: 'completed',
          nowpaymentsData: response.data
        },
        { new: true }
      );
      debugLog('Payment marked as completed', {
        transactionId,
        updatedAt: updatedPayment.updatedAt
      });
    }

    res.json({
      success: true,
      verified: paymentStatus === 'finished',
      payment: response.data
    });

  } catch (error) {
    debugLog('Payment verification error', {
      error: error.response?.data || error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Verification failed'
    });
  }
};
// Keep other controller methods the same
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await CryptoPayment.find().sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to get payments' });
  }
};

exports.getPayment = async (req, res) => {
  try {
    const payment = await CryptoPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to get payment' });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'completed', 'failed', 'expired'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required' });
    }

    const payment = await CryptoPayment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update payment' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await CryptoPayment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete payment' });
  }
};