const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  token: { type: String, required: true, select: false },
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  notification: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Notification' },
  status: { type: String, enum: ['pending', 'delivered_to_provider', 'failed', 'unknown'], default: 'pending' },
  checkAt: { type: Date, required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });
module.exports = mongoose.models.PushReceipt || mongoose.model('PushReceipt', schema);
