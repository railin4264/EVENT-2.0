const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// @desc    Get wallet balance and transactions
// @route   GET /api/wallet
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    const transactions = await Transaction.find({ wallet: wallet._id })
      .sort({ date: -1 })
      .limit(20)
      .populate('recipient', 'firstName lastName avatar');

    res.json({
      success: true,
      data: {
        balance: {
          amount: wallet.balance,
          currency: wallet.currency,
          lastUpdated: wallet.updatedAt
        },
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          description: t.description,
          date: t.date,
          status: t.status,
          recipient: t.recipient ? {
            id: t.recipient._id,
            name: `${t.recipient.firstName} ${t.recipient.lastName}`,
            avatar: t.recipient.avatar
          } : undefined
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// A stored balance is not a payment rail. Never credit demo funds.
router.post('/topup', protect, (req, res) => res.status(503).json({
  success: false, code: 'PAYMENTS_NOT_CONFIGURED', message: 'Las recargas no están habilitadas: falta configurar y verificar el proveedor de pagos.'
}));

// @desc    Transfer money to another user
// @route   POST /api/wallet/transfer
// @access  Private
router.post('/transfer', [
  protect,
  body('recipientId').isString().notEmpty(),
  body('amount').isFloat({ min: 1 }).withMessage('Minimum transfer is 1')
], async (req, res) => {
  return res.status(503).json({ success: false, code: 'TRANSFERS_NOT_CONFIGURED', message: 'Las transferencias de dinero no están habilitadas. No se ha debitado ningún saldo.' });

});

module.exports = router;
