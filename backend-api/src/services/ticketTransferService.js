'use strict';

const crypto = require('crypto');
const Order = require('../models/Order');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Safe Ticket Transfer Service (Anti-Fraud P2P)
 * Securely transfers an event ticket between verified users.
 * Immediately invalidates the previous QR code and mints a fresh cryptographic pass for the recipient.
 */

async function transferTicket({ orderId, itemId, fromUserId, toIdentifier, transferNote = '' }) {
  if (!orderId || !fromUserId || !toIdentifier) {
    throw new Error('Faltan datos obligatorios para la transferencia');
  }

  // Find order
  const order = await Order.findById(orderId).populate('eventId');
  if (!order) {
    throw new Error('Orden de entrada no encontrada');
  }

  if (String(order.userId) !== String(fromUserId)) {
    throw new Error('No tienes autorización para transferir esta entrada');
  }

  if (order.status !== 'completed' && order.status !== 'active') {
    throw new Error('Solo se pueden transferir entradas activas y pagadas');
  }

  // Find the specific item in the order
  const item = order.items.id(itemId) || order.items[0];
  if (!item) {
    throw new Error('Boleto específico no encontrado en la orden');
  }

  if (item.checkedInAt) {
    throw new Error('Esta entrada ya fue escaneada y utilizada en la entrada del evento');
  }

  if (item.transferredTo) {
    throw new Error('Esta entrada ya ha sido transferida previamente');
  }

  // Find recipient user by email or username
  const cleanTo = String(toIdentifier).trim().toLowerCase();
  const recipient = await User.findOne({
    $or: [
      { email: cleanTo },
      { username: cleanTo.replace(/^@/, '') }
    ]
  });

  if (!recipient) {
    throw new Error(`No se encontró ningún usuario registrado con el correo o usuario "${toIdentifier}". Debe tener cuenta en EventNow.`);
  }

  if (String(recipient._id) === String(fromUserId)) {
    throw new Error('No puedes transferirte la entrada a ti mismo');
  }

  // Generate new cryptographic security hash for recipient
  const newPasscode = 'EN-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const transferTimestamp = new Date();

  // Create a new child Order or transferred ticket record for recipient
  const recipientOrder = await Order.create({
    orderNumber: `TX-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    userId: recipient._id,
    eventId: order.eventId._id,
    customerInfo: {
      firstName: recipient.firstName || recipient.username,
      lastName: recipient.lastName || 'Transferido',
      email: recipient.email,
      phone: recipient.phone || ''
    },
    items: [{
      ticketId: item.ticketId,
      quantity: 1,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice,
      transferPasscode: newPasscode,
      transferredFrom: fromUserId,
      transferredAt: transferTimestamp,
      transferNote: transferNote.slice(0, 150)
    }],
    subtotal: item.unitPrice,
    total: item.unitPrice,
    currency: order.currency || 'USD',
    paymentMethod: 'p2p_transfer',
    status: 'completed'
  });

  // Invalidate previous item in sender's order
  item.transferredTo = recipient._id;
  item.transferredAt = transferTimestamp;
  item.status = 'transferred_out';
  item.invalidatedPass = true;
  await order.save();

  // Update Event Attendees: Add recipient as confirmed attendee
  try {
    await Event.updateOne(
      { _id: order.eventId._id, 'attendees.user': { $ne: recipient._id } },
      {
        $push: {
          attendees: {
            user: recipient._id,
            status: 'confirmed',
            joinedAt: transferTimestamp
          }
        }
      }
    );
  } catch {
    // Non-fatal if already in attendees
  }

  // Send Notification to recipient
  try {
    await Notification.create({
      recipient: recipient._id,
      sender: fromUserId,
      type: 'ticket_transfer',
      title: '🎟️ ¡Te han transferido una entrada oficial!',
      message: `Has recibido una entrada para "${order.eventId?.title || 'tu evento'}" con código seguro ${newPasscode}. Tu QR ya está activo en tu perfil.`,
      metadata: {
        eventId: order.eventId._id,
        orderId: recipientOrder._id
      }
    });
  } catch {
    // Non-fatal notification
  }

  return {
    success: true,
    message: `Entrada transferida con éxito a @${recipient.username}. El código anterior ha sido invalidado de inmediato.`,
    transferRecord: {
      fromUserId,
      toUser: {
        _id: recipient._id,
        username: recipient.username,
        firstName: recipient.firstName
      },
      eventId: order.eventId._id,
      eventTitle: order.eventId?.title,
      newOrderNumber: recipientOrder.orderNumber,
      newPasscode,
      transferredAt: transferTimestamp
    }
  };
}

module.exports = { transferTicket };
