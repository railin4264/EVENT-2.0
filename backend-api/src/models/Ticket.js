const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Basic ticket information
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },

  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'usd',
    enum: ['usd', 'eur', 'gbp', 'mxn', 'cad']
  },

  // Availability
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  sold: {
    type: Number,
    default: 0,
    min: 0
  },
  available: {
    type: Number,
    default: function() {
      return this.quantity - this.sold;
    }
  },

  // Sales period
  saleStartDate: {
    type: Date,
    required: true
  },
  saleEndDate: {
    type: Date,
    required: true
  },

  // Ticket type and settings
  type: {
    type: String,
    enum: ['general', 'vip', 'early_bird', 'group', 'student'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFree: {
    type: Boolean,
    default: function() {
      return this.price === 0;
    }
  },

  // Restrictions
  minPurchase: {
    type: Number,
    default: 1,
    min: 1
  },
  maxPurchase: {
    type: Number,
    default: 10,
    min: 1
  },

  // Metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Virtual for remaining tickets
ticketSchema.virtual('remaining').get(function() {
  return Math.max(0, this.quantity - this.sold);
});

// Methods
ticketSchema.methods.isAvailable = function() {
  const now = new Date();
  return this.isActive &&
         this.remaining > 0 &&
         now >= this.saleStartDate &&
         now <= this.saleEndDate;
};

ticketSchema.methods.canPurchase = function(quantity) {
  return this.isAvailable() &&
         quantity >= this.minPurchase &&
         quantity <= this.maxPurchase &&
         quantity <= this.remaining;
};

ticketSchema.methods.reserveTickets = function(quantity) {
  if (!this.canPurchase(quantity)) {
    throw new Error('Cannot reserve tickets');
  }

  this.sold += quantity;
  return this.save();
};

// Static methods
ticketSchema.statics.getAvailableTickets = function(eventId) {
  return this.find({
    eventId,
    isActive: true,
    saleStartDate: { $lte: new Date() },
    saleEndDate: { $gte: new Date() },
    $expr: { $gt: ['$quantity', '$sold'] }
  });
};

// Indexes
ticketSchema.index({ eventId: 1, isActive: 1 });
ticketSchema.index({ saleStartDate: 1, saleEndDate: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);