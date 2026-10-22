const User = require('../models/User');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const NotificationService = require('./notificationService');
const { ageIsAllowed } = require('../utils/eventVisibility');

// Pilot guardrails: mutual relationships only, at most 50 candidates per RSVP,
// and one social plan alert per recipient per UTC day, enforced by a unique key.
const MAX_FRIEND_ALERTS = 50;
function eligibleEvent(event, now) {
  return event?.status === 'published' && event.isPrivate !== true && event.isSecretLocation !== true &&
    new Date(event.endDate || event.date).getTime() > now;
}
function acceptsCategory(user, event) {
  const p = user.settings?.preferences || {};
  return !(p.hidePolitical && event.category === 'politics') && !(p.hideReligious && event.category === 'religion') &&
    !(p.hideAdultOnly && event.ageRestriction?.isAdultOnly) && !(p.hiddenCategories || []).includes(event.category) &&
    (p.contentFilterMode !== 'whitelist' || (p.preferredCategories || []).includes(event.category));
}

async function notifyFriendsOfAttendance(event, actorId, io, now = Date.now()) {
  if (!eligibleEvent(event, now)) return 0;
  const actor = await User.findById(actorId).select('firstName username isActive isPrivate settings');
  if (!actor?.isActive || actor.isPrivate || actor.settings?.privacy?.showProfile !== true ||
    actor.settings?.privacy?.showAttendedEvents !== true || actor.settings?.notifications?.shareAttendance !== true) return 0;
  if (!(event.attendees || []).some(a => String(a.user?._id || a.user) === String(actorId) && ['attending', 'confirmed'].includes(a.status))) return 0;

  const candidates = await Follow.aggregate([
    { $match: { following: actor._id, status: 'accepted' } },
    { $sort: { acceptedAt: -1, _id: -1 } },
    { $lookup: { from: Follow.collection.name, let: { friend: '$follower' }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$follower', actor._id] }, { $eq: ['$following', '$$friend'] }, { $eq: ['$status', 'accepted'] }] } } },
      { $project: { _id: 1 } }
    ], as: 'reciprocal' } },
    { $match: { 'reciprocal.0': { $exists: true } } },
    { $limit: MAX_FRIEND_ALERTS },
    { $project: { follower: 1 } }
  ]);
  const friends = await User.find({ _id: { $in: candidates.map(c => c.follower), $ne: actor._id }, isActive: true,
    'settings.notifications.friendPlans': true }).select('birthDate settings notificationSettings');
  const service = new NotificationService(io);
  const day = new Date(now).toISOString().slice(0, 10);
  const name = String(actor.firstName || actor.username || 'Tu amigo').slice(0, 60);
  const title = String(event.title || 'un evento').slice(0, 180);
  const results = await Promise.all(friends.map(async friend => {
    if (!ageIsAllowed(event, friend) || !acceptsCategory(friend, event)) return 0;
    const deliveryKey = `friend-plan:${friend.id}:${day}`;
    const data = { recipient: friend._id, sender: actor._id, type: 'event_update',
      title: 'Un plan con tu gente', message: `${name} confirmó asistencia a «${title}».`,
      data: { eventId: String(event._id), action: 'friend_attending' }, actionUrl: `/events/${event._id}`,
      priority: 'normal', deliveryKey, expiresAt: new Date(Math.max(now + 86400000, new Date(event.endDate || event.date).getTime())) };
    let result;
    try { result = await Notification.updateOne({ deliveryKey }, { $setOnInsert: data }, { upsert: true, runValidators: true }); }
    catch (error) { if (error.code === 11000) return 0; throw error; }
    if (!result.upsertedCount) return 0;
    const notification = await Notification.findOne({ deliveryKey });
    service.sendRealTimeNotification(notification);
    if (friend.settings?.notifications?.push === true && friend.notificationSettings?.pushEnabled === true &&
      friend.notificationSettings?.categories?.social !== false) await service.sendPushNotification(notification);
    return 1;
  }));
  return results.reduce((sum, value) => sum + value, 0);
}

module.exports = { notifyFriendsOfAttendance, eligibleEvent, MAX_FRIEND_ALERTS };
