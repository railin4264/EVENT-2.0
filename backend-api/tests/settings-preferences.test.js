const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const jwtService = require('../src/services/jwtService');
const { app } = require('../src/server');
let user, token;
beforeEach(async () => {
  await User.deleteMany({});
  user = await User.create({ username: 'preferences_tester', email: 'prefs@example.test', firstName: 'Prueba', password: 'Password!2026', birthDate: '1990-01-01' });
  token = jwtService.generateTokenPair(user).accessToken;
});
const put = (path, data) => request(app).put(path).set('Authorization', `Bearer ${token}`).send(data);

test('new accounts do not opt into email or push and reading settings does not enable them', async () => {
  expect(user.settings.notifications.email).toBe(false);
  expect(user.settings.notifications.push).toBe(false);
  expect(user.notificationSettings.emailEnabled).toBe(false);
  expect(user.notificationSettings.pushEnabled).toBe(false);
  const response = await request(app).get('/api/users/me/settings').set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(200);
  expect(response.body.settings.notifications).toMatchObject({ email: false, push: false });
});

test('a partial theme update preserves notification choices, privacy and other preferences', async () => {
  await User.updateOne({ _id: user._id }, { $set: { 'settings.notifications.push': true, 'settings.notifications.weeklyDigest': true, 'settings.privacy.showLocation': true, 'settings.preferences.language': 'en', 'settings.preferences.hiddenCategories': ['politics'] } });
  const response = await put('/api/users/me/settings', { preferences: { theme: 'dark' } });
  expect(response.status).toBe(200);
  expect(response.body.settings).toMatchObject({ notifications: { push: true, weeklyDigest: true }, privacy: { showLocation: true }, preferences: { theme: 'dark', language: 'en', hiddenCategories: ['politics'] } });
});

test('the settings alias patches individual fields and synchronizes notification delivery flags', async () => {
  const response = await put(`/api/users/${user._id}/settings`, { notifications: { email: true } });
  expect(response.status).toBe(200);
  const saved = await User.findById(user._id);
  expect(saved.settings.notifications.email).toBe(true);
  expect(saved.notificationSettings.emailEnabled).toBe(true);
  expect(saved.settings.notifications.push).toBe(false);
  expect(saved.settings.privacy.showLocation).toBe(false);
});

test('independent concurrent settings changes do not overwrite each other', async () => {
  const responses = await Promise.all([put('/api/users/me/settings', { preferences: { language: 'en' } }), put('/api/users/me/notifications', { eventReminders: false })]);
  expect(responses.map(r => r.status)).toEqual([200, 200]);
  const saved = await User.findById(user._id);
  expect(saved.settings.preferences.language).toBe('en');
  expect(saved.settings.notifications.eventReminders).toBe(false);
  expect(saved.settings.notifications.email).toBe(false);
});

test('invalid booleans, malformed sections and unsupported settings cannot silently mutate preferences', async () => {
  for (const [path, body] of [['/api/users/me/notifications', { push: 'false' }], ['/api/users/me/settings', { privacy: [] }], ['/api/users/me/settings', { preferences: { theme: 'unknown' } }], ['/api/users/me/settings', { role: 'admin' }]]) {
    expect((await put(path, body)).status).toBe(400);
  }
  const saved = await User.findById(user._id);
  expect(saved.role).toBe('user');
  expect(saved.settings.notifications.push).toBe(false);
  expect(saved.settings.preferences.theme).toBe('system');
});

test('settings alias cannot modify another account', async () => {
  expect((await put('/api/users/507f1f77bcf86cd799439011/settings', { notifications: { push: true } })).status).toBe(403);
});

test('hidden profiles disappear from discovery and direct profile views but remain accessible to the owner', async () => {
  await put('/api/users/me/settings', { privacy: { showProfile: false } });
  const viewer = await User.create({ username: 'privacy_viewer', email: 'privacy-viewer@test.test', firstName: 'Viewer', password: 'Password!2026' });
  const viewerToken = jwtService.generateTokenPair(viewer).accessToken;
  const get = path => request(app).get(path).set('Authorization', `Bearer ${viewerToken}`);
  expect((await get(`/api/users/profile/${user.id}`)).status).toBe(404);
  const list = await get('/api/users');
  expect(list.body.users.some(item => item._id === user.id)).toBe(false);
  expect((await request(app).get('/api/users/profile').set('Authorization', `Bearer ${token}`)).status).toBe(200);
});
