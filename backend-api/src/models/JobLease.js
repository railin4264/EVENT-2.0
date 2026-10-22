const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: String,
  owner: { type: String, required: true },
  completedSlot: String,
  expiresAt: { type: Date, required: true }
}, { versionKey: false });
module.exports = mongoose.models.JobLease || mongoose.model('JobLease', schema);
