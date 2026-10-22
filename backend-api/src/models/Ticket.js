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
    enum: ['usd', 'eur', 'gbp', 'mxn', 'cad', 'dop']
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
  // Receipt and stock change are written together, so recovery is safe even
  // when the process stops before the order can record completion.
  releasedOrderIds: { type: [mongoose.Schema.Types.ObjectId], select: false, default: undefined },
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
  return Number.isInteger(quantity) && this.isAvailable() &&
         quantity >= this.minPurchase &&
         quantity <= this.maxPurchase &&
         quantity <= this.remaining;
};

ticketSchema.methods.reserveTickets = async function(quantity) {
  if (!this.canPurchase(quantity)) {
    throw new Error('Cannot reserve tickets');
  }

  const now = new Date();
  const reserved = await this.constructor.findOneAndUpdate({
    _id: this._id, isActive: true,
    saleStartDate: { $lte: now }, saleEndDate: { $gte: now },
    $expr: { $gte: [{ $subtract: ['$quantity', '$sold'] }, quantity] }
  }, { $inc: { sold: quantity, available: -quantity } }, { new: true });
  if (!reserved) throw new Error('Cannot reserve tickets: insufficient availability');
  this.sold = reserved.sold;
  this.available = reserved.available;
  return reserved;
};

ticketSchema.statics.releaseTickets = function(ticketId, quantity) {
  return this.updateOne({ _id: ticketId, sold: { $gte: quantity } },
    { $inc: { sold: -quantity, available: quantity } });
};

ticketSchema.statics.releaseOrderTickets = async function(ticketId, quantity, orderId) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Invalid release quantity');
  const result = await this.updateOne({
    _id: ticketId, sold: { $gte: quantity }, releasedOrderIds: { $ne: orderId }
  }, {
    $inc: { sold: -quantity, available: quantity },
    $addToSet: { releasedOrderIds: orderId }
  });
  if (result.modifiedCount) return;
  if (await this.exists({ _id: ticketId, releasedOrderIds: orderId })) return;
  throw new Error(`Could not release inventory for ticket ${ticketId}`);
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
