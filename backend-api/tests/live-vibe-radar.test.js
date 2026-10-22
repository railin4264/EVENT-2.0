const express = require('express');
const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../src/middleware/cache', () => ({ invalidateCache: jest.fn() }));
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const jwt = require('../src/services/jwtService');
const { summarizeVibe } = require('../src/utils/liveVibe');
const app = express(); app.use(express.json()); app.use('/api/events', require('../src/routes/events'));
let owner, person, token;
const seed = extra => Event.create({ title: 'Actividad pública en curso', description: 'Descripción de actividad pública en curso.',
  category: 'music', createdBy: owner._id, date: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000),
  status: 'published', location: { type: 'Point', coordinates: [-73.98, 40.75], address: 'New York', city: 'New York', country: 'Estados Unidos', countryCode: 'US' },
  price: { amount: 0, currency: 'USD' }, ...extra });
beforeAll(async () => {
  [owner, person] = await User.create(['radarowner', 'radarperson'].map(username => ({ username, email: `${username}@example.test`, password: 'Password2026!', firstName: username, birthDate: new Date('1990-01-01') })));
  token = jwt.generateTokenPair(person).accessToken;
});
beforeEach(async () => Event.deleteMany({}));

test('only current public sessions with known end times enter the country/city/geo scoped radar', async () => {
  const live = await seed({});
  await seed({ isPrivate: true }); await seed({ isSecretLocation: true }); await seed({ ageRestriction: { minAge: 18 } });
  await seed({ date: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000) });
  await seed({ endDate: null, isRecurring: true }); await seed({ endDate: new Date(Date.now() - 1000) });
  const response = await request(app).get('/api/events/radar/live?countryCode=US&city=New%20York');
  expect(response.status).toBe(200); expect(response.body.data.map(row => row._id)).toEqual([live.id]);
  expect(response.body.data[0].vibeRadar).toMatchObject({ currentVibe: 'none', reportsCount: 0 });
  expect(response.body.data[0]).not.toHaveProperty('heatScore');
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect((await request(app).get('/api/events/radar/live?countryCode=DO')).body.data).toEqual([]);
  expect((await request(app).get('/api/events/radar/live?lat=18.5&lng=-69.9&radius=30')).body.data).toEqual([]);
  expect((await request(app).get('/api/events/radar/live?lat=91&lng=0')).status).toBe(400);
});

test('legacy counters, duplicate ballots, future reports and expired reports cannot manufacture a vibe', () => {
  const now = Date.now(), user = String(person._id);
  const summary = summarizeVibe({ status: 'published', date: new Date(now - 1000), endDate: new Date(now + 10000),
    vibeRadar: { currentVibe: 'lit', reportsCount: 999, counts: { lit: 999 }, recentReports: [
      { user, vibe: 'chill', reportedAt: new Date(now - 1000) }, { user, vibe: 'lit', reportedAt: new Date(now - 5000) },
      { user: 'expired', vibe: 'lit', reportedAt: new Date(now - 3 * 3600000) },
      { user: 'future', vibe: 'lit', reportedAt: new Date(now + 10000) }
    ] } }, now);
  expect(summary).toMatchObject({ reportsCount: 1, currentVibe: 'chill', counts: { lit: 0, chill: 1 } });
  expect(summary).not.toHaveProperty('recentReports');
});

test('reports require participation and a live session; repeated/concurrent reports replace one ballot', async () => {
  const event = await seed({});
  const report = vibe => request(app).post(`/api/events/${event.id}/vibe`).set('Authorization', `Bearer ${token}`).send({ vibe });
  expect((await report('lit')).status).toBe(403);
  await Event.updateOne({ _id: event._id }, { $push: { attendees: { user: person._id, status: 'confirmed' } } });
  const responses = await Promise.all([report('lit'), report('chill'), report('chill')]);
  expect(responses.map(response => response.status)).toEqual([200, 200, 200]);
  const saved = await Event.findById(event.id);
  expect(saved.vibeRadar.recentReports).toHaveLength(1);
  expect(summarizeVibe(saved).reportsCount).toBe(1);
  expect((await report('promo_active')).status).toBe(400);
  await Event.updateOne({ _id: event._id }, { $set: { date: new Date(Date.now() + 10000) } });
  expect((await report('lit')).status).toBe(409);
});

test('private reports do not leak identities, comments or availability to outsiders', async () => {
  const event = await seed({ isPrivate: true });
  expect((await request(app).get(`/api/events/${event.id}/vibe`)).status).toBe(404);
  expect((await request(app).get('/api/events/not-an-id/vibe')).status).toBe(400);
});
