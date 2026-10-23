'use strict';

const express = require('express');
const router = express.Router();
const { transferTicket } = require('../services/ticketTransferService');
const { protect } = require('../middleware/auth');

// POST /api/tickets/transfer - Safely transfer ticket to another user
router.post('/transfer', protect, async (req, res) => {
  try {
    const { orderId, itemId, toIdentifier, note } = req.body;
    if (!orderId || !toIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar el número de orden y el usuario/correo del destinatario'
      });
    }

    const result = await transferTicket({
      orderId,
      itemId,
      fromUserId: req.user.id,
      toIdentifier,
      transferNote: note
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Error al procesar la transferencia segura de entrada'
    });
  }
});

module.exports = router;
