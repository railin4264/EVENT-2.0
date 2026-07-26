const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protect: authMiddleware } = require('../middleware/auth');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array(),
    });
  }
  next();
};

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('unreadOnly').optional().isBoolean().withMessage('UnreadOnly must be a boolean'),
    query('type').optional().isIn(['follow', 'follow_request', 'event_invite', 'event_reminder', 'event_update', 'comment', 'like', 'tribe_invite', 'system', 'welcome']).withMessage('Invalid notification type'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      const type = req.query.type;

      // Build query
      const query = { recipient: req.user.id };
      if (unreadOnly) query.read = false;
      if (type) query.type = type;

      const skip = (page - 1) * limit;
      
      const notifications = await Notification.find(query)
        .populate('sender', 'firstName lastName username avatar verified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const unreadCount = await Notification.countDocuments({ 
        recipient: req.user.id, 
        read: false 
      });

      const totalCount = await Notification.countDocuments({ 
        recipient: req.user.id 
      });

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
          totalCount,
          pagination: {
            page,
            limit,
            hasMore: notifications.length === limit
          }
        }
      });
    } catch (error) {
      logger.error('GET', '/api/notifications', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las notificaciones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count',
  authMiddleware,
  async (req, res) => {
    try {
      const unreadCount = await Notification.getUnreadCount(req.user.id);
      
      logger.info('GET', '/api/notifications/unread-count', req.user.id);
      res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (error) {
      logger.error('GET', '/api/notifications/unread-count', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el contador de notificaciones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.post('/:notificationId/read',
  authMiddleware,
  [
    param('notificationId').isMongoId().withMessage('ID de notificación inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: req.user.id
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
          const unreadCount = await Notification.getUnreadCount(req.user.id);
          io.to(`user:${req.user.id}`).emit('notification:unread_count', { unreadCount });
        }
      }

      logger.info(`User ${req.user.id} marked notification ${notificationId} as read`);

      res.json({
        success: true,
        message: 'Notificación marcada como leída',
        data: { notification }
      });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al marcar notificación como leída',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.post('/mark-all-read',
  authMiddleware,
  async (req, res) => {
    try {
      const result = await Notification.markAllAsRead(req.user.id);

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${req.user.id}`).emit('notification:unread_count', { unreadCount: 0 });
        io.to(`user:${req.user.id}`).emit('notification:mark_all_read');
      }

      logger.info(`User ${req.user.id} marked all notifications as read. Count: ${result.modifiedCount}`);
      res.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
        data: { modifiedCount: result.modifiedCount },
      });
    } catch (error) {
      logger.error('PUT', '/api/notifications/read-all', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al marcar todas las notificaciones como leídas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('ID de notificación inválido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipient: req.user.id,
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada',
        });
      }

      // Emit real-time update
      req.app.get('io').to(`user_${req.user.id}`).emit('notificationDeleted', {
        notificationId: notification._id,
        userId: req.user.id,
      });

      logger.info('DELETE', `/api/notifications/${req.params.id}`, req.user.id);
      res.json({
        success: true,
        message: 'Notificación eliminada',
      });
    } catch (error) {
      logger.error('DELETE', `/api/notifications/${req.params.id}`, error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la notificación',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all read notifications
// @access  Private
router.delete('/clear-all',
  authMiddleware,
  async (req, res) => {
    try {
      const result = await Notification.deleteMany({
        recipient: req.user.id,
        isRead: true,
      });

      // Emit real-time update
      req.app.get('io').to(`user_${req.user.id}`).emit('notificationsCleared', {
        userId: req.user.id,
        deletedCount: result.deletedCount,
      });

      logger.info('DELETE', '/api/notifications/clear-all', req.user.id);
      res.json({
        success: true,
        message: 'Notificaciones leídas eliminadas',
        data: { deletedCount: result.deletedCount },
      });
    } catch (error) {
      logger.error('DELETE', '/api/notifications/clear-all', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar las notificaciones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   POST /api/notifications/test
// @desc    Create test notifications (development only)
// @access  Private
router.post('/test',
  authMiddleware,
  async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Test endpoint not available in production'
        });
      }

      // Create various test notifications
      const testNotifications = [
        {
          recipient: req.user.id,
          type: 'welcome',
          title: '¡Bienvenido a EventConnect!',
          message: 'Descubre eventos increíbles y conecta con personas de intereses similares',
          data: { isWelcome: true },
          actionUrl: '/discovery',
          priority: 'medium'
        },
        {
          recipient: req.user.id,
          type: 'system',
          title: 'Nueva función disponible',
          message: 'Ahora puedes crear eventos privados y gestionar invitaciones',
          data: { feature: 'private_events' },
          actionUrl: '/events/create',
          priority: 'low'
        },
        {
          recipient: req.user.id,
          type: 'event_reminder',
          title: 'Recordatorio de evento',
          message: 'Tu evento "Meetup de Tecnología" comienza en 1 hora',
          data: { eventId: '507f1f77bcf86cd799439011', reminderType: '1hour' },
          actionUrl: '/events/507f1f77bcf86cd799439011',
          priority: 'high'
        }
      ];

      const createdNotifications = [];
      for (const notificationData of testNotifications) {
        const notification = await Notification.createNotification(notificationData);
        if (notification) {
          createdNotifications.push(notification);
        }
      }

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        const unreadCount = await Notification.getUnreadCount(req.user.id);
        io.to(`user:${req.user.id}`).emit('notification:unread_count', { unreadCount });
        
        for (const notification of createdNotifications) {
          io.to(`user:${req.user.id}`).emit('notification:new', { notification });
        }
      }

      logger.info(`Created ${createdNotifications.length} test notifications for user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Notificaciones de prueba creadas',
        data: { notifications: createdNotifications }
      });
    } catch (error) {
      logger.error('Create test notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear notificaciones de prueba',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private
router.get('/stats',
  authMiddleware,
  async (req, res) => {
    try {
      const [
        totalCount,
        unreadCount,
        typeCounts,
        categoryCounts,
      ] = await Promise.all([
        Notification.countDocuments({ recipient: req.user.id }),
        Notification.countDocuments({ recipient: req.user.id, isRead: false }),
        Notification.aggregate([
          { $match: { recipient: req.user.id } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        Notification.aggregate([
          { $match: { recipient: req.user.id } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
      ]);

      const stats = {
        total: totalCount,
        unread: unreadCount,
        read: totalCount - unreadCount,
        byType: typeCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCategory: categoryCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      };

      logger.info('GET', '/api/notifications/stats', req.user.id);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('GET', '/api/notifications/stats', error, req.user.id);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas de notificaciones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    // Return default preferences for now
    const preferences = {
      email: {
        events: true,
        messages: true,
        tribes: true,
        achievements: true,
        system: true
      },
      push: {
        events: true,
        messages: true,
        tribes: true,
        achievements: true,
        system: false
      },
      inApp: {
        events: true,
        messages: true,
        tribes: true,
        achievements: true,
        system: true
      }
    };

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences'
    });
  }
});

// @route   PUT /api/notifications/preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    // For now, just return success
    // In the future, this would save to user preferences
    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences'
    });
  }
});

module.exports = router;

