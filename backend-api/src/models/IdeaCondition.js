const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  idea: { type: mongoose.Schema.ObjectId, ref: 'ActivityIdea', required: true },
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  maxBudget: { type: Number, min: 0, max: 1000000 },
  currency: { type: String, enum: ['DOP', 'USD', 'EUR'], default: 'DOP' },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  zone: { type: String, trim: true, maxlength: 80 }
}, { timestamps: true });
schema.index({ idea: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('IdeaCondition', schema);
