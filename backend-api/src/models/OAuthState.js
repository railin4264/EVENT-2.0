const mongoose = require('mongoose');

// Only a digest is persisted. Consumption is atomic across API replicas.
const schema = new mongoose.Schema({
  _id: { type: String },
  provider: { type: String, enum: ['google', 'facebook'], required: true },
  originalUrl: { type: String, maxlength: 2048, default: '/' },
  expiresAt: { type: Date, required: true }
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OAuthState', schema);
