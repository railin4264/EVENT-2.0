const mongoose = require('mongoose');

const eventConnectionSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isMutual: {
    type: Boolean,
    default: false,
    index: true
  },
  matchedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'matched', 'dismissed', 'blocked'],
    default: 'pending'
  }
}, {
  timestamps: true
});

eventConnectionSchema.index({ event: 1, fromUser: 1, toUser: 1 }, { unique: true });

module.exports = mongoose.model('EventConnection', eventConnectionSchema);
