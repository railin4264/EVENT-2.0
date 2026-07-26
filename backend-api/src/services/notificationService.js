const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const firebaseService = require('../config/firebase');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Create and send a notification
   * @param {Object} notificationData - Notification data
   * @param {boolean} sendPush - Whether to send push notification
   * @returns {Promise<Object>} Created notification
   */
  async createAndSendNotification(notificationData, sendPush = true) {
    try {
      // Create notification in database
      const notification = await Notification.createNotification(notificationData);

      // Send real-time notification via Socket.IO
      this.sendRealTimeNotification(notification);

      // Send push notification if enabled
      if (sendPush && this.shouldSendPushNotification(notification)) {
        await this.sendPushNotification(notification);
      }

      logger.info(`Notification created and sent: ${notification._id}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification via Socket.IO
   * @param {Object} notification - Notification document
   */
  sendRealTimeNotification(notification) {
    try {
      if (this.io) {
        // Send to specific user
        this.io.to(`user_${notification.recipient}`).emit('newNotification', {
          notification: notification.toObject(),
          timestamp: new Date(),
        });

        // Update unread count
        this.updateUnreadCount(notification.recipient);
      }
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
    }
  }

  /**
   * Send push notification
   * @param {Object} notification - Notification document
   */
  async sendPushNotification(notification) {
    try {
      // Get user's push tokens
      const user = await User.findById(notification.recipient).select('pushTokens notificationSettings');

      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        logger.info(`No push tokens found for user: ${notification.recipient}`);
        return;
      }

      // Check user's notification preferences
      if (!this.shouldSendBasedOnSettings(notification, user.notificationSettings)) {
        logger.info(`Push notification blocked by user settings: ${notification.recipient}`);
        return;
      }

      // Prepare push notification payload
      const pushPayload = {
        title: notification.title,
        body: notification.message,
        icon: notification.icon,
        data: {
          notificationId: notification._id.toString(),
          type: notification.type,
          category: notification.category,
          actionUrl: notification.actionUrl,
          ...notification.data,
        },
        badge: await Notification.getUnreadCount(notification.recipient),
      };

      // Send actual push notifications via Firebase
      const validTokens = user.pushTokens.filter(token => token && token.token);
      const tokens = validTokens.map(tokenObj => tokenObj.token);

      if (tokens.length === 0) {
        logger.info(`No valid push tokens found for user: ${notification.recipient}`);
        return;
      }

      // Send push notification via Firebase
      const result = await firebaseService.sendToDevices(
        tokens,
        {
          title: pushPayload.title,
          body: pushPayload.body,
          image: pushPayload.icon
        },
        pushPayload.data
      );

      if (result.success) {
        logger.info(`Push notification sent to ${result.successCount} devices for user: ${notification.recipient}`);

        // Remove invalid tokens
        if (result.tokensToRemove && result.tokensToRemove.length > 0) {
          await this.removeInvalidTokens(notification.recipient, result.tokensToRemove);
        }

        // Mark as push sent
        await notification.markPushSent();
      } else {
        logger.error(`Failed to send push notification: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  /**
   * Update unread count for user
   * @param {string} userId - User ID
   */
  async updateUnreadCount(userId) {
    try {
      const unreadCount = await Notification.getUnreadCount(userId);

      if (this.io) {
        this.io.to(`user_${userId}`).emit('unreadCountUpdate', {
          userId,
          unreadCount,
        });
      }
    } catch (error) {
      logger.error('Error updating unread count:', error);
    }
  }

  /**
   * Check if push notification should be sent based on notification type and priority
   * @param {Object} notification - Notification document
   * @returns {boolean} Whether to send push notification
   */
  shouldSendPushNotification(notification) {
    // Always send for high and urgent priority
    if (['high', 'urgent'].includes(notification.priority)) {
      return true;
    }

    // Don't send push for low priority notifications
    if (notification.priority === 'low') {
      return false;
    }

    // Send push for specific types
    const pushTypes = ['message', 'event_invite', 'event_reminder', 'tribe_invite'];
    return pushTypes.includes(notification.type);
  }

  /**
   * Check if notification should be sent based on user settings
   * @param {Object} notification - Notification document
   * @param {Object} settings - User notification settings
   * @returns {boolean} Whether to send notification
   */
  shouldSendBasedOnSettings(notification, settings = {}) {
    // Default to true if no settings
    if (!settings) return true;

    // Check global push setting
    if (settings.pushEnabled === false) {
      return false;
    }

    // Check category-specific settings
    const categorySettings = settings.categories || {};

    // Map notification types/categories to settings structure
    const categoryMap = {
      social: categorySettings.social !== false,
      events: categorySettings.events !== false,
      tribes: categorySettings.social !== false, // tribes mapped to social/general if missing
      system: categorySettings.system !== false,
      achievements: categorySettings.achievements !== false,
    };

    const categoryAllowed = categoryMap[notification.category];
    if (categoryAllowed === false) {
      return false;
    }

    return true;
  }

  /**
   * Create like notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} postId - Post ID
   * @param {string} postTitle - Post title
   */
  async createLikeNotification(recipientId, senderId, postId, postTitle) {
    // Don't send notification if user liked their own post
    if (recipientId === senderId) return;

    return this.createAndSendNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'like',
      title: 'Nueva reacción',
      message: `Le gustó tu publicación${postTitle ? ` "${postTitle}"` : ''}`,
      data: { postId },
      icon: '❤️',
      category: 'social',
      priority: 'normal',
    });
  }

  /**
   * Create comment notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} postId - Post ID
   * @param {string} postTitle - Post title
   * @param {string} commentPreview - Comment preview
   */
  async createCommentNotification(recipientId, senderId, postId, postTitle, commentPreview) {
    // Don't send notification if user commented on their own post
    if (recipientId === senderId) return;

    return this.createAndSendNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'comment',
      title: 'Nuevo comentario',
      message: `Comentó: "${commentPreview || 'Ver comentario'}"`,
      data: { postId },
      icon: '💬',
      category: 'social',
      priority: 'normal',
    });
  }

  /**
   * Create follow notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   */
  async createFollowNotification(recipientId, senderId) {
    return this.createAndSendNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'follow',
      title: 'Nuevo seguidor',
      message: 'Comenzó a seguirte',
      data: { userId: senderId },
      icon: '👤',
      category: 'social',
      priority: 'normal',
    });
  }

  /**
   * Create event invite notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} eventId - Event ID
   * @param {string} eventTitle - Event title
   */
  async createEventInviteNotification(recipientId, senderId, eventId, eventTitle) {
    return this.createAndSendNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'event_invite',
      title: 'Invitación a evento',
      message: `Te invitó al evento "${eventTitle}"`,
      data: { eventId },
      icon: '📅',
      category: 'events',
      priority: 'high',
      actionUrl: `/events/${eventId}`,
    }, true);
  }

  /**
   * Create message notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} chatId - Chat ID
   * @param {string} messagePreview - Message preview
   */
  async createMessageNotification(recipientId, senderId, chatId, messagePreview) {
    return this.createAndSendNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'message',
      title: 'Nuevo mensaje',
      message: messagePreview,
      data: { chatId },
      icon: '💬',
      category: 'social',
      priority: 'high',
      actionUrl: `/chat/${chatId}`,
    }, true);
  }

  /**
   * Create achievement notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} achievementId - Achievement ID
   * @param {string} achievementTitle - Achievement title
   * @param {string} achievementDescription - Achievement description
   */
  async createAchievementNotification(recipientId, achievementId, achievementTitle, achievementDescription) {
    return this.createAndSendNotification({
      recipient: recipientId,
      type: 'achievement',
      title: '¡Nuevo logro desbloqueado!',
      message: `Has desbloqueado "${achievementTitle}"`,
      data: { achievementId, customData: { description: achievementDescription } },
      icon: '🏆',
      category: 'achievements',
      priority: 'normal',
    });
  }

  /**
   * Create event attendee notification (for event creators)
   * @param {string} creatorId - Event creator user ID
   * @param {string} attendeeId - Attendee user ID
   * @param {string} eventId - Event ID
   * @param {string} eventTitle - Event title
   * @param {string} attendeeName - Attendee name
   */
  async createEventAttendeeNotification(creatorId, attendeeId, eventId, eventTitle, attendeeName) {
    // Don't send notification if creator is the attendee
    if (creatorId === attendeeId) return;

    return this.createAndSendNotification({
      recipient: creatorId,
      sender: attendeeId,
      type: 'event_update',
      title: 'Nuevo asistente a tu evento',
      message: `${attendeeName} se unió a "${eventTitle}"`,
      data: { eventId, action: 'attend' },
      icon: '👥',
      category: 'events',
      priority: 'normal',
      actionUrl: `/events/${eventId}`,
    });
  }

  /**
   * Create event leave notification (for event creators)
   * @param {string} creatorId - Event creator user ID
   * @param {string} attendeeId - Attendee user ID
   * @param {string} eventId - Event ID
   * @param {string} eventTitle - Event title
   * @param {string} attendeeName - Attendee name
   */
  async createEventLeaveNotification(creatorId, attendeeId, eventId, eventTitle, attendeeName) {
    // Don't send notification if creator is the attendee
    if (creatorId === attendeeId) return;

    return this.createAndSendNotification({
      recipient: creatorId,
      sender: attendeeId,
      type: 'event_update',
      title: 'Asistente salió de tu evento',
      message: `${attendeeName} ya no asistirá a "${eventTitle}"`,
      data: { eventId, action: 'leave' },
      icon: '👋',
      category: 'events',
      priority: 'low',
      actionUrl: `/events/${eventId}`,
    }, false); // Don't send push for low priority
  }

  /**
   * Create event comment notification (for event creators)
   * @param {string} creatorId - Event creator user ID
   * @param {string} commenterId - Commenter user ID
   * @param {string} eventId - Event ID
   * @param {string} eventTitle - Event title
   * @param {string} commentPreview - Comment preview
   */
  async createEventCommentNotification(creatorId, commenterId, eventId, eventTitle, commentPreview) {
    // Don't send notification if creator commented on their own event
    if (creatorId === commenterId) return;

    return this.createAndSendNotification({
      recipient: creatorId,
      sender: commenterId,
      type: 'comment',
      title: 'Nuevo comentario en tu evento',
      message: `Comentó en "${eventTitle}": "${commentPreview}"`,
      data: { eventId, targetType: 'event' },
      icon: '💬',
      category: 'events',
      priority: 'normal',
      actionUrl: `/events/${eventId}`,
    });
  }

  /**
   * Create event reminder notification (for attendees)
   * @param {string} attendeeId - Attendee user ID
   * @param {string} eventId - Event ID
   * @param {string} eventTitle - Event title
   * @param {string} reminderType - Type of reminder (1hour, 1day, 1week)
   */
  async createEventReminderNotification(attendeeId, eventId, eventTitle, reminderType) {
    const reminderMessages = {
      '1hour': 'Tu evento comienza en 1 hora',
      '1day': 'Tu evento comienza mañana',
      '1week': 'Tu evento comienza en 1 semana'
    };

    return this.createAndSendNotification({
      recipient: attendeeId,
      type: 'event_reminder',
      title: 'Recordatorio de evento',
      message: `${reminderMessages[reminderType] || 'Tu evento está próximo'}: "${eventTitle}"`,
      data: { eventId, reminderType },
      icon: '⏰',
      category: 'events',
      priority: 'high',
      actionUrl: `/events/${eventId}`,
    }, true);
  }

  /**
   * Create event capacity warning notification (for event creators)
   * @param {string} creatorId - Event creator user ID
   * @param {string} eventId - Event ID
   * @param {string} eventTitle - Event title
   * @param {number} remainingSpots - Remaining spots
   * @param {number} maxAttendees - Maximum attendees
   */
  async createEventCapacityWarningNotification(creatorId, eventId, eventTitle, remainingSpots, maxAttendees) {
    const percentFull = ((maxAttendees - remainingSpots) / maxAttendees) * 100;

    // Only send when 80%, 90%, or 100% full
    if (![80, 90, 100].some(threshold => Math.abs(percentFull - threshold) < 5)) {
      return;
    }

    return this.createAndSendNotification({
      recipient: creatorId,
      type: 'event_update',
      title: remainingSpots === 0 ? '¡Evento lleno!' : 'Tu evento está casi lleno',
      message: remainingSpots === 0
        ? `"${eventTitle}" alcanzó su capacidad máxima`
        : `Solo quedan ${remainingSpots} cupos disponibles en "${eventTitle}"`,
      data: { eventId, remainingSpots, maxAttendees },
      icon: remainingSpots === 0 ? '🎉' : '⚠️',
      category: 'events',
      priority: remainingSpots === 0 ? 'high' : 'normal',
      actionUrl: `/events/${eventId}`,
    });
  }

  /**
   * Create tribe invite notification
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {string} tribeId - Tribe ID
   * @param {string} tribeName - Tribe name
   */
  async createTribeInviteNotification(recipientId, senderId, tribeId, tribeName) {
    return this.createAndSendNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'tribe_invite',
      title: 'Invitación a tribu',
      message: `Te invitó a unirte a la tribu "${tribeName}"`,
      data: { tribeId },
      icon: '🏕️',
      category: 'tribes',
      priority: 'high',
      actionUrl: `/tribes/${tribeId}`,
    }, true);
  }

  /**
   * Create system notification
   * @param {string|Array} recipientIds - Recipient user ID(s)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   * @param {string} priority - Notification priority
   */
  async createSystemNotification(recipientIds, title, message, data = {}, priority = 'normal') {
    const recipients = Array.isArray(recipientIds) ? recipientIds : [recipientIds];

    const notifications = await Promise.all(
      recipients.map(recipientId =>
        this.createAndSendNotification({
          recipient: recipientId,
          type: 'system',
          title,
          message,
          data: { customData: data },
          icon: '🔔',
          category: 'system',
          priority,
        })
      )
    );

    return notifications;
  }

  /**
   * Create bulk notifications
   * @param {Array} notificationsData - Array of notification data
   */
  async createBulkNotifications(notificationsData) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notifications = await Promise.all(
      notificationsData.map(data =>
        this.createAndSendNotification({
          ...data,
          batchId,
        })
      )
    );

    logger.info(`Bulk notifications created: ${notifications.length} notifications in batch ${batchId}`);
    return notifications;
  }

  /**
   * Remove invalid push tokens from user
   * @param {string} userId - User ID
   * @param {Array} invalidTokens - Array of invalid tokens
   */
  async removeInvalidTokens(userId, invalidTokens) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Filter out invalid tokens
      user.pushTokens = user.pushTokens.filter(
        tokenObj => !invalidTokens.includes(tokenObj.token)
      );

      await user.save();
      logger.info(`Removed ${invalidTokens.length} invalid push tokens for user: ${userId}`);
    } catch (error) {
      logger.error('Error removing invalid tokens:', error);
    }
  }

  /**
   * Register push token for user
   * @param {string} userId - User ID
   * @param {string} token - Push token
   * @param {string} platform - Platform (ios, android, web)
   * @param {string} deviceId - Device ID
   */
  async registerPushToken(userId, token, platform, deviceId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove existing token if already exists
      user.pushTokens = user.pushTokens.filter(
        tokenObj => tokenObj.token !== token
      );

      // Add new token
      user.pushTokens.push({
        token,
        platform,
        deviceId,
        registeredAt: new Date()
      });

      // Keep only the last 5 tokens per user to avoid clutter
      if (user.pushTokens.length > 5) {
        user.pushTokens = user.pushTokens
          .sort((a, b) => b.registeredAt - a.registeredAt)
          .slice(0, 5);
      }

      await user.save();

      // Subscribe to general topic for broadcast messages
      if (firebaseService.isInitialized()) {
        await firebaseService.subscribeToTopic(token, 'general');
        logger.info(`Registered push token for user ${userId} on ${platform}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Unregister push token
   * @param {string} userId - User ID
   * @param {string} token - Push token
   */
  async unregisterPushToken(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      user.pushTokens = user.pushTokens.filter(
        tokenObj => tokenObj.token !== token
      );

      await user.save();

      // Unsubscribe from topics
      if (firebaseService.isInitialized()) {
        await firebaseService.unsubscribeFromTopic(token, 'general');
        logger.info(`Unregistered push token for user: ${userId}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error unregistering push token:', error);
      throw error;
    }
  }

  /**
   * Send broadcast notification to all users
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   */
  async sendBroadcastNotification(title, message, data = {}) {
    try {
      if (!firebaseService.isInitialized()) {
        logger.warn('Firebase not initialized. Cannot send broadcast notification.');
        return { success: false, error: 'Firebase not initialized' };
      }

      const result = await firebaseService.sendToTopic(
        'general',
        { title, body: message },
        { ...data, type: 'broadcast' }
      );

      logger.info(`Broadcast notification sent via topic: ${result.success}`);
      return result;
    } catch (error) {
      logger.error('Error sending broadcast notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old notifications
   * @param {number} daysOld - Days old threshold
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const result = await Notification.deleteOldNotifications(daysOld);
      logger.info(`Cleaned up ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;

