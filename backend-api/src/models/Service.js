const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  identifier: { // e.g. 'transport', 'dining' - unique ID for frontend routing/logic
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true // Ionicons name
  },
  image: {
    type: String,
    required: true
  },
  colors: {
    type: [String], // Array of 2 colors for gradient
    validate: [arrayLimit, '{PATH} exceeds the limit of 2']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

function arrayLimit(val) {
  return val.length <= 2;
}

module.exports = mongoose.model('Service', serviceSchema);
