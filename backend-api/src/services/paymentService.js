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

      // Validate and process items
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        const ticket = await Ticket.findById(item.ticketId);
        if (!ticket) {
          throw new Error(`Ticket not found: ${item.ticketId}`);
        }

        if (!ticket.canPurchase(item.quantity)) {
          throw new Error(`Cannot purchase ${item.quantity} tickets of type ${ticket.name}`);
        }

        const itemTotal = ticket.price * item.quantity;
        orderItems.push({
          ticketId: ticket._id,
          quantity: item.quantity,
          unitPrice: ticket.price,
          totalPrice: itemTotal
        });

        subtotal += itemTotal;

        // Reserve tickets temporarily
        await ticket.reserveTickets(item.quantity);
      }

      // Create order
      const order = new Order({
        userId,
        eventId,
        customerInfo: customerInfo || {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone
        },
        items: orderItems,
        subtotal,
        currency: 'usd'
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

      logger.info(`Order created: ${order.orderNumber} for user ${userId}`);

      return {
        success: true,
        order: await Order.findById(order._id)
          .populate('eventId', 'title date location')
          .populate('items.ticketId', 'name type')
      };
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   */
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

      // Verify payment with Stripe
      if (this.isConfigured && paymentIntentId) {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
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

      return { success: false, error: 'Payment system not configured' };
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

      if (!order.canCancel()) {
        throw new Error('Order cannot be canceled');
      }

      // Release reserved tickets
      for (const item of order.items) {
        const ticket = await Ticket.findById(item.ticketId._id);
        if (ticket) {
          ticket.sold = Math.max(0, ticket.sold - item.quantity);
          await ticket.save();
        }
      }

      // Cancel Stripe payment intent if exists
      if (this.isConfigured && order.stripePaymentIntentId && order.paymentStatus === 'pending') {
        try {
          await this.stripe.paymentIntents.cancel(order.stripePaymentIntentId);
        } catch (stripeError) {
          logger.warn('Could not cancel Stripe payment intent:', stripeError.message);
        }
      }

      await order.cancel(reason);

      logger.info(`Order canceled: ${order.orderNumber} - ${reason}`);

      return {
        success: true,
        order
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

      if (!order.canRefund()) {
        throw new Error('Order cannot be refunded');
      }

      if (!this.isConfigured) {
        throw new Error('Payment system not configured');
      }

      const refundAmount = amount || order.total;

      // Process refund with Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          orderId: order._id.toString(),
          reason: reason
        }
      });

      if (refund.status === 'succeeded') {
        order.paymentStatus = 'refunded';
        order.status = 'refunded';
        order.refundedAt = new Date();
        if (reason) {
          order.notes = (order.notes || '') + `\nRefunded: ${reason}`;
        }
        await order.save();

        // Release tickets back to inventory
        for (const item of order.items) {
          const ticket = await Ticket.findById(item.ticketId);
          if (ticket) {
            ticket.sold = Math.max(0, ticket.sold - item.quantity);
            await ticket.save();
          }
        }

        logger.info(`Refund processed for order: ${order.orderNumber} - Amount: $${refundAmount}`);

        return {
          success: true,
          refund: {
            id: refund.id,
            amount: refundAmount,
            status: refund.status
          },
          order
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
  async cleanupExpiredOrders() {
    try {
      const expiredOrders = await Order.find({
        status: 'pending_payment',
        expiresAt: { $lt: new Date() }
      }).populate('items.ticketId');

      let cleanedCount = 0;

      for (const order of expiredOrders) {
        // Release reserved tickets
        for (const item of order.items) {
          const ticket = await Ticket.findById(item.ticketId._id);
          if (ticket) {
            ticket.sold = Math.max(0, ticket.sold - item.quantity);
            await ticket.save();
          }
        }

        // Cancel the order
        await order.cancel('Order expired');
        cleanedCount++;
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
        eventId: eventId,
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
            totalTickets: { $sum: '$totalQuantity' },
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