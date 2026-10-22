const Order = require('../models/Order');

const id = value => String(value?._id || value || '');
const isRegisteredAttendee = (event, userId) => (event.attendees || []).some(attendee =>
  id(attendee.user) === id(userId) && ['attending', 'confirmed'].includes(attendee.status));

async function hasEventParticipation(event, userId) {
  if (!userId) return false;
  if (isRegisteredAttendee(event, userId)) return true;
  return Boolean(await Order.exists({ eventId: event._id, userId,
    status: { $in: ['confirmed', 'completed'] }, paymentStatus: 'succeeded' }));
}

function safeWebUrl(value) {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch (_) { return false; }
}

async function toggleSocialVote(Model, filter, field, userId, counter) {
  const values = { $ifNull: [`$${field}`, []] };
  const pipeline = [{ $set: { [field]: { $cond: [
    { $in: [userId, values] },
    { $filter: { input: values, as: 'voter', cond: { $ne: ['$$voter', userId] } } },
    { $concatArrays: [values, [userId]] }
  ] } } }];
  if (counter) pipeline.push({ $set: { [counter]: { $size: `$${field}` } } });
  return Model.findOneAndUpdate(filter, pipeline, { new: true });
}

module.exports = { hasEventParticipation, isRegisteredAttendee, safeWebUrl, toggleSocialVote };
