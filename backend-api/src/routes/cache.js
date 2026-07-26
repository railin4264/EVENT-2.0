/**
 * Cache Management Routes for EventConnect 2.0
 * Provides cache administration and monitoring endpoints
 */

const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get cache statistics
// @route   GET /api/cache/stats
// @access  Private (Admin only)
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      message: 'Cache statistics retrieved',
      data: stats
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cache statistics'
    });
  }
});

// @desc    Get cache info
// @route   GET /api/cache/info
// @access  Private (Admin only)
router.get('/info', protect, authorize('admin'), async (req, res) => {
  try {
    const info = await cacheService.getInfo();

    res.json({
      success: true,
      message: 'Cache info retrieved',
      data: info
    });
  } catch (error) {
    logger.error('Error getting cache info:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cache info'
    });
  }
});

// @desc    Get keys by pattern
// @route   GET /api/cache/keys
// @access  Private (Admin only)
router.get('/keys', protect, authorize('admin'), async (req, res) => {
  try {
    const { pattern = '*' } = req.query;
    const keys = await cacheService.getKeysPattern(pattern);

    res.json({
      success: true,
      message: 'Cache keys retrieved',
      data: {
        pattern,
        count: keys.length,
        keys: keys.slice(0, 100) // Limit to first 100 keys
      }
    });
  } catch (error) {
    logger.error('Error getting cache keys:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cache keys'
    });
  }
});

// @desc    Get cache value by key
// @route   GET /api/cache/get/:key
// @access  Private (Admin only)
router.get('/get/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const value = await cacheService.get(key);

    res.json({
      success: true,
      message: 'Cache value retrieved',
      data: {
        key,
        value,
        exists: value !== null
      }
    });
  } catch (error) {
    logger.error('Error getting cache value:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cache value'
    });
  }
});

// @desc    Set cache value
// @route   POST /api/cache/set
// @access  Private (Admin only)
router.post('/set', protect, authorize('admin'), async (req, res) => {
  try {
    const { key, value, ttl } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Key and value are required'
      });
    }

    const result = await cacheService.set(key, value, ttl);

    res.json({
      success: true,
      message: 'Cache value set successfully',
      data: {
        key,
        value,
        ttl,
        result
      }
    });
  } catch (error) {
    logger.error('Error setting cache value:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting cache value'
    });
  }
});

// @desc    Delete cache key
// @route   DELETE /api/cache/delete/:key
// @access  Private (Admin only)
router.delete('/delete/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const result = await cacheService.del(key);

    res.json({
      success: true,
      message: 'Cache key deleted',
      data: {
        key,
        deleted: result
      }
    });
  } catch (error) {
    logger.error('Error deleting cache key:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cache key'
    });
  }
});

// @desc    Delete cache keys by pattern
// @route   DELETE /api/cache/pattern
// @access  Private (Admin only)
router.delete('/pattern', protect, authorize('admin'), async (req, res) => {
  try {
    const { pattern } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'Pattern is required'
      });
    }

    const deletedCount = await cacheService.deletePattern(pattern);

    res.json({
      success: true,
      message: 'Cache keys deleted by pattern',
      data: {
        pattern,
        deletedCount
      }
    });
  } catch (error) {
    logger.error('Error deleting cache pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cache pattern'
    });
  }
});

// @desc    Flush all cache
// @route   DELETE /api/cache/flush
// @access  Private (Admin only)
router.delete('/flush', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await cacheService.flushAll();

    logger.warn(`Cache flushed by admin user: ${req.user.username}`);

    res.json({
      success: true,
      message: 'All cache keys flushed',
      data: {
        flushed: result
      }
    });
  } catch (error) {
    logger.error('Error flushing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error flushing cache'
    });
  }
});

// @desc    Invalidate user cache
// @route   POST /api/cache/invalidate/user/:userId
// @access  Private (Admin only)
router.post('/invalidate/user/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    await cacheService.invalidateUser(userId);

    res.json({
      success: true,
      message: 'User cache invalidated',
      data: { userId }
    });
  } catch (error) {
    logger.error('Error invalidating user cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error invalidating user cache'
    });
  }
});

// @desc    Invalidate event cache
// @route   POST /api/cache/invalidate/event/:eventId
// @access  Private (Admin only)
router.post('/invalidate/event/:eventId', protect, authorize('admin'), async (req, res) => {
  try {
    const { eventId } = req.params;
    await cacheService.invalidateEvent(eventId);

    res.json({
      success: true,
      message: 'Event cache invalidated',
      data: { eventId }
    });
  } catch (error) {
    logger.error('Error invalidating event cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error invalidating event cache'
    });
  }
});

// @desc    Invalidate tribe cache
// @route   POST /api/cache/invalidate/tribe/:tribeId
// @access  Private (Admin only)
router.post('/invalidate/tribe/:tribeId', protect, authorize('admin'), async (req, res) => {
  try {
    const { tribeId } = req.params;
    await cacheService.invalidateTribe(tribeId);

    res.json({
      success: true,
      message: 'Tribe cache invalidated',
      data: { tribeId }
    });
  } catch (error) {
    logger.error('Error invalidating tribe cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error invalidating tribe cache'
    });
  }
});

// @desc    Warm cache for popular content
// @route   POST /api/cache/warm
// @access  Private (Admin only)
router.post('/warm', protect, authorize('admin'), async (req, res) => {
  try {
    const { type, limit = 10 } = req.body;

    let warmedCount = 0;

    switch (type) {
    case 'events': {
      // Warm cache for popular events
      const Event = require('../models/Event');
      const popularEvents = await Event.find({ status: 'published' })
        .sort({ attendeeCount: -1 })
        .limit(limit);

      for (const event of popularEvents) {
        await cacheService.cacheEvent(event._id, event.toObject());
        warmedCount++;
      }
      break;
    }

    case 'tribes': {
      // Warm cache for popular tribes
      const Tribe = require('../models/Tribe');
      const popularTribes = await Tribe.find({ isActive: true })
        .sort({ 'stats.memberCount': -1 })
        .limit(limit);

      for (const tribe of popularTribes) {
        await cacheService.cacheTribe(tribe._id, tribe.toObject());
        warmedCount++;
      }
      break;
    }

    case 'users': {
      // Warm cache for active users
      const User = require('../models/User');
      const activeUsers = await User.find({ isActive: true })
        .sort({ lastLogin: -1 })
        .limit(limit);

      for (const user of activeUsers) {
        await cacheService.cacheUser(user._id, user.toObject());
        warmedCount++;
      }
      break;
    }

    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid cache warming type. Use: events, tribes, or users'
      });
    }

    res.json({
      success: true,
      message: `Cache warmed for ${type}`,
      data: {
        type,
        warmedCount,
        limit
      }
    });
  } catch (error) {
    logger.error('Error warming cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error warming cache'
    });
  }
});

// @desc    Health check for cache service
// @route   GET /api/cache/health
// @access  Private (Admin only)
router.get('/health', protect, authorize('admin'), async (req, res) => {
  try {
    const isConnected = cacheService.isConnected;
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      message: 'Cache health check',
      data: {
        status: isConnected ? 'healthy' : 'unhealthy',
        connected: isConnected,
        stats
      }
    });
  } catch (error) {
    logger.error('Error checking cache health:', error);
    res.status(500).json({
      success: false,
      message: 'Cache health check failed',
      data: {
        status: 'unhealthy',
        connected: false,
        error: error.message
      }
    });
  }
});

module.exports = router;