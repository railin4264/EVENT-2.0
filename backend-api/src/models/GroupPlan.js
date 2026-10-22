const mongoose = require('mongoose');
const crypto = require('crypto');

const groupPlanSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 4, maxlength: 80 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shareToken: { type: String, unique: true, default: () => crypto.randomBytes(24).toString('hex') },
  options: [{ eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true } }],
  ballots: { type: Map, of: String, default: () => new Map(), select: false },
  status: { type: String, enum: ['open', 'decided'], default: 'open' },
  selectedOptionId: String,
  expiresAt: { type: Date, required: true },
  decidedAt: Date
}, { timestamps: true });
groupPlanSchema.index({ createdBy: 1, createdAt: -1 });
module.exports = mongoose.model('GroupPlan', groupPlanSchema);
