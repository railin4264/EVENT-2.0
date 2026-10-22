const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { app } = require('../src/server');
const jwtService = require('../src/services/jwtService');
const { summarizeAttendance } = require('../src/utils/attendanceSummary');

let owner, visible, hidden, event;
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({})]);
  [owner, visible, hidden] = await User.create(['owner', 'visible', 'hidden'].map(name => ({
    username: `faces_${name}`, firstName: name, email: `${name}@faces.test`, password: 'Password!2026', birthDate: '1990-01-01',
    ...(name === 'hidden' ? { settings: { privacy: { showAttendedEvents: false } } } : {})
  })));
  event = await Event.create({ title: 'Coro con privacidad', description: 'Confirmaciones visibles con privacidad', category: 'music', createdBy: owner._id,
    date: new Date(Date.now() + 86400000), location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Santo Domingo' },
    attendees: [{ user: visible._id, status: 'attending' }, { user: visible._id, status: 'confirmed' },
      { user: hidden._id, status: 'confirmed' }, { user: owner._id, status: 'pending' }] });
});
const get = (path, token) => { const req = request(app).get(path); return token ? req.set('Authorization', `Bearer ${token}`) : req; };
test.each(['', '/attendees'])('only public confirmed profiles reach clients at %s', async suffix => {
  const response = await get(`/api/events/${event.id}${suffix}`);
  expect(response.status).toBe(200);
  const data = suffix ? response.body : response.body.event;
  expect(data.attendanceSummary).toMatchObject({ confirmedCount: 2, hiddenCount: 1, visibleAttendees: [{ id: visible.id, firstName: 'visible' }] });
  expect(JSON.stringify(data.attendees)).not.toContain(hidden.id);
  expect(JSON.stringify(data.attendees)).not.toContain('showAttendedEvents');
  expect(response.headers['cache-control']).toBe('private, no-store');
});
test('public event lists preserve the total without exposing hidden attendance', async () => {
  const response = await get('/api/events');
  expect(response.status).toBe(200);
  const data = response.body.events.find(row => row._id === event.id);
  expect(data.attendanceSummary.confirmedCount).toBe(2);
  expect(JSON.stringify(data.attendees)).not.toContain(hidden.id);
});
test('privacy changes are reflected on the next anonymous detail request', async () => {
  await get(`/api/events/${event.id}`);
  await User.updateOne({ _id: visible._id }, { $set: { isPrivate: true } });
  const response = await get(`/api/events/${event.id}`);
  expect(response.body.event.attendanceSummary.visibleAttendees).toEqual([]);
  expect(response.body.event.attendanceSummary.confirmedCount).toBe(2);
});
test.each(['draft', 'pending_review'])('review content and attendance are not public: %s', async status => {
  await Event.updateOne({ _id: event._id }, { $set: { status } });
  for (const suffix of ['', '/attendees']) expect((await get(`/api/events/${event.id}${suffix}`)).status).toBe(404);
  const token = jwtService.generateTokenPair(owner).accessToken;
  expect((await get(`/api/events/${event.id}`, token)).status).toBe(200);
});
test('private attendance endpoint checks participation and age', async () => {
  await Event.updateOne({ _id: event._id }, { $set: { isPrivate: true } });
  expect((await get(`/api/events/${event.id}/attendees`)).status).toBe(403);
  await Event.updateOne({ _id: event._id }, { $set: { isPrivate: false, 'ageRestriction.minAge': 18 } });
  expect((await get(`/api/events/${event.id}/attendees`)).status).toBe(403);
});
test('solo attendees respect public profiles and private event access', async () => {
  await Event.updateOne({ _id: event._id }, { $set: { 'attendees.$[].isSolo': true } });
  const response = await get(`/api/events/${event.id}/solo-attendees`);
  expect(response.status).toBe(200);
  expect(response.body.data.attendees).toHaveLength(1);
  expect(response.body.data.attendees[0]._id).toBe(visible.id);
  await Event.updateOne({ _id: event._id }, { $set: { isPrivate: true } });
  expect((await get(`/api/events/${event.id}/solo-attendees`)).status).toBe(403);
});
test('summary is bounded, deduplicated, and does not treat missing privacy as consent', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ status: 'confirmed', user: { _id: String(i), firstName: `Persona ${i}`,
    isActive: true, settings: { privacy: { showProfile: true, showAttendedEvents: true } } } }));
  rows.push({ user: { _id: 'unknown' }, status: 'confirmed' });
  expect(summarizeAttendance(rows)).toMatchObject({ confirmedCount: 21, hiddenCount: 9 });
  expect(summarizeAttendance(rows).visibleAttendees).toHaveLength(12);
});
