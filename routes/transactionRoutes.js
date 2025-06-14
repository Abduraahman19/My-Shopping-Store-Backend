const express = require('express');
const router = express.Router();
const transactionControllers = require('../controllers/transactionControllers');

router.post('/create', 
  transactionControllers.createTransaction
);

router.get('/', 
  transactionControllers.getAllTransactions
);

router.get('/:id', 
  transactionControllers.getTransactionById
);

router.put('/:id', 
  transactionControllers.updateTransaction
);

router.delete('/:id', 
  transactionControllers.deleteTransaction
);

module.exports = router;