const mongoose = require('mongoose');
const offer = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, maxlength: 80 }, note: { type: String, maxlength: 300, default: '' }, status: { type: String, enum: ['offered', 'accepted', 'declined'], default: 'offered' } }, { _id: false });
const schema = new mongoose.Schema({
  scope: { type: String, enum: ['events', 'ideas'], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  roles: [{ title: { type: String, required: true, maxlength: 100 }, slots: { type: Number, required: true, min: 1, max: 50 }, closed: { type: Boolean, default: false }, offers: { type: [offer], default: [] } }],
  repeatVotes: [{ _id: false, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, days: { type: [String], default: [] } }],
  meetup: {
    place: { type: String, maxlength: 200 }, time: Date,
    participants: [{ _id: false, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, maxlength: 80 }, shareName: { type: Boolean, default: false } }]
  }
}, { timestamps: true });
schema.index({ scope: 1, target: 1 }, { unique: true });
module.exports = mongoose.model('CommunityAction', schema);
