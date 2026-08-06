const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Order = require('../models/Order');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateOrderCreation = [
  body('eventId').isMongoId().withMessage('Valid event ID required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.ticketId').isMongoId().withMessage('Valid ticket ID required'),
  body('items.*.quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
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
    res.status(500).json({
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
  body('currency').optional().isIn(['usd', 'eur', 'gbp', 'mxn']).withMessage('Invalid currency')
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
      event = paymentService.stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Handle the event
    switch (event.type) {
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

module.exports = router;












