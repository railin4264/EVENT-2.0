'use strict';

const mongoose = require('mongoose');

const eventBuddySchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['seeking', 'matched', 'paused', 'closed'],
    default: 'seeking',
    index: true
  },
  seekingGender: {
    type: String,
    enum: ['any', 'male', 'female', 'non_binary'],
    default: 'any'
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [240, 'El mensaje no puede exceder 240 caracteres'],
    default: '¡Busco unirme con alguien para disfrutar este evento!'
  },
  interests: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  requests: [{
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  matchedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  matchedAt: Date
}, {
  timestamps: true
});

eventBuddySchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('EventBuddy', eventBuddySchema);
