const mongoose = require('mongoose');
const proposal = new mongoose.Schema({ by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, note: { type: String, maxlength: 600 }, space: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerSpace' }, at: { type: Date, default: Date.now } });
const need = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['event', 'idea'], required: true }, targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true, maxlength: 100 }, description: { type: String, required: true, maxlength: 800 },
  kind: { type: String, enum: ['space', 'in_kind', 'outreach'], required: true },
  status: { type: String, enum: ['open', 'coordinating', 'delivered', 'confirmed', 'closed'], default: 'open' },
  proposals: { type: [proposal], default: [] }, acceptedProposalId: mongoose.Schema.Types.ObjectId,
  evidence: { type: String, maxlength: 500 }, deliveredAt: Date, confirmedAt: Date,
  messages: [{ role: { type: String, enum: ['host', 'partner'] }, text: { type: String, maxlength: 500 }, at: { type: Date, default: Date.now } }]
}, { timestamps: true });
need.index({ owner: 1, createdAt: -1 });
need.index({ status: 1, createdAt: -1 });
const space = new mongoose.Schema({ owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, required: true, maxlength: 100 }, city: { type: String, required: true, maxlength: 80 }, country: { type: String, required: true, maxlength: 80 }, capacity: { type: Number, required: true, min: 1, max: 100000 }, accessibility: { type: String, maxlength: 400 }, conditions: { type: String, required: true, maxlength: 800 }, availability: { type: String, required: true, maxlength: 400 }, active: { type: Boolean, default: true } }, { timestamps: true });
module.exports = { PartnerNeed: mongoose.model('PartnerNeed', need), PartnerSpace: mongoose.model('PartnerSpace', space) };
