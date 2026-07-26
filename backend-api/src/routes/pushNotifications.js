const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const firebaseService = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Register push token
// @route   POST /api/push/register
// @access  Private
router.post('/register', [
  protect,
  body('token').notEmpty().withMessage('Push token is required'),
  body('platform').isIn(['ios', 'android', 'web']).withMessage('Invalid platform')
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

    const { token, platform, deviceId } = req.body;

    // Initialize notification service with socket.io
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    const result = await notificationService.registerPushToken(
      req.user._id,
      token,
      platform,
      deviceId
    );

    res.json({
      success: true,
      message: 'Push token registered successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token'
    });
  }
});

// @desc    Unregister push token
// @route   DELETE /api/push/unregister
// @access  Private
router.delete('/unregister', [
  protect,
  body('token').notEmpty().withMessage('Push token is required')
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

    const { token } = req.body;

    // Initialize notification service with socket.io
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    const result = await notificationService.unregisterPushToken(
      req.user._id,
      token
    );

    res.json({
      success: true,
      message: 'Push token unregistered successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error unregistering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister push token'
    });
  }
});

// @desc    Send test notification
// @route   POST /api/push/test
// @access  Private
router.post('/test', protect, async (req, res) => {
  try {
    const { title = 'Test Notification', message = 'This is a test notification from EventConnect!' } = req.body;

    // Initialize notification service with socket.io
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    const notification = await notificationService.createAndSendNotification({
      recipient: req.user._id,
      type: 'system',
      title,
      message,
      data: { test: true },
      icon: '🧪',
      category: 'system',
      priority: 'normal'
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      data: notification
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

// @desc    Send broadcast notification (admin only)
// @route   POST /api/push/broadcast
// @access  Private (Admin)
router.post('/broadcast', [
  protect,
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    // Check if user is admin
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

    const { title, message, data = {} } = req.body;

    // Initialize notification service with socket.io
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    const result = await notificationService.sendBroadcastNotification(
      title,
      message,
      { ...data, sender: req.user._id }
    );

    res.json({
      success: true,
      message: 'Broadcast notification sent',
      data: result
    });
  } catch (error) {
    logger.error('Error sending broadcast notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification'
    });
  }
});

// @desc    Get push notification stats
// @route   GET /api/push/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const Notification = require('../models/Notification');

    const user = await User.findById(req.user._id);
    const totalNotifications = await Notification.countDocuments({ recipient: req.user._id });
    const unreadCount = await Notification.getUnreadCount(req.user._id);
    const recentNotifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'firstName lastName avatar');

    res.json({
      success: true,
      data: {
        pushTokensCount: user.pushTokens?.length || 0,
        totalNotifications,
        unreadCount,
        recentNotifications,
        firebaseStatus: firebaseService.isInitialized() ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    logger.error('Error getting push stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get push notification stats'
    });
  }
});

// @desc    Update notification settings
// @route   PUT /api/push/settings
// @access  Private
router.put('/settings', [
  protect,
  body('pushEnabled').optional().isBoolean(),
  body('emailEnabled').optional().isBoolean(),
  body('categories').optional().isObject()
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

    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    // Update notification settings
    if (req.body.pushEnabled !== undefined) {
      user.notificationSettings.pushEnabled = req.body.pushEnabled;
    }
    if (req.body.emailEnabled !== undefined) {
      user.notificationSettings.emailEnabled = req.body.emailEnabled;
    }
    if (req.body.categories) {
      user.notificationSettings.categories = {
        ...user.notificationSettings.categories,
        ...req.body.categories
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Notification settings updated',
      data: user.notificationSettings
    });
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings'
    });
  }
});

module.exports = router;