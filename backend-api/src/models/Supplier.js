const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del suplidor es requerido'],
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    required: true,
    enum: [
      'dj_sound',
      'photography_video',
      'bartender_catering',
      'venue_rooftop',
      'decor_lighting',
      'security_staff',
      'mc_animation',
      'other'
    ],
    default: 'dj_sound'
  },
  categoryLabel: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  city: {
    type: String,
    trim: true,
    default: 'Santo Domingo'
  },
  phone: {
    type: String,
    trim: true
  },
  whatsapp: {
    type: String,
    trim: true
  },
  instagram: {
    type: String,
    trim: true
  },
  priceRange: {
    type: String,
    trim: true,
    default: 'A cotizar'
  },
  startingPriceDOP: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewsCount: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    trim: true
  },
  gallery: [{
    type: String,
    trim: true
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  services: [{
    type: String,
    trim: true
  }],
  archivedAt: { type: Date, default: null },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

supplierSchema.index({ category: 1, city: 1, rating: -1 });

module.exports = mongoose.model('Supplier', supplierSchema);
