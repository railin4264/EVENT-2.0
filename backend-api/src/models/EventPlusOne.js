const mongoose = require('mongoose');

const eventPlusOneSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['have_extra_ticket', 'looking_for_companion', 'group_join'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  ticketPrice: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['open', 'matched', 'closed'],
    default: 'open',
    index: true
  },
  interestedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 250
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  matchedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

eventPlusOneSchema.index({ event: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('EventPlusOne', eventPlusOneSchema);
