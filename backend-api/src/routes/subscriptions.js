const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const stripeConfig = require('../config/stripe');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get user's current subscription
// @route   GET /api/subscriptions/current
// @access  Private
router.get('/current', protect, async (req, res) => {
  try {
    const subscription = await Subscription.getActiveSubscription(req.user._id);

    if (!subscription) {
      // Return default free plan
      return res.json({
        success: true,
        subscription: {
          plan: 'free',
          status: 'active',
          features: Subscription.getPlanLimits('free')
        }
      });
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription'
    });
  }
});

// @desc    Get all available plans
// @route   GET /api/subscriptions/plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = ['free', 'basic', 'premium', 'enterprise'].map(plan => ({
      name: plan,
      ...Subscription.getPlanLimits(plan)
    }));

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve plans'
    });
  }
});

// @desc    Create subscription
// @route   POST /api/subscriptions
// @access  Private
router.post('/', [
  protect,
  body('plan').isIn(['basic', 'premium', 'enterprise']).withMessage('Invalid plan'),
  body('billingPeriod').optional().isIn(['monthly', 'yearly']).withMessage('Invalid billing period')
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

    if (!stripeConfig.isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment system not configured'
      });
    }

    const { plan, billingPeriod = 'monthly' } = req.body;

    // Check if user already has active subscription
    const existingSubscription = await Subscription.getActiveSubscription(req.user._id);
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription'
      });
    }

    // Get plan details
    const planDetails = Subscription.getPlanLimits(plan);
    const price = billingPeriod === 'yearly' ? planDetails.price * 10 : planDetails.price; // 2 months free on yearly

    // Create or get Stripe customer
    let customerId;
    const existingCustomer = await Subscription.findOne({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    if (existingCustomer?.stripeCustomerId) {
      customerId = existingCustomer.stripeCustomerId;
    } else {
      const customerResult = await stripeConfig.createCustomer(
        req.user.email,
        `${req.user.firstName} ${req.user.lastName}`,
        { userId: req.user._id.toString() }
      );

      if (!customerResult.success) {
        throw new Error('Failed to create Stripe customer');
      }

      customerId = customerResult.customer.id;
    }

    // Create subscription
    const subscription = new Subscription({
      userId: req.user._id,
      plan,
      billingPeriod,
      price,
      features: planDetails,
      stripeCustomerId: customerId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      status: 'pending'
    });

    // Create payment intent
    const paymentIntent = await stripeConfig.createPaymentIntent(
      price,
      'usd',
      {
        subscriptionId: subscription._id.toString(),
        plan,
        billingPeriod
      }
    );

    if (!paymentIntent.success) {
      throw new Error('Failed to create payment intent');
    }

    await subscription.save();

    res.status(201).json({
      success: true,
      subscription,
      clientSecret: paymentIntent.paymentIntent.clientSecret
    });
  } catch (error) {
    logger.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription'
    });
  }
});

// @desc    Cancel subscription
// @route   DELETE /api/subscriptions/current
// @access  Private
router.delete('/current', protect, async (req, res) => {
  try {
    const subscription = await Subscription.getActiveSubscription(req.user._id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of billing period',
      subscription
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});

// @desc    Get subscription usage stats
// @route   GET /api/subscriptions/usage
// @access  Private
router.get('/usage', protect, async (req, res) => {
  try {
    const Event = require('../models/Event');

    const subscription = await Subscription.getActiveSubscription(req.user._id);
    const planLimits = subscription
      ? subscription.features
      : Subscription.getPlanLimits('free');

    // Get current month's events
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const eventsThisMonth = await Event.countDocuments({
      createdBy: req.user._id,
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      success: true,
      usage: {
        eventsThisMonth,
        maxEventsPerMonth: planLimits.maxEventsPerMonth,
        remainingEvents: planLimits.maxEventsPerMonth === -1
          ? -1
          : Math.max(0, planLimits.maxEventsPerMonth - eventsThisMonth)
      },
      limits: planLimits
    });
  } catch (error) {
    logger.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage stats'
    });
  }
});

module.exports = router;
