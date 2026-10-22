const { ideaExpired } = require('./ideaLifetime');
const { ageIsAllowed } = require('./eventVisibility');
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const idOf = value => String(value?._id || value || '');
const confirmed = (target, user) => !!user && (target.attendees || []).some(row => idOf(row.user) === idOf(user) && ['attending', 'confirmed'].includes(row.status));
const ended = (target, now = Date.now()) => new Date(target.endDate || target.date).getTime() <= now;
const ownerOf = (target, user) => !!user && (user.role === 'admin' || idOf(target.createdBy) === idOf(user));
function permission(scope, target, user, now = Date.now(), registered = false) {
  if (!target) return { visible: false };
  const canManage = ownerOf(target, user);
  if (scope === 'ideas') return { visible: ['open', 'launched'].includes(target.status) || canManage, canManage, canShareCall: target.status === 'open' && !ideaExpired(target, now), canContribute: target.status === 'open' && !ideaExpired(target, now), canRepeat: false, meetupActive: false };
  const participant = confirmed(target, user) || (!!user && registered === true);
  const restricted = target.isPrivate || target.isSecretLocation || ['private', 'secret'].includes(target.visibility);
  const visible = (['published', 'completed', 'expired'].includes(target.status) || canManage) && (canManage || (ageIsAllowed(target, user) && (!restricted || participant)));
  return { visible, canManage, canShareCall: target.status === 'published' && !ended(target, now) && !restricted, canContribute: target.status === 'published' && !ended(target, now), canRepeat: ['published', 'completed', 'expired'].includes(target.status) && ended(target, now) && participant, meetupActive: target.status === 'published' && !ended(target, now), expiresAt: target.endDate || target.date, confirmed: participant };
}
function repeatDays(value) {
  if (!Array.isArray(value) || value.length > 7 || value.some(day => !DAYS.includes(day))) throw new Error('Elige días válidos');
  return [...new Set(value)];
}
function serialize(doc, access, user) {
  const identity = idOf(user), manager = access.canManage;
  const votes = new Map((doc?.repeatVotes || []).map(vote => [idOf(vote.user), vote]));
  const participants = new Map((doc?.meetup?.participants || []).map(row => [idOf(row.user), row]));
  const joined = participants.has(identity), ownVote = votes.get(identity);
  return {
    canManage: !!manager, canShareCall: !!access.canShareCall, canContribute: !!access.canContribute, canRepeat: !!access.canRepeat,
    roles: (doc?.roles || []).map(role => ({ id: idOf(role), title: role.title, slots: role.slots, closed: !!role.closed,
      acceptedCount: role.offers.filter(offer => offer.status === 'accepted').length,
      offers: role.offers.filter(offer => manager || idOf(offer.user) === identity).map(offer => ({ userId: idOf(offer.user), name: offer.name || 'Colaborador', note: offer.note, status: offer.status })) })),
    repeat: { interestedCount: votes.size, interested: !!ownVote, days: ownVote?.days || [], dayCounts: Object.fromEntries(DAYS.map(day => [day, [...votes.values()].filter(vote => vote.days.includes(day)).length])) },
    meetup: access.meetupActive && doc?.meetup?.place ? { place: doc.meetup.place, time: doc.meetup.time, expiresAt: access.expiresAt, joined, participantCount: participants.size, names: joined || manager ? [...participants.values()].filter(row => row.shareName === true).map(row => row.name) : [] } : null,
    canSetMeetup: !!manager && !!access.meetupActive, canJoinMeetup: !!access.meetupActive && (!!access.confirmed || !!manager) && (!doc?.meetup?.time || new Date(doc.meetup.time).getTime() > Date.now())
  };
}
module.exports = { DAYS, idOf, confirmed, ended, ownerOf, permission, repeatDays, serialize };
