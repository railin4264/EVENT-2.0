const stripeConfig = require('../config/stripe');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.stripe = stripeConfig.stripe;
    this.isConfigured = stripeConfig.isConfigured;
  }

  /**
   * Create a new order
   */
  async createOrder(userId, eventId, items, customerInfo) {
    const reservations = [];
    let createdIntentId;
    let saved = false;
    try {
      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate event
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      if (event.status === 'cancelled' || event.status === 'canceled' || new Date(event.date) <= new Date()) {
        throw new Error('Event is not available for booking');
      }
      if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw new Error('Invalid order items');
      const combinedItems = new Map();
      for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('Invalid ticket quantity');
        const key = String(item.ticketId);
        combinedItems.set(key, { ticketId: key, quantity: (combinedItems.get(key)?.quantity || 0) + item.quantity });
      }

      // Validate and process items
      const orderItems = [];
      let subtotal = 0;

      let currency;
      for (const item of combinedItems.values()) {
        const ticket = await Ticket.findById(item.ticketId);
        if (!ticket) {
          throw new Error(`Ticket not found: ${item.ticketId}`);
        }
        if (String(ticket.eventId) !== String(eventId)) throw new Error('Ticket does not belong to this event');
        if (currency && currency !== ticket.currency) throw new Error('Tickets must use the same currency');
        currency = ticket.currency;
        if (ticket.price > 0 && !this.isConfigured) {
          const error = new Error('Payment system not configured');
          error.statusCode = 503;
          throw error;
        }

        if (!ticket.canPurchase(item.quantity)) {
          throw new Error(`Cannot purchase ${item.quantity} tickets of type ${ticket.name}`);
        }

        const itemTotal = Math.round(ticket.price * item.quantity * 100) / 100;
        orderItems.push({
          ticketId: ticket._id,
          quantity: item.quantity,
          unitPrice: ticket.price,
          totalPrice: itemTotal
        });

        subtotal += itemTotal;

        // Reserve tickets temporarily
        await ticket.reserveTickets(item.quantity);
        reservations.push({ ticketId: ticket._id, quantity: item.quantity });
      }

      // Create order
      const order = new Order({
        userId,
        eventId,
        customerInfo: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          ...customerInfo
        },
        items: orderItems,
        subtotal,
        currency
      });

      // Calculate total with fees
      order.calculateTotal();

      // Create Stripe payment intent if order total > 0
      if (order.total > 0 && this.isConfigured) {
        const paymentIntent = await this.createPaymentIntent(
          order.total,
          order.currency,
          {
            orderId: order._id.toString(),
            eventId: eventId.toString(),
            userId: userId.toString()
          }
        );

        if (paymentIntent.success) {
          order.stripePaymentIntentId = paymentIntent.paymentIntent.id;
          createdIntentId = paymentIntent.paymentIntent.id;
          order.stripeClientSecret = paymentIntent.paymentIntent.clientSecret;
          order.status = 'pending_payment';
        } else {
          throw new Error('Failed to create payment intent');
        }
      } else if (order.total === 0) {
        // Free order
        order.paymentMethod = 'free';
        order.paymentStatus = 'succeeded';
        order.status = 'confirmed';
        order.paidAt = new Date();
      }

      await order.save();
      saved = true;

      logger.info(`Order created: ${order.orderNumber} for user ${userId}`);

      return {
        success: true,
        order: await Order.findById(order._id)
          .populate('eventId', 'title date location')
          .populate('items.ticketId', 'name type')
      };
    } catch (error) {
      if (!saved) {
        await Promise.all(reservations.map(item => Ticket.releaseTickets(item.ticketId, item.quantity)));
        if (createdIntentId) {
          await this.stripe.paymentIntents.cancel(createdIntentId).catch(() => logger.error('Failed to cancel payment intent after order creation failure'));
        }
      }
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   */
  async createCheckoutSession(orderId, userId) {
    if (!this.isConfigured) throw Object.assign(new Error('Payment system not configured'), { statusCode: 503 });
    const order = await Order.findOne({ _id: orderId, userId }).populate('eventId', 'title');
    if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    if (order.status !== 'pending_payment' || order.total <= 0 || order.isExpired()) {
      throw Object.assign(new Error('Order is not available for checkout'), { statusCode: 409 });
    }
    if (order.stripeCheckoutSessionId) {
      const existing = await this.stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
      if (existing.status === 'open') return { url: existing.url, sessionId: existing.id };
      throw Object.assign(new Error('Checkout is already completed or expired'), { statusCode: 409 });
    }
    const configuredUrl = process.env.APP_URL || process.env.FRONTEND_URL || process.env.WEB_URL;
    if (!configuredUrl && process.env.NODE_ENV === 'production') throw new Error('APP_URL is required for checkout');
    const appUrl = new URL(configuredUrl || 'http://localhost:3000').origin;
    // A hosted checkout owns payment creation; invalidate the embedded intent first.
    if (order.stripePaymentIntentId) {
      await this.stripe.paymentIntents.cancel(order.stripePaymentIntentId, {}, {
        idempotencyKey: `order-checkout-cancel-${order._id}`
      });
    }
    const metadata = { orderId: String(order._id), userId: String(userId), eventId: String(order.eventId._id) };
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment', customer_email: order.customerInfo.email,
      client_reference_id: String(order._id), metadata,
      payment_intent_data: { metadata },
      line_items: [{ quantity: 1, price_data: { currency: order.currency, unit_amount: Math.round(order.total * 100),
        product_data: { name: `${order.eventId.title} — ${order.totalQuantity} entradas (cargos incluidos)` } } }],
      success_url: `${appUrl}/tickets?order=${order._id}&checkout=success`,
      cancel_url: `${appUrl}/events/${order.eventId._id}?checkout=canceled`
      // Use Stripe's default expiration so retries have identical parameters.
      // Persist the returned expiration as the reservation's lifetime below.
    }, { idempotencyKey: `order-checkout-${order._id}` });
    order.stripePaymentIntentId = undefined;
    order.stripeClientSecret = undefined;
    order.stripeCheckoutSessionId = session.id;
    order.expiresAt = new Date(session.expires_at * 1000);
    await order.save();
    return { url: session.url, sessionId: session.id };
  }

  async confirmCheckout(session) {
    if (session.payment_status !== 'paid') return;
    const order = await Order.findOne({ stripeCheckoutSessionId: session.id });
    if (!order) throw new Error('Checkout order not found');
    if (order.paymentStatus === 'succeeded') return;
    if (order.status !== 'pending_payment' || session.amount_total !== Math.round(order.total * 100) ||
        session.currency !== order.currency || session.metadata?.orderId !== String(order._id)) {
      throw new Error('Checkout does not match order');
    }
    order.stripePaymentIntentId = session.payment_intent;
    await order.markAsPaid();
  }

  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!this.isConfigured) {
      return { success: false, error: 'Payment system not configured' };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        }
      };
    } catch (error) {
      logger.error('Stripe payment intent error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm payment and complete order
   */
  async confirmPayment(orderId, paymentIntentId) {
    try {
      const order = await Order.findById(orderId)
        .populate('items.ticketId');

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.stripePaymentIntentId !== paymentIntentId) {
        throw new Error('Payment intent mismatch');
      }
      if (order.paymentStatus === 'succeeded') return { success: true, order };
      if (order.status !== 'pending_payment') throw new Error('Order is not awaiting payment');

      // Verify payment with Stripe
      if (this.isConfigured && paymentIntentId) {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
          if (paymentIntent.amount !== Math.round(order.total * 100) || paymentIntent.currency !== order.currency || paymentIntent.metadata?.orderId !== String(order._id)) {
            throw new Error('Payment amount, currency or order mismatch');
          }
          await order.markAsPaid();

          // Update ticket sales count (permanent)
          for (const item of order.items) {
            // Tickets were already reserved in createOrder, so this is just confirmation
            logger.info(`Confirmed sale of ${item.quantity} tickets for ${item.ticketId._id}`);
          }

          logger.info(`Payment confirmed for order: ${order.orderNumber}`);

          return {
            success: true,
            order: await Order.findById(order._id)
              .populate('eventId', 'title date location')
              .populate('items.ticketId', 'name type')
          };
        } else {
          throw new Error(`Payment not successful: ${paymentIntent.status}`);
        }
      }

      throw Object.assign(new Error('Payment system not configured'), { statusCode: 503 });
    } catch (error) {
      logger.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Cancel order and release tickets
   */
  async cancelOrder(orderId, reason = 'User canceled') {
    try {
      const order = await Order.findById(orderId)
        .populate('items.ticketId');

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'canceled' && order.inventoryReleaseRequestedAt) {
        await this.releaseOrderInventory(order);
        return { success: true, order: await Order.findById(orderId) };
      }

      if (!order.canCancel()) {
        throw new Error('Order cannot be canceled');
      }

      // Cancel Stripe payment intent if exists
      if (this.isConfigured && order.stripePaymentIntentId && order.paymentStatus === 'pending') {
        await this.stripe.paymentIntents.cancel(order.stripePaymentIntentId);
      }
      if (this.isConfigured && order.stripeCheckoutSessionId) {
        const session = await this.stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
        if (session.status === 'complete') throw new Error('Paid checkout cannot be canceled; request a refund');
        if (session.status === 'open') await this.stripe.checkout.sessions.expire(session.id);
      }
      const canceled = await Order.findOneAndUpdate({ _id: order._id, status: order.status, paymentStatus: order.paymentStatus },
        { $set: { status: 'canceled', paymentStatus: 'canceled', canceledAt: new Date(),
          inventoryReleaseRequestedAt: new Date(), notes: String(reason).slice(0, 1000) } }, { new: true });
      if (!canceled) throw new Error('Order was already updated');
      await this.releaseOrderInventory(canceled);

      logger.info(`Order canceled: ${order.orderNumber} - ${reason}`);

      return {
        success: true,
        order: await Order.findById(orderId)
      };
    } catch (error) {
      logger.error('Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId, amount = null, reason = '') {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'refunded' && order.inventoryReleaseRequestedAt) {
        if (amount != null && Number(amount) !== order.total) throw new Error('Only a full order refund is supported');
        await this.releaseOrderInventory(order);
        return { success: true, refund: { id: order.stripeRefundId, amount: order.total, status: 'succeeded' },
          order: await Order.findById(orderId) };
      }

      if (!order.canRefund()) {
        throw new Error('Order cannot be refunded');
      }

      if (!this.isConfigured) {
        throw new Error('Payment system not configured');
      }

      const refundAmount = amount == null ? order.total : Number(amount);
      if (!Number.isFinite(refundAmount) || refundAmount !== order.total) throw new Error('Only a full order refund is supported');

      // Process refund with Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          orderId: order._id.toString()
        }
      }, { idempotencyKey: `order-refund-${order._id}` });

      if (refund.status === 'succeeded') {
        // Stripe idempotency prevents duplicate charges, but inventory also
        // needs a database claim: only one concurrent request releases it.
        const claimedOrder = await Order.findOneAndUpdate({
          _id: order._id, paymentStatus: 'succeeded', status: { $in: ['confirmed', 'completed'] }
        }, { $set: {
          paymentStatus: 'refunded', status: 'refunded', refundedAt: new Date(),
          stripeRefundId: refund.id, inventoryReleaseRequestedAt: new Date(),
          notes: reason ? `${order.notes || ''}\nRefunded: ${reason}` : order.notes
        } }, { new: true });

        const refundedOrder = claimedOrder || await Order.findById(order._id);
        await this.releaseOrderInventory(refundedOrder);

        logger.info(`Refund processed for order: ${order.orderNumber} - Amount: $${refundAmount}`);

        return {
          success: true,
          refund: {
            id: refund.id,
            amount: refundAmount,
            status: refund.status
          },
          order: await Order.findById(order._id)
        };
      } else {
        throw new Error(`Refund failed: ${refund.status}`);
      }
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('userId', 'firstName lastName email')
        .populate('eventId', 'title date location images')
        .populate('items.ticketId', 'name type price');

      if (!order) {
        throw new Error('Order not found');
      }

      return { success: true, order };
    } catch (error) {
      logger.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId, status = null) {
    try {
      const orders = await Order.findUserOrders(userId, status);
      return { success: true, orders };
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Get event orders (for organizers)
   */
  async getEventOrders(eventId, status = null) {
    try {
      const orders = await Order.findEventOrders(eventId, status);
      return { success: true, orders };
    } catch (error) {
      logger.error('Error getting event orders:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired orders
   */
  async releaseOrderInventory(order) {
    if (!order.inventoryReleaseRequestedAt || order.inventoryReleasedAt ||
        !['canceled', 'refunded'].includes(order.status)) return;
    // Merge historical duplicate lines before assigning one receipt per ticket.
    const quantities = new Map();
    for (const item of order.items) {
      const ticketId = String(item.ticketId._id || item.ticketId);
      quantities.set(ticketId, (quantities.get(ticketId) || 0) + item.quantity);
    }
    for (const [ticketId, quantity] of quantities) {
      await Ticket.releaseOrderTickets(ticketId, quantity, order._id);
    }
    await Order.updateOne({ _id: order._id, inventoryReleasedAt: { $exists: false } },
      { $set: { inventoryReleasedAt: new Date() } });
  }

  async recoverInventoryReleases() {
    // Only orders explicitly enrolled by the new cancellation/refund flow are
    // eligible. Old canceled orders may already have released their stock.
    const pending = Order.find({
      status: { $in: ['canceled', 'refunded'] },
      inventoryReleaseRequestedAt: { $exists: true }, inventoryReleasedAt: { $exists: false }
    }).sort({ inventoryReleaseRequestedAt: 1 }).cursor();
    let recoveredCount = 0;
    let failedCount = 0;
    for await (const order of pending) {
      try {
        await this.releaseOrderInventory(order);
        recoveredCount++;
      } catch (error) {
        failedCount++;
        logger.error(`Inventory recovery failed for order ${order._id}: ${error.message}`);
      }
    }
    return { recoveredCount, failedCount };
  }

  async cleanupExpiredOrders() {
    try {
      const expiredOrders = await Order.find({
        status: 'pending_payment',
        expiresAt: { $lt: new Date() }
      }).populate('items.ticketId');

      let cleanedCount = 0;

      for (const order of expiredOrders) {
        try {
          await this.cancelOrder(order._id, 'Order expired');
          cleanedCount++;
        } catch (error) {
          logger.warn(`Could not expire order ${order._id}: ${error.message}`);
        }
      }

      logger.info(`Cleaned up ${cleanedCount} expired orders`);
      return { success: true, cleanedCount };
    } catch (error) {
      logger.error('Error cleaning up expired orders:', error);
      throw error;
    }
  }

  /**
   * Generate sales report
   */
  async generateSalesReport(eventId, startDate, endDate) {
    try {
      const matchStage = {
        eventId: new (require('mongoose').Types.ObjectId)(eventId),
        status: 'confirmed',
        paymentStatus: 'succeeded'
      };

      if (startDate && endDate) {
        matchStage.paidAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const report = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            totalTickets: { $sum: { $sum: '$items.quantity' } },
            averageOrderValue: { $avg: '$total' }
          }
        }
      ]);

      const ticketBreakdown = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'tickets',
            localField: 'items.ticketId',
            foreignField: '_id',
            as: 'ticketInfo'
          }
        },
        { $unwind: '$ticketInfo' },
        {
          $group: {
            _id: '$ticketInfo.name',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' }
          }
        }
      ]);

      return {
        success: true,
        report: {
          summary: report[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            totalTickets: 0,
            averageOrderValue: 0
          },
          ticketBreakdown
        }
      };
    } catch (error) {
      logger.error('Error generating sales report:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
