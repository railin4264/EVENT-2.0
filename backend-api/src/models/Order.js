const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },

  // Customer information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },

  // Event information
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },

  // Order items
  items: [orderItemSchema],

  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  fees: {
    processing: { type: Number, default: 0 },
    service: { type: Number, default: 0 },
    tax: { type: Number, default: 0 }
  },
  commission: {
    rate: { type: Number, default: 0.10 }, // 10% platform commission
    amount: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date }
  },
  organizerPayout: {
    amount: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
    stripeTransferId: { type: String }
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },

  // Payment information
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'paypal', 'free']
  },
  stripePaymentIntentId: {
    type: String
  },
  stripeClientSecret: {
    type: String
  },

  // Order status
  status: {
    type: String,
    enum: ['draft', 'pending_payment', 'confirmed', 'canceled', 'refunded', 'completed'],
    default: 'draft'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date
  },
  canceledAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },

  // Expiration for pending orders
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
  },

  // Notes and metadata
  notes: {
    type: String,
    maxlength: 1000
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: false // We're managing timestamps manually
});

// Generate order number
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = `EC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

// Virtual for total quantity
orderSchema.virtual('totalQuantity').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Methods
orderSchema.methods.calculateTotal = function() {
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);

  // Calculate fees (example rates)
  const processingFeeRate = 0.029; // 2.9%
  const serviceFeeFlat = 0.30; // $0.30

  this.fees.processing = Math.round((this.subtotal * processingFeeRate + serviceFeeFlat) * 100) / 100;
  this.fees.service = Math.round(this.subtotal * 0.05 * 100) / 100; // 5% service fee
  this.fees.tax = 0; // Tax calculation would depend on location

  // Calculate commission (10% of subtotal)
  this.commission.amount = Math.round(this.subtotal * this.commission.rate * 100) / 100;

  // Calculate organizer payout (subtotal - commission - fees)
  this.organizerPayout.amount = Math.round((this.subtotal - this.commission.amount) * 100) / 100;

  this.total = this.subtotal + this.fees.processing + this.fees.service + this.fees.tax;
  return this.total;
};

orderSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt && this.status === 'pending_payment';
};

orderSchema.methods.canCancel = function() {
  return ['draft', 'pending_payment', 'confirmed'].includes(this.status);
};

orderSchema.methods.canRefund = function() {
  return this.status === 'completed' && this.paymentStatus === 'succeeded';
};

orderSchema.methods.markAsPaid = function() {
  this.paymentStatus = 'succeeded';
  this.status = 'confirmed';
  this.paidAt = new Date();
  return this.save();
};

orderSchema.methods.cancel = function(reason = '') {
  if (!this.canCancel()) {
    throw new Error('Order cannot be canceled');
  }

  this.status = 'canceled';
  this.canceledAt = new Date();
  if (reason) {
    this.notes = (this.notes || '') + `\nCanceled: ${reason}`;
  }
  return this.save();
};

// Static methods
orderSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber })
    .populate('userId', 'firstName lastName email')
    .populate('eventId', 'title date location')
    .populate('items.ticketId', 'name type');
};

orderSchema.statics.findUserOrders = function(userId, status = null) {
  const query = { userId };
  if (status) query.status = status;

  return this.find(query)
    .populate('eventId', 'title date location images')
    .populate('items.ticketId', 'name type')
    .sort({ createdAt: -1 });
};

orderSchema.statics.findEventOrders = function(eventId, status = null) {
  const query = { eventId };
  if (status) query.status = status;

  return this.find(query)
    .populate('userId', 'firstName lastName email')
    .populate('items.ticketId', 'name type')
    .sort({ createdAt: -1 });
};

// Indexes (orderNumber index already created by unique: true)
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ eventId: 1, status: 1 });
orderSchema.index({ expiresAt: 1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);