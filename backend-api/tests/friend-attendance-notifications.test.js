const User = require('../src/models/User');
const Follow = require('../src/models/Follow');
const Event = require('../src/models/Event');
const Notification = require('../src/models/Notification');
const { settingsUpdate } = require('../src/utils/settingsUpdate');
const mockPush = jest.fn().mockResolvedValue(undefined);
const mockRealtime = jest.fn();
jest.mock('../src/services/notificationService', () => jest.fn().mockImplementation(() => ({ sendPushNotification: mockPush, sendRealTimeNotification: mockRealtime })));
const { notifyFriendsOfAttendance } = require('../src/services/friendAttendanceNotifications');

let actor, friend, event;
const now = Date.UTC(2026, 9, 19, 14);
beforeAll(async () => { await Notification.init(); });
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Follow.deleteMany({}), Event.deleteMany({}), Notification.deleteMany({})]);
  mockPush.mockClear(); mockRealtime.mockClear();
  [actor, friend] = await User.create(['actor', 'friend'].map(name => ({ username: `plans_${name}`, email: `${name}@plans.test`, firstName: name,
    password: 'Password!2026', birthDate: '1990-01-01', settings: { notifications: { shareAttendance: true, friendPlans: true } } })));
  await Follow.create([{ follower: actor._id, following: friend._id }, { follower: friend._id, following: actor._id }]);
  event = await Event.create({ title: 'Plan público', description: 'Plan para validar consentimiento social', category: 'music', date: new Date(now + 3600000),
    createdBy: actor._id, status: 'published', location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Lugar público' },
    attendees: [{ user: actor._id, status: 'confirmed' }] });
});

test('both social choices default off and only booleans are writable', async () => {
  const user = new User({ username: 'defaults', email: 'default@test.test' });
  expect(user.settings.notifications.friendPlans).toBe(false);
  expect(user.settings.notifications.shareAttendance).toBe(false);
  expect(settingsUpdate({ notifications: { friendPlans: true, shareAttendance: false } })).toMatchObject({
    'settings.notifications.friendPlans': true, 'settings.notifications.shareAttendance': false });
  expect(() => settingsUpdate({ notifications: { friendPlans: 'true' } })).toThrow();
});
test('mutual friends receive an in-app plan only after both opt in, without implicit push', async () => {
  expect(await notifyFriendsOfAttendance(event, actor.id, null, now)).toBe(1);
  const notification = await Notification.findOne({ recipient: friend._id });
  expect(notification.data).toMatchObject({ action: 'friend_attending', eventId: event.id });
  expect(notification.actionUrl).toBe(`/events/${event.id}`);
  expect(mockRealtime).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
});
test('repeat and concurrent RSVP deliveries produce one alert per recipient per UTC day', async () => {
  await Promise.all(Array.from({ length: 6 }, () => notifyFriendsOfAttendance(event, actor.id, null, now)));
  expect(await Notification.countDocuments()).toBe(1);
  expect(mockRealtime).toHaveBeenCalledTimes(1);
  const other = event.toObject(); other._id = new (require('mongoose').Types.ObjectId)();
  await notifyFriendsOfAttendance(other, actor.id, null, now);
  expect(await Notification.countDocuments()).toBe(1);
});
test.each(['shareAttendance', 'showAttendedEvents', 'showProfile'])('sender choice %s prevents all delivery', async key => {
  const section = key === 'shareAttendance' ? 'notifications' : 'privacy';
  await User.updateOne({ _id: actor._id }, { $set: { [`settings.${section}.${key}`]: false } });
  expect(await notifyFriendsOfAttendance(event, actor.id, null, now)).toBe(0);
  expect(await Notification.countDocuments()).toBe(0);
});
test('recipient opt-out, one-way, pending and blocked relationships are excluded', async () => {
  await User.updateOne({ _id: friend._id }, { $set: { 'settings.notifications.friendPlans': false } });
  expect(await notifyFriendsOfAttendance(event, actor.id, null, now)).toBe(0);
  await User.updateOne({ _id: friend._id }, { $set: { 'settings.notifications.friendPlans': true } });
  for (const status of ['pending', 'blocked']) {
    await Follow.updateOne({ follower: actor._id }, { $set: { status } });
    expect(await notifyFriendsOfAttendance(event, actor.id, null, now)).toBe(0);
  }
  await Follow.deleteOne({ follower: actor._id });
  expect(await notifyFriendsOfAttendance(event, actor.id, null, now)).toBe(0);
});
test.each([{ isPrivate: true }, { isSecretLocation: true }, { status: 'pending' }, { status: 'cancelled' }, { endDate: new Date(now) }, { attendees: [{ user: 'someone', status: 'pending' }] }])('excludes unavailable or unconfirmed event %p', async patch => {
  expect(await notifyFriendsOfAttendance({ ...event.toObject(), ...patch }, actor.id, null, now)).toBe(0);
  expect(await Notification.countDocuments()).toBe(0);
});
test('age restrictions and hidden categories protect recipients', async () => {
  event.ageRestriction = { minAge: 99 };
  expect(await notifyFriendsOfAttendance(event, actor.id, null, now)).toBe(0);
  event.ageRestriction = {};
  await User.updateOne({ _id: friend._id }, { $set: { 'settings.preferences.hiddenCategories': ['music'] } });
  expect(await notifyFriendsOfAttendance(event, actor.id, null, now)).toBe(0);
});
test('push requires channel consent and respects the social category', async () => {
  await User.updateOne({ _id: friend._id }, { $set: { 'settings.notifications.push': true, 'notificationSettings.pushEnabled': true, 'notificationSettings.categories.social': false } });
  await notifyFriendsOfAttendance(event, actor.id, null, now);
  expect(mockPush).not.toHaveBeenCalled();
  await User.updateOne({ _id: friend._id }, { $set: { 'notificationSettings.categories.social': true } });
  await notifyFriendsOfAttendance(event, actor.id, null, now + 86400000 - 1);
  // The event has ended, so enabling push cannot revive it.
  expect(mockPush).not.toHaveBeenCalled();
  event.date = new Date(now + 3 * 86400000);
  await notifyFriendsOfAttendance(event, actor.id, null, now + 86400000);
  expect(mockPush).toHaveBeenCalledTimes(1);
});
