const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const jwt = require('../src/services/jwtService');
const NotificationService = require('../src/services/notificationService');
const recommendationService = require('../src/services/AIRecommendationService');
const { app } = require('../src/server');
let owner, token;
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({})]);
  owner = await User.create({ username: 'release_auditor', firstName: 'Auditor', email: 'audit@example.test', password: 'AuditOnly!2026', birthDate: '1990-01-01' });
  token = jwt.generateTokenPair(owner).accessToken;
});
const activity = (extra = {}) => Event.create({ title: 'Actividad de auditoría', description: 'Una actividad de prueba aislada', category: 'music', createdBy: owner._id, status: 'published', date: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'AUDIT_PRIVATE_EXACT_ADDRESS', city: 'Santo Domingo' }, ...extra });
test('public legacy recommendations endpoint must return a usable response', async () => {
  const response = await request(app).get('/api/events/recommendations');
  expect(response.status).toBe(200);
});
test('public recommendations enforce radius, field privacy and strict coordinate validation', async () => {
  const near = await activity({ isSecretLocation: true });
  await activity({ location: { type: 'Point', coordinates: [-69.8, 18.4], address: 'Outside selected radius' } });
  const response = await request(app).get('/api/events/recommendations?lat=18.4&lng=-69.9&radius=5');
  expect(response.status).toBe(200);
  expect(response.body.events.map(event => event._id)).toEqual([String(near._id)]);
  expect(JSON.stringify(response.body)).not.toContain('AUDIT_PRIVATE_EXACT_ADDRESS');
  expect(response.body.events[0].attendees).toBeUndefined();
  expect(response.body.events[0].distanceKm).toBeNull();
  expect(response.body.events[0].location.coordinates).toBeUndefined();
  expect((await request(app).get('/api/events/recommendations?lat=Infinity&lng=0')).status).toBe(400);
  expect((await request(app).get('/api/events/recommendations?limit=100000')).status).toBe(400);
});
test('legacy recommendation service must not expose a secret exact address', async () => {
  await activity({ isSecretLocation: true });
  const result = await recommendationService.getRuleBasedEventRecommendations({ _id: '000000000000000000000000', interests: [] });
  expect(JSON.stringify(result)).not.toContain('AUDIT_PRIVATE_EXACT_ADDRESS');
});
test('legacy recommendation service must exclude an age-restricted activity for a guest', async () => {
  const event = await activity({ ageRestriction: { minAge: 90 } });
  const result = await recommendationService.getRuleBasedEventRecommendations({ _id: '000000000000000000000000', interests: [] });
  expect(result.map(item => String(item._id))).not.toContain(String(event._id));
});
test('notification preferences must survive a successful write and reread', async () => {
  const changed = await request(app).put('/api/notifications/preferences').set('Authorization', `Bearer ${token}`).send({ push: { events: false } });
  expect(changed.status).toBe(200);
  const response = await request(app).get('/api/notifications/preferences').set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(200);
  expect(response.body.data.push.events).toBe(false);
});
test('real-time notification must match the root document expected by the active mobile receiver', async () => {
  const emit = jest.fn(), service = new NotificationService({ to: () => ({ emit }) });
  service.updateUnreadCount = jest.fn();
  await service.sendRealTimeNotification({ recipient: owner._id, toObject: () => ({ _id: 'notification', title: 'Aviso de auditoría', message: 'Texto', read: false }) });
  const payload = emit.mock.calls.find(call => call[0] === 'newNotification')[1];
  expect(payload.title).toBe('Aviso de auditoría');
  expect(payload._id).toBe('notification');
});

test('in-app opt-out also hides events from the list, badge and live delivery', async () => {
  await request(app).put('/api/notifications/preferences').set('Authorization', `Bearer ${token}`).send({ inApp: { events: false } });
  const notification = await require('../src/models/Notification').create({ recipient: owner._id, type: 'event_reminder', title: 'Recordatorio', message: 'Prueba' });
  const response = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
  expect(response.body.data.notifications).toEqual([]);
  expect(response.body.data.unreadCount).toBe(0);
  const badge = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${token}`);
  expect(badge.body.data.unreadCount).toBe(0);
  const emit = jest.fn(), service = new NotificationService({ to: () => ({ emit }) });
  await service.sendRealTimeNotification(notification);
  expect(emit).not.toHaveBeenCalled();
});

test('pending attendance never reveals a secret address in the event detail', async () => {
  const guest = await User.create({ username: 'pending_guest', firstName: 'Guest', email: 'pending@example.test', password: 'AuditOnly!2026', birthDate: '1990-01-01' });
  const event = await activity({ isSecretLocation: true, attendees: [{ user: guest._id, status: 'pending' }] });
  const guestToken = jwt.generateTokenPair(guest).accessToken;
  const pending = await request(app).get(`/api/events/${event._id}`).set('Authorization', `Bearer ${guestToken}`);
  expect(pending.status).toBe(200);
  expect(JSON.stringify(pending.body)).not.toContain('AUDIT_PRIVATE_EXACT_ADDRESS');
  await Event.updateOne({ _id: event._id }, { $set: { 'attendees.0.status': 'confirmed' } });
  const confirmed = await request(app).get(`/api/events/${event._id}`).set('Authorization', `Bearer ${guestToken}`);
  expect(JSON.stringify(confirmed.body)).toContain('AUDIT_PRIVATE_EXACT_ADDRESS');
});
