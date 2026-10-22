const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, immutable: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, trim: true, maxlength: 600, default: '' },
  attendanceVerifiedAt: { type: Date, required: true }
}, { timestamps: true });
schema.index({ event: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('EventReview', schema);
