const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'tribe', 'event'],
    required: true,
  },
  name: {
    type: String,
    required: function() {
      return this.type === 'group';
    },
  },
  description: String,
  avatar: String,
  
  // Participants
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member',
    },
    lastSeenAt: Date,
    notifications: {
      type: Boolean,
      default: true,
    },
  }],
  
  // For tribe/event chats
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
  },
  referenceModel: {
    type: String,
    enum: ['Event', 'Tribe'],
  },
  
  // Last message info
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'location', 'event', 'tribe'],
      default: 'text',
    },
    timestamp: Date,
  },
  
  // Chat settings
  settings: {
    allowNewMembers: {
      type: Boolean,
      default: true,
    },
    muteAll: {
      type: Boolean,
      default: false,
    },
    allowMediaSharing: {
      type: Boolean,
      default: true,
    },
    allowLocationSharing: {
      type: Boolean,
      default: true,
    },
  },
  
  // Chat status
  isActive: {
    type: Boolean,
    default: true,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  
  // For direct chats
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ type: 1, isActive: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Virtual for participant count
chatSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Methods
chatSchema.methods.addParticipant = function(userId, role = 'member') {
  if (!this.participants.some(p => p.user.toString() === userId.toString())) {
    this.participants.push({ 
      user: userId, 
      role,
      joinedAt: new Date() 
    });
  }
  return this.save();
};

chatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.user.toString() !== userId.toString()
  );
  return this.save();
};

chatSchema.methods.updateLastMessage = function(message) {
  this.lastMessage = {
    content: message.content,
    sender: message.sender,
    messageType: message.messageType,
    timestamp: message.createdAt || new Date(),
  };
  return this.save();
};

chatSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

chatSchema.methods.getParticipantRole = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  return participant ? participant.role : null;
};

chatSchema.methods.updateLastSeen = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  if (participant) {
    participant.lastSeenAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Statics
chatSchema.statics.createDirectChat = function(user1Id, user2Id) {
  const chatId = [user1Id, user2Id].sort().join('_');
  
  return this.findOneAndUpdate(
    { chatId },
    {
      chatId,
      type: 'direct',
      participants: [
        { user: user1Id, role: 'member' },
        { user: user2Id, role: 'member' },
      ],
      createdBy: user1Id,
      isActive: true,
    },
    { 
      upsert: true, 
      new: true, 
      setDefaultsOnInsert: true 
    }
  );
};

chatSchema.statics.createGroupChat = function(name, description, creatorId, participantIds = []) {
  const chatId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const participants = [
    { user: creatorId, role: 'admin' },
    ...participantIds.map(id => ({ user: id, role: 'member' })),
  ];
  
  return this.create({
    chatId,
    type: 'group',
    name,
    description,
    participants,
    createdBy: creatorId,
    isActive: true,
  });
};

chatSchema.statics.createTribeChat = function(tribeId, tribeName) {
  const chatId = `tribe_${tribeId}`;
  
  return this.findOneAndUpdate(
    { chatId },
    {
      chatId,
      type: 'tribe',
      name: `${tribeName} - Chat`,
      reference: tribeId,
      referenceModel: 'Tribe',
      isActive: true,
    },
    { 
      upsert: true, 
      new: true, 
      setDefaultsOnInsert: true 
    }
  );
};

chatSchema.statics.createEventChat = function(eventId, eventName) {
  const chatId = `event_${eventId}`;
  
  return this.findOneAndUpdate(
    { chatId },
    {
      chatId,
      type: 'event',
      name: `${eventName} - Chat`,
      reference: eventId,
      referenceModel: 'Event',
      isActive: true,
    },
    { 
      upsert: true, 
      new: true, 
      setDefaultsOnInsert: true 
    }
  );
};

chatSchema.statics.getUserChats = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    'participants.user': userId,
    isActive: true 
  })
    .populate('participants.user', 'firstName lastName username avatar lastSeen')
    .populate('lastMessage.sender', 'firstName lastName username')
    .populate('reference')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('Chat', chatSchema);










