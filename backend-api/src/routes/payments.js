const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateOrderCreation = [
  body('eventId').isMongoId().withMessage('Valid event ID required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.ticketId').isMongoId().withMessage('Valid ticket ID required'),
  body('items.*.quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10').toInt(),
  body('customerInfo.firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('customerInfo.lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('customerInfo.email').optional().isEmail(),
  body('customerInfo.phone').optional().trim()
];

// @desc    Get available tickets for an event
// @route   GET /api/payments/events/:eventId/tickets
// @access  Public
router.get('/events/:eventId/tickets', [
  param('eventId').isMongoId().withMessage('Valid event ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.params;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get available tickets
    const tickets = await Ticket.getAvailableTickets(eventId);

    res.json({
      success: true,
      data: {
        event: {
          id: event._id,
          title: event.title,
          date: event.date
        },
        tickets: tickets.map(ticket => ({
          id: ticket._id,
          name: ticket.name,
          description: ticket.description,
          price: ticket.price,
          currency: ticket.currency,
          type: ticket.type,
          remaining: ticket.remaining,
          minPurchase: ticket.minPurchase,
          maxPurchase: ticket.maxPurchase,
          isFree: ticket.isFree
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting event tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tickets'
    });
  }
});

// @desc    Create new order
// @route   POST /api/payments/orders
// @access  Private
router.post('/orders', [protect, ...validateOrderCreation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId, items, customerInfo } = req.body;

    const result = await paymentService.createOrder(
      req.user._id,
      eventId,
      items,
      customerInfo
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: result.order
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
});

// @desc    Get order details
// @route   GET /api/payments/orders/:orderId
// @access  Private
router.get('/orders/:orderId', [
  protect,
  param('orderId').isMongoId().withMessage('Valid order ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'firstName lastName email')
      .populate('eventId', 'title date location images')
      .populate('items.ticketId', 'name type price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order'
    });
  }
});

// @desc    Get user orders
// @route   GET /api/payments/orders
// @access  Private
router.get('/orders', protect, async (req, res) => {
  try {
    const { status } = req.query;

    const result = await paymentService.getUserOrders(req.user._id, status);

    res.json({
      success: true,
      data: result.orders
    });
  } catch (error) {
    logger.error('Error getting user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
});

// @desc    Confirm payment
// @route   POST /api/payments/orders/:orderId/confirm
// @access  Private
router.post('/orders/:orderId/confirm', [
  protect,
  param('orderId').isMongoId().withMessage('Valid order ID required'),
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;
    const { paymentIntentId } = req.body;

    // Verify order ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await paymentService.confirmPayment(orderId, paymentIntentId);

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: result.order
    });
  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm payment'
    });
  }
});

// @desc    Cancel order
// @route   DELETE /api/payments/orders/:orderId
// @access  Private
router.delete('/orders/:orderId', [
  protect,
  param('orderId').isMongoId().withMessage('Valid order ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;
    const { reason } = req.body;

    // Verify order ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await paymentService.cancelOrder(orderId, reason);

    res.json({
      success: true,
      message: 'Order canceled successfully',
      data: result.order
    });
  } catch (error) {
    logger.error('Error canceling order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
});

// @desc    Process refund (admin only)
// @route   POST /api/payments/orders/:orderId/refund
// @access  Private (Admin)
router.post('/orders/:orderId/refund', [
  protect,
  param('orderId').isMongoId().withMessage('Valid order ID required'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Valid refund amount required'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long')
], async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;
    const { amount, reason } = req.body;

    const result = await paymentService.processRefund(orderId, amount, reason);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund: result.refund,
        order: result.order
      }
    });
  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
});

// @desc    Create payment intent (legacy support)
// @route   POST /api/payments/intent
// @access  Private
// Shared handler for creating a payment intent (mounted on both /intent
// and the legacy alias /create-intent expected by older clients/tests).
const createIntentValidators = [
  protect,
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
  body('currency').optional().isIn(['usd', 'eur', 'gbp', 'mxn']).withMessage('Invalid currency'),
  body('eventId').optional().isMongoId().withMessage('Valid event ID required')
];

const createPaymentIntentHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, currency = 'usd', eventId, description } = req.body;

    const result = await paymentService.createPaymentIntent(amount, currency, {
      userId: req.user._id.toString(),
      eventId: eventId?.toString() || '',
      description: description || 'Event ticket purchase'
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Payment intent created successfully',
        data: result.paymentIntent
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to create payment intent'
      });
    }
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
};

router.post('/intent', createIntentValidators, createPaymentIntentHandler);
router.post('/create-intent', createIntentValidators, createPaymentIntentHandler);

// @desc    Get event orders (for event organizers)
// @route   GET /api/payments/events/:eventId/orders
// @access  Private
router.get('/events/:eventId/orders', [
  protect,
  param('eventId').isMongoId().withMessage('Valid event ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.params;
    const { status } = req.query;

    // Verify event ownership or admin access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await paymentService.getEventOrders(eventId, status);

    res.json({
      success: true,
      data: result.orders
    });
  } catch (error) {
    logger.error('Error getting event orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event orders'
    });
  }
});

// @desc    Get sales report (for event organizers)
// @route   GET /api/payments/events/:eventId/report
// @access  Private
router.get('/events/:eventId/report', [
  protect,
  param('eventId').isMongoId().withMessage('Valid event ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify event ownership or admin access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await paymentService.generateSalesReport(eventId, startDate, endDate);

    res.json({
      success: true,
      data: result.report
    });
  } catch (error) {
    logger.error('Error generating sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report'
    });
  }
});

// @desc    Webhook for Stripe events
// @route   POST /api/payments/webhook
// @access  Public (but verified with Stripe signature)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !paymentService.isConfigured) {
      return res.status(400).json({
        success: false,
        message: 'Webhook not configured'
      });
    }

    let event;

    try {
      event = paymentService.stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Handle the event
    switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await paymentService.confirmCheckout(event.data.object);
      break;
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      logger.info(`PaymentIntent ${paymentIntent.id} succeeded`);

      // Find and update order
      const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
      if (order && order.status === 'pending_payment') {
        await paymentService.confirmPayment(order._id, paymentIntent.id);
        logger.info(`Order ${order.orderNumber} automatically confirmed via webhook`);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      logger.warn(`PaymentIntent ${paymentIntent.id} failed`);

      // Find and cancel order
      const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
      if (order && order.status === 'pending_payment') {
        await paymentService.cancelOrder(order._id, 'Payment failed');
        logger.info(`Order ${order.orderNumber} automatically canceled due to payment failure`);
      }
      break;
    }
    default:
      logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

router.post('/orders/:orderId/checkout', protect, param('orderId').isMongoId(), async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ success: false, message: 'Valid order ID required' });
  try {
    const data = await paymentService.createCheckoutSession(req.params.orderId, req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Hosted checkout failed:', error.message);
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
});

// ─── Pagos Dominicanos: Transferencias Bancarias (RD Monetization) ───────────

// @route   POST /api/payments/orders/:orderId/bank-transfer
// @desc    Comprador sube comprobante/referencia de transferencia bancaria dominicana
router.post('/orders/:orderId/bank-transfer', protect, param('orderId').isMongoId(), async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ success: false, message: 'ID de orden inválido' });
  try {
    const { bankName, referenceNumber, voucherUrl } = req.body;
    if (!referenceNumber || !String(referenceNumber).trim()) {
      return res.status(400).json({ success: false, message: 'Ingresa el número de referencia de la transferencia' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    if (String(order.userId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'No estás autorizado a modificar esta orden' });
    }

    order.paymentMethod = 'bank_transfer_rd';
    order.paymentStatus = 'pending';
    order.status = 'pending_payment';
    order.bankTransferProof = {
      bankName: bankName ? String(bankName).slice(0, 60) : 'Transferencia Bancaria',
      referenceNumber: String(referenceNumber).trim().slice(0, 50),
      voucherUrl: voucherUrl ? String(voucherUrl).trim() : undefined,
      uploadedAt: new Date(),
      status: 'pending'
    };

    await order.save();

    res.json({
      success: true,
      message: 'Comprobante recibido. El organizador verificará tu pago.',
      data: order
    });
  } catch (error) {
    logger.error('Submit bank transfer error:', error);
    res.status(500).json({ success: false, message: 'No se pudo registrar el comprobante de transferencia' });
  }
});

// @route   POST /api/payments/orders/:orderId/verify-transfer
// @desc    Organizador aprueba o rechaza la transferencia bancaria
router.post('/orders/:orderId/verify-transfer', protect, param('orderId').isMongoId(), async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ success: false, message: 'ID de orden inválido' });
  try {
    const { action, reason } = req.body; // 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Acción inválida. Usa approve o reject' });
    }

    const order = await Order.findById(req.params.orderId).populate('eventId', 'createdBy title');
    if (!order) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    const isCreator = order.eventId && String(order.eventId.createdBy) === String(req.user.id);
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el creador del evento o un admin puede verificar transferencias' });
    }

    if (!order.bankTransferProof) {
      return res.status(400).json({ success: false, message: 'Esta orden no tiene un comprobante de transferencia registrado' });
    }

    order.bankTransferProof.reviewedBy = req.user.id;
    order.bankTransferProof.reviewedAt = new Date();

        if (action === 'approve') {
      order.bankTransferProof.status = 'approved';
      order.paymentStatus = 'succeeded';
      order.status = 'confirmed';
      await order.save();

      // Add to event attendees if not present
      if (order.eventId) {
        try {
          const eventDoc = await Event.findById(order.eventId._id || order.eventId);
          if (eventDoc) {
            const alreadyAttending = eventDoc.attendees && eventDoc.attendees.some(a => String(a.user) === String(order.userId));
            if (!alreadyAttending) {
              eventDoc.attendees.push({
                user: order.userId,
                status: 'confirmed',
                joinedAt: new Date()
              });
              eventDoc.attendeesCount = (eventDoc.attendeesCount || 0) + 1;
              await eventDoc.save();
            }
          }
        } catch (attErr) {
          logger.warn('Failed to update event attendees on bank transfer approval: ' + attErr.message);
        }
      }

      // Send in-app notification to buyer
      try {
        await Notification.createNotification({
          recipient: order.userId,
          sender: req.user.id,
          type: 'event_update',
          title: '¡Transferencia bancaria aprobada! 🎉',
          message: `Tu pago para "${order.eventId?.title || 'tu evento'}" fue verificado exitosamente. Tu boleta con código QR ya está activa en Mis Entradas.`,
          data: { orderId: order._id, eventId: order.eventId?._id || order.eventId },
          actionUrl: '/tickets',
          priority: 'high'
        });
      } catch (notifErr) {
        logger.warn('Failed to send approval notification: ' + notifErr.message);
      }

      return res.json({ success: true, message: 'Pago verificado y boleta confirmada con éxito', data: order });
    } else {
      order.bankTransferProof.status = 'rejected';
      order.bankTransferProof.rejectionReason = reason ? String(reason).slice(0, 200) : 'Comprobante no coincide con el balance';
      order.paymentStatus = 'failed';
      await order.save();

      try {
        await Notification.createNotification({
          recipient: order.userId,
          sender: req.user.id,
          type: 'event_update',
          title: 'Transferencia bancaria no aprobada',
          message: `El organizador de "${order.eventId?.title || 'tu evento'}" no pudo validar tu transferencia: ${order.bankTransferProof.rejectionReason}. Por favor revisa tu comprobante.`,
          data: { orderId: order._id, eventId: order.eventId?._id || order.eventId },
          actionUrl: `/checkout/${order.eventId?._id || order.eventId}`,
          priority: 'high'
        });
      } catch (notifErr) {
        logger.warn('Failed to send rejection notification: ' + notifErr.message);
      }

      return res.json({ success: true, message: 'Transferencia rechazada', data: order });
    }
  } catch (error) {
    logger.error('Verify bank transfer error:', error);
    res.status(500).json({ success: false, message: 'Error al verificar la transferencia' });
  }
});

// @route   GET /api/payments/organizer/pending-transfers
// @desc    Obtener transferencias pendientes de verificación para eventos del organizador
router.get('/organizer/pending-transfers', protect, async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user.id }).select('_id');
    const eventIds = events.map(e => e._id);

    const pendingOrders = await Order.find({
      eventId: { $in: eventIds },
      'bankTransferProof.status': 'pending'
    })
      .populate('userId', 'firstName lastName email username')
      .populate('eventId', 'title date location.address')
      .sort({ 'bankTransferProof.uploadedAt': -1 });

    res.json({
      success: true,
      count: pendingOrders.length,
      data: pendingOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'No se pudieron cargar las transferencias pendientes' });
  }
});

module.exports = router;












