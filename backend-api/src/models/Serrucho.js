const mongoose = require('mongoose');
const crypto = require('crypto');
const validAmount = value => Number.isFinite(value) && value >= 0.01 && value <= 100000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
const amountRule = { validator: validAmount, message: 'El monto debe ser positivo, finito y tener hasta dos decimales' };
const isConfirmed = participant => participant.paid === true && participant.paymentStatus === 'confirmed' &&
  Boolean(participant.confirmedBy && participant.confirmedAt) && validAmount(participant.amount);
const collected = participants => (participants || []).filter(isConfirmed).reduce((sum, participant) => sum + Math.round(participant.amount * 100), 0) / 100;

const serruchoSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'El serrucho necesita un título o nombre del coro'],
    trim: true,
    maxlength: 120
  },
  targetAmount: {
    type: Number,
    required: [true, 'Define el monto total a reunir'],
    min: 0.01,
    max: 100000000,
    validate: amountRule
  },
  perPersonAmount: {
    type: Number,
    required: [true, 'Define el monto por persona'],
    min: 0.01,
    max: 100000000,
    validate: amountRule
  },
  targetParticipants: {
    type: Number,
    default: 4,
    min: 2,
    max: 50,
    validate: { validator: Number.isInteger, message: 'La cantidad de participantes debe ser entera' }
  },
  currency: {
    type: String,
    default: 'DOP',
    uppercase: true,
    match: /^[A-Z]{3}$/
  },
  shareCode: {
    type: String,
    unique: true,
    index: true,
    match: /^coro-[a-f0-9]{6,32}$/
  },
  status: {
    type: String,
    enum: ['open', 'completed', 'cancelled', 'expired'],
    default: 'open'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      max: 100000000,
      validate: amountRule
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    paymentStatus: { type: String, enum: ['pending', 'submitted', 'confirmed'], default: 'pending' },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: Date,
    confirmedAfterExpiry: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: ['transferencia', 'efectivo', 'tarjeta'],
      default: 'transferencia'
    },
    voucherRef: {
      type: String,
      trim: true,
      maxlength: 300
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  paymentInstructions: {
    bankName: { type: String, maxlength: 100, default: '' },
    accountNumber: { type: String, maxlength: 100, default: '' },
    accountHolder: { type: String, maxlength: 150, default: '' },
    rncOrCedula: { type: String, maxlength: 30, default: '' },
    notes: { type: String, maxlength: 300, default: 'Registro manual. Coordina el pago externo con quien organiza.' }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total collected so far
serruchoSchema.virtual('totalCollected').get(function() {
  if (!this.participants) return 0;
  return collected(this.participants);
});

// Virtual for progress percentage
serruchoSchema.virtual('progressPercent').get(function() {
  if (!this.targetAmount || this.targetAmount <= 0) return 0;
  const collected = this.totalCollected;
  return Math.min(100, Math.round((collected / this.targetAmount) * 100));
});

// Auto-generate unique shareCode before save
serruchoSchema.pre('validate', function(next) {
  if (!this.shareCode) {
    this.shareCode = 'coro-' + crypto.randomBytes(12).toString('hex');
  }
  next();
});

serruchoSchema.statics.isConfirmed = isConfirmed;
serruchoSchema.statics.collected = collected;

module.exports = mongoose.model('Serrucho', serruchoSchema);
