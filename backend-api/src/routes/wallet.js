const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

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

// @desc    Top up wallet (Simulated)
// @route   POST /api/wallet/topup
// @access  Private
router.post('/topup', [
  protect,
  body('amount').isFloat({ min: 10 }).withMessage('Minimum top up is 10')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount } = req.body;
    let wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    // Update balance
    wallet.balance += parseFloat(amount);
    await wallet.save();

    // Create transaction record
    const transaction = await Transaction.create({
      wallet: wallet._id,
      type: 'deposit',
      amount: parseFloat(amount),
      description: 'Recarga de saldo',
      status: 'completed'
    });

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        transaction
      }
    });
  } catch (error) {
    console.error('Error topping up:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Transfer money to another user
// @route   POST /api/wallet/transfer
// @access  Private
router.post('/transfer', [
  protect,
  body('recipientId').isString().notEmpty(),
  body('amount').isFloat({ min: 1 }).withMessage('Minimum transfer is 1')
], async (req, res) => {
  // const session = await Wallet.startSession();
  // session.startTransaction();

  try {
    const { recipientId, amount, note } = req.body;
    const transferAmount = parseFloat(amount);

    const senderWallet = await Wallet.findOne({ user: req.user._id }); // .session(session);
    const recipientUser = await User.findById(recipientId);

    if (!recipientUser) {
      throw new Error('Recipient not found');
    }

    let recipientWallet = await Wallet.findOne({ user: recipientId }); // .session(session);
    if (!recipientWallet) {
      recipientWallet = await Wallet.create([{ user: recipientId }]); // , { session });
      recipientWallet = recipientWallet[0];
    }

    if (senderWallet.balance < transferAmount) {
      throw new Error('Insufficient funds');
    }

    // Deduct from sender
    senderWallet.balance -= transferAmount;
    await senderWallet.save(); // { session }

    // Add to recipient
    recipientWallet.balance += transferAmount;
    await recipientWallet.save(); // { session }

    // Create sender transaction
    const senderTx = await Transaction.create({
      wallet: senderWallet._id,
      type: 'transfer',
      amount: -transferAmount,
      description: note || `Transferencia a ${recipientUser.firstName}`,
      recipient: recipientUser._id,
      status: 'completed'
    }); // , { session });

    // Create recipient transaction
    await Transaction.create({
      wallet: recipientWallet._id,
      type: 'transfer',
      amount: transferAmount,
      description: note || `Transferencia de ${req.user.firstName}`,
      recipient: req.user._id,
      status: 'completed'
    }); // , { session });

    // await session.commitTransaction();

    // Populate recipient for response
    const populatedTx = await Transaction.findById(senderTx._id).populate('recipient', 'firstName lastName avatar');

    res.json({
      success: true,
      data: {
        balance: senderWallet.balance,
        transaction: {
          id: populatedTx._id,
          type: populatedTx.type,
          amount: populatedTx.amount,
          currency: populatedTx.currency,
          description: populatedTx.description,
          date: populatedTx.date,
          status: populatedTx.status,
          recipient: {
            id: populatedTx.recipient._id,
            name: `${populatedTx.recipient.firstName} ${populatedTx.recipient.lastName}`,
            avatar: populatedTx.recipient.avatar
          }
        }
      }
    });

  } catch (error) {
    // await session.abortTransaction();
    console.error('Transfer error:', error);
    res.status(400).json({ success: false, message: error.message || 'Transfer failed' });
  } finally {
    // session.endSession();
  }
});

module.exports = router;
