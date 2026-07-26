const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.chatType === 'direct';
    },
  },
  chatId: {
    type: String,
    required: true,
    index: true,
  },
  chatType: {
    type: String,
    enum: ['direct', 'group', 'tribe', 'event'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'event', 'tribe'],
    default: 'text',
  },
  media: {
    images: [{
      url: String,
      thumbnail: String,
      originalName: String,
      size: Number,
    }],
    files: [{
      url: String,
      fileName: String,
      fileType: String,
      size: Number,
    }],
  },
  location: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
    },
    address: String,
  },
  // For referencing events or tribes
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
  },
  referenceModel: {
    type: String,
    enum: ['Event', 'Tribe'],
  },
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // For message editing/deletion
  editedAt: Date,
  deletedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  // Reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  // Reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes for performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ chatType: 1, createdAt: -1 });
messageSchema.index({ 'readBy.user': 1 });

// Virtual for unread status
messageSchema.virtual('isUnread').get(function() {
  return this.status !== 'read';
});

// Methods
messageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId });
    this.status = 'read';
  }
  return this.save();
};

messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({ user: userId, emoji });
  return this.save();
};

messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  return this.save();
};

// Statics
messageSchema.statics.getUnreadCount = function(userId, chatId) {
  return this.countDocuments({
    chatId,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId },
    isDeleted: false,
  });
};

messageSchema.statics.getChatMessages = function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    chatId, 
    isDeleted: false 
  })
    .populate('sender', 'firstName lastName username avatar')
    .populate('receiver', 'firstName lastName username avatar')
    .populate('replyTo', 'content messageType sender')
    .populate('reactions.user', 'firstName lastName username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Update status to delivered if it was sent
  if (this.isNew && this.status === 'sent') {
    this.status = 'delivered';
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);










