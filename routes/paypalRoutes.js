const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');

// Create transaction
router.post('/create', paypalController.createTransaction);

// Get transaction by ID
router.get('/:id', paypalController.getTransaction);

// Update transaction
router.put('/:id', paypalController.updateTransaction);

// Get all transactions
router.get('/', paypalController.getTransactions);

module.exports = router;