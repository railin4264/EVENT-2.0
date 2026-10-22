const Order = require('../models/Order');
const idOf = value => String(value?._id || value || '');
const publicEvent = event => Boolean(event && !event.isPrivate && !event.isSecretLocation && ['published', 'completed', 'expired'].includes(event.status));
const validCheckIn = (value, now) => Boolean(value && Number.isFinite(new Date(value).getTime()) && new Date(value) <= now);

async function verifiedAttendance(event, userId, now = new Date()) {
  if (!publicEvent(event) || !Number.isFinite(new Date(event.date).getTime()) || new Date(event.date) > now || idOf(event.createdBy) === idOf(userId)) return false;
  if ((event.attendees || []).some(row => idOf(row.user) === idOf(userId) && ['confirmed', 'attending'].includes(row.status) && validCheckIn(row.checkedInAt, now))) return true;
  return Boolean(await Order.exists({ eventId: event._id, userId, status: { $in: ['confirmed', 'completed'] }, paymentStatus: 'succeeded',
    items: { $elemMatch: { checkedInAt: { $type: 'date', $lte: now } } } }));
}

const publicFilter = { isPrivate: { $ne: true }, isSecretLocation: { $ne: true }, status: { $in: ['published', 'completed', 'expired', 'cancelled'] } };
module.exports = { verifiedAttendance, publicEvent, publicFilter };
