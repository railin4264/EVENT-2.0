const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return ['follow', 'follow_request', 'event_invite', 'comment', 'like'].includes(this.type);
    }
  },
  type: {
    type: String,
    required: true,
    enum: [
      'follow',           // Someone followed you
      'follow_request',   // Someone requested to follow you
      'event_invite',     // Someone invited you to an event
      'event_reminder',   // Event reminder
      'event_update',     // Event you're attending was updated
      'comment',          // Someone commented on your event/post
      'like',             // Someone liked your content
      'tribe_invite',     // Someone invited you to a tribe
      'system',           // System notifications
      'welcome'           // Welcome message for new users
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Additional data (event ID, user ID, etc.)
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  actionUrl: {
    type: String, // URL to navigate when notification is clicked
    maxlength: 200
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

// Static methods
notificationSchema.statics.createNotification = async function({
  recipient,
  sender,
  type,
  title,
  message,
  data = {},
  actionUrl,
  priority = 'medium',
  expiresAt
}) {
  // Don't create notification if sender and recipient are the same
  if (sender && sender.toString() === recipient.toString()) {
    return null;
  }

  // Check if similar notification already exists (to prevent spam)
  if (['follow', 'like'].includes(type) && sender) {
    const existing = await this.findOne({
      recipient,
      sender,
      type,
      'data.resourceId': data.resourceId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (existing) {
      // Update existing notification instead of creating new one
      existing.message = message;
      existing.data = { ...existing.data, ...data };
      existing.read = false;
      existing.readAt = null;
      existing.createdAt = new Date();
      return await existing.save();
    }
  }

  const notification = await this.create({
    recipient,
    sender,
    type,
    title,
    message,
    data,
    actionUrl,
    priority,
    expiresAt
  });

  return await notification.populate([
    {
      path: 'sender',
      select: 'firstName lastName username avatar'
    },
    {
      path: 'recipient',
      select: 'firstName lastName username'
    }
  ]);
};

notificationSchema.statics.getNotifications = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const notifications = await this.find({ recipient: userId })
    .populate('sender', 'firstName lastName username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const unreadCount = await this.countDocuments({ 
    recipient: userId, 
    read: false 
  });

  return {
    notifications,
    unreadCount,
    hasMore: notifications.length === limit
  };
};

notificationSchema.statics.markAsRead = async function(userId, notificationIds) {
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  
  const result = await this.updateMany(
    {
      _id: { $in: ids },
      recipient: userId,
      read: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );

  return result;
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  const result = await this.updateMany(
    {
      recipient: userId,
      read: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );

  return result;
};

notificationSchema.statics.deleteNotification = async function(userId, notificationId) {
  return await this.deleteOne({
    _id: notificationId,
    recipient: userId
  });
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    read: false
  });
};

notificationSchema.statics.cleanupOldNotifications = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return await this.deleteMany({
    read: true,
    readAt: { $lt: thirtyDaysAgo }
  });
};

// Helper methods for creating specific notification types
notificationSchema.statics.createFollowNotification = async function(followerId, followedId) {
  const follower = await mongoose.model('User').findById(followerId).select('firstName lastName username');
  if (!follower) return null;

  return await this.createNotification({
    recipient: followedId,
    sender: followerId,
    type: 'follow',
    title: 'Nuevo seguidor',
    message: `${follower.firstName} ${follower.lastName} ahora te sigue`,
    data: { userId: followerId },
    actionUrl: `/profile?id=${followerId}`,
    priority: 'medium'
  });
};

notificationSchema.statics.createFollowRequestNotification = async function(requesterId, targetId) {
  const requester = await mongoose.model('User').findById(requesterId).select('firstName lastName username');
  if (!requester) return null;

  return await this.createNotification({
    recipient: targetId,
    sender: requesterId,
    type: 'follow_request',
    title: 'Solicitud de seguimiento',
    message: `${requester.firstName} ${requester.lastName} quiere seguirte`,
    data: { userId: requesterId },
    actionUrl: '/social?tab=requests',
    priority: 'high'
  });
};

notificationSchema.statics.createEventInviteNotification = async function(inviterId, inviteeId, eventId) {
  const [inviter, event] = await Promise.all([
    mongoose.model('User').findById(inviterId).select('firstName lastName username'),
    mongoose.model('Event').findById(eventId).select('title')
  ]);

  if (!inviter || !event) return null;

  return await this.createNotification({
    recipient: inviteeId,
    sender: inviterId,
    type: 'event_invite',
    title: 'Invitación a evento',
    message: `${inviter.firstName} ${inviter.lastName} te invitó a "${event.title}"`,
    data: { eventId, userId: inviterId },
    actionUrl: `/events/${eventId}`,
    priority: 'high'
  });
};

notificationSchema.statics.createEventReminderNotification = async function(userId, eventId, reminderType = '1hour') {
  const event = await mongoose.model('Event').findById(eventId).select('title date');
  if (!event) return null;

  const reminderMessages = {
    '1hour': 'Tu evento comienza en 1 hora',
    '1day': 'Tu evento es mañana',
    '1week': 'Tu evento es la próxima semana'
  };

  return await this.createNotification({
    recipient: userId,
    type: 'event_reminder',
    title: 'Recordatorio de evento',
    message: `${reminderMessages[reminderType]}: "${event.title}"`,
    data: { eventId, reminderType },
    actionUrl: `/events/${eventId}`,
    priority: 'high',
    expiresAt: event.date
  });
};

notificationSchema.statics.createWelcomeNotification = async function(userId) {
  return await this.createNotification({
    recipient: userId,
    type: 'welcome',
    title: '¡Bienvenido a EventConnect!',
    message: 'Descubre eventos increíbles y conecta con personas de intereses similares',
    data: { isWelcome: true },
    actionUrl: '/discovery',
    priority: 'medium'
  });
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Pre-save middleware to set expiration for certain notification types
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration for certain notification types
    const expirationDays = {
      'event_reminder': 1,
      'follow': 7,
      'system': 30,
      'welcome': 7
    };

    const days = expirationDays[this.type] || 30; // Default 30 days
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);