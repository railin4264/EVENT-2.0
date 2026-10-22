const mongoose = require('mongoose');

const eventAfterSchema = new mongoose.Schema({
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
  spotName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  spotType: {
    type: String,
    enum: ['bar', 'food', 'club', 'chill', 'other'],
    default: 'food'
  },
  address: {
    type: String,
    trim: true,
    maxlength: 200
  },
  googleMapsUrl: {
    type: String,
    trim: true
  },
  vibe: {
    type: String,
    enum: ['encendido', 'comida_tardia', 'musica', 'tranquilo_hablar'],
    default: 'comida_tardia'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300
  },
  attendeesGoing: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // TTL 24 horas
  }
}, {
  timestamps: true
});

eventAfterSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('EventAfter', eventAfterSchema);
