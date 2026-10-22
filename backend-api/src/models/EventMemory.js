const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  imageAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    select: false
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: { type: Date, default: Date.now }
  }],
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

memorySchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('EventMemory', memorySchema);
