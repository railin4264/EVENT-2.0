const mongoose = require('mongoose');
const { CATEGORY_ENUM } = require('../utils/categories');

/**
 * ActivityIdea: una actividad que la gente QUIERE que exista en su zona
 * (ej. "violín en el parque"). Funciona como señal de demanda:
 *  - Los usuarios la apoyan ("Me interesa").
 *  - Los creadores ven dónde hay demanda sin cubrir.
 *  - Cuando un creador la convierte en evento, se avisa a quienes la apoyaron.
 */
const ideaSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 4, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 600, default: '' },
  category: { type: String, required: true, enum: CATEGORY_ENUM, default: 'other' },
  activityType: { type: String, trim: true, maxlength: 60 },
  emoji: { type: String, trim: true, maxlength: 8 },
  zone: {
    name: { type: String, trim: true, maxlength: 80, default: 'República Dominicana' },
    city: { type: String, trim: true, maxlength: 60 },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }
    }
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  seeded: { type: Boolean, default: false },
  supporters: [{
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  supportersCount: { type: Number, default: 0, min: 0 },
  quorumTarget: { type: Number, default: 25, min: 5, max: 500 },
  quorumDeadline: { type: Date },
  quorumReached: { type: Boolean, default: false, index: true },
  quorumReachedAt: { type: Date },
  status: { type: String, enum: ['open', 'launched', 'closed'], default: 'open', index: true },
  linkedEvent: { type: mongoose.Schema.ObjectId, ref: 'Event' },
  launchedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
  acceptedProposalId: mongoose.Schema.ObjectId,
  proposals: [{
    organizer: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.ObjectId, ref: 'Event', required: true },
    note: { type: String, maxlength: 300, default: '' },
    at: { type: Date, default: Date.now }
  }],
  launchedAt: Date
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Solo indexamos geo cuando hay coordenadas válidas
ideaSchema.index({ 'zone.location': '2dsphere' }, { sparse: true });
ideaSchema.index({ status: 1, supportersCount: -1 });
ideaSchema.index({ category: 1, status: 1 });
ideaSchema.index({ status: 1, quorumDeadline: 1, createdAt: -1 });
ideaSchema.index({ title: 'text', description: 'text', activityType: 'text' });

ideaSchema.pre('validate', function (next) {
  const loc = this.zone && this.zone.location;
  if (loc && (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2)) {
    this.zone.location = undefined;
  } else if (loc && !loc.type) {
    loc.type = 'Point';
  }
  next();
});

module.exports = mongoose.model('ActivityIdea', ideaSchema);
