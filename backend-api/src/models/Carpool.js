'use strict';

const mongoose = require('mongoose');

const carpoolSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  departureLocation: {
    type: String,
    required: [true, 'Indica el punto de partida'],
    trim: true,
    maxlength: 150
  },
  departureCoordinates: {
    type: [Number], // [lng, lat]
    default: undefined
  },
  departureTime: {
    type: Date,
    required: [true, 'Indica la hora de salida']
  },
  returnTrip: {
    type: Boolean,
    default: true
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
    default: 3
  },
  availableSeats: {
    type: Number,
    min: 0,
    max: 8,
    default: 3
  },
  contributionAmount: {
    type: Number,
    default: 0, // 0 = viaje gratis / solidario
    min: 0
  },
  currency: {
    type: String,
    default: 'DOP',
    uppercase: true
  },
  vehicleModel: {
    type: String,
    trim: true,
    maxlength: 80,
    default: 'Vehículo particular'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 250,
    default: 'Viaje tranquilo y seguro. ¡Llegamos juntos al evento!'
  },
  passengers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seatsBooked: {
      type: Number,
      default: 1,
      min: 1
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['open', 'full', 'departed', 'completed', 'cancelled'],
    default: 'open',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Carpool', carpoolSchema);
