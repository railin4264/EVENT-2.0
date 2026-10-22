const mongoose = require('mongoose');

/**
 * SpontaneousCoro: Micro-coro espontáneo para salir hoy ("¿Quién se anima hoy?")
 * Une a 3-5 personas con la misma vibra en una ciudad específica.
 * Expira automáticamente tras 12 horas.
 */
const spontaneousCoroSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  mood: {
    type: String,
    required: true,
    enum: ['cafe', 'art', 'outdoors', 'music', 'gaming', 'food', 'party', 'relax'],
    default: 'cafe'
  },
  city: {
    type: String,
    required: true,
    trim: true,
    default: 'Santo Domingo'
  },
  meetingSpot: {
    type: String,
    trim: true,
    maxlength: 120,
    default: 'Punto público céntrico a acordar'
  },
  timeSlot: {
    type: String,
    enum: ['now', 'afternoon', 'evening', 'night'],
    default: 'now'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['confirmed', 'left'],
      default: 'confirmed'
    }
  }],
  maxMembers: {
    type: Number,
    default: 5,
    min: 2,
    max: 8
  },
  status: {
    type: String,
    enum: ['active', 'full', 'completed', 'cancelled'],
    default: 'active',
    index: true
  },
  recommendedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 12 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

spontaneousCoroSchema.virtual('activeMembersCount').get(function () {
  return (this.members || []).filter(m => m.status === 'confirmed').length;
});

module.exports = mongoose.model('SpontaneousCoro', spontaneousCoroSchema);
