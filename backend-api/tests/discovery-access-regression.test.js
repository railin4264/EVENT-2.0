const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../src/middleware/cache', () => ({ eventListCache: (req, res, next) => next(), eventDetailsCache: (req, res, next) => next(), invalidateCache: jest.fn() }));
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const jwtService = require('../src/services/jwtService');
const app = express();
app.use(express.json());
app.use('/api/events', require('../src/routes/discovery'));
app.use('/api/events', require('../src/routes/events'));
let owner, minor, adult, minorToken, adultToken;
const seed = overrides => Event.create({ title: 'Plan de prueba público', description: 'Descripción del plan de prueba aislado',
  category: 'music', createdBy: owner._id, date: new Date(Date.now() + 86400000),
  endDate: new Date(Date.now() + 90000000), status: 'published',
  location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Santo Domingo' },
  price: { amount: 0, currency: 'DOP' }, ...overrides });

beforeAll(async () => {
  [owner, minor, adult] = await User.create([['owner', 30], ['minor', 16], ['adult', 25]].map(([name, age]) => ({
    username: `discovery_${name}`, email: `${name}@discovery.example`, firstName: name, password: 'TestPassword1!',
    birthDate: new Date(new Date().getFullYear() - age, 0, 1)
  })));
  minorToken = jwtService.generateTokenPair(minor).accessToken;
  adultToken = jwtService.generateTokenPair(adult).accessToken;
});
beforeEach(async () => { await Event.deleteMany({}); });

test('guest feeds and roulette exclude private and age-gated records, including min-age-only records', async () => {
  await seed({ isPrivate: true, isFeatured: true });
  await seed({ ageRestriction: { minAge: 18 }, isFeatured: true });
  const allowed = await seed({ likes: [adult._id] });
  for (const path of ['', '/featured', '/trending']) {
    const res = await request(app).get(`/api/events${path}`);
    expect(res.status).toBe(200);
    expect((res.body.events || res.body.data).map(event => event._id)).toEqual([allowed.id]);
  }
  const spin = await request(app).get('/api/events/roulette');
  expect(spin.status).toBe(200);
  expect(spin.body.data.event._id).toBe(allowed.id);
  expect(spin.headers['cache-control']).toBe('private, no-store');
});

test('minors respect both minimum and maximum ages in featured discovery', async () => {
  await seed({ ageRestriction: { minAge: 17 }, isFeatured: true });
  await seed({ ageRestriction: { maxAge: 12 }, isFeatured: true });
  await seed({ ageRestriction: { isAdultOnly: true }, isFeatured: true });
  const allowed = await seed({ ageRestriction: { minAge: 13, maxAge: 17 } });
  const res = await request(app).get('/api/events/featured').set('Authorization', `Bearer ${minorToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.map(event => event._id)).toEqual([allowed.id]);
});

test('a legacy account without a birth date cannot bypass detail age checks', async () => {
  const legacy = await User.create({ username: 'legacy_no_birth', email: 'legacy@discovery.example', firstName: 'Legacy', password: 'TestPassword1!' });
  const token = jwtService.generateTokenPair(legacy).accessToken;
  for (const ageRestriction of [{ minAge: 18 }, { isAdultOnly: true }, { maxAge: 15 }]) {
    const event = await seed({ ageRestriction });
    const res = await request(app).get(`/api/events/${event.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  }
});

test('roulette preserves budget and category instead of silently widening a failed search', async () => {
  await seed({ price: { amount: 500, currency: 'DOP' } });
  expect((await request(app).get('/api/events/roulette?budget=free')).status).toBe(404);
  expect((await request(app).get('/api/events/roulette?vibe=food')).status).toBe(404);
  expect((await request(app).get('/api/events/roulette?maxPrice=100')).status).toBe(404);
});

test('roulette does not compare foreign currency prices against a DOP budget', async () => {
  await seed({ price: { amount: 10, currency: 'USD' } });
  expect((await request(app).get('/api/events/roulette?maxPrice=100')).status).toBe(404);
});

test('roulette only claims duration compatibility when the event has a known matching duration', async () => {
  await seed({ endDate: null });
  expect((await request(app).get('/api/events/roulette?durationHours=2')).status).toBe(404);
  await seed();
  const res = await request(app).get('/api/events/roulette?durationHours=2');
  expect(res.status).toBe(200);
  expect(res.body.data.funFact).toBeUndefined();
});

test.each(['lat=91&lng=0', 'lat=0', 'radius=-1', 'maxPrice=-2', 'durationHours=NaN'])('invalid roulette parameters return a recoverable 400: %s', async params => {
  expect((await request(app).get(`/api/events/roulette?${params}`)).status).toBe(400);
});

test('detail and both attendance endpoints enforce private event access', async () => {
  const event = await seed({ isPrivate: true });
  expect((await request(app).get(`/api/events/${event.id}`)).status).toBe(403);
  for (const path of ['join', 'attend']) {
    const res = await request(app).post(`/api/events/${event.id}/${path}`).set('Authorization', `Bearer ${adultToken}`);
    expect(res.status).toBe(403);
  }
  expect((await Event.findById(event._id)).attendees).toHaveLength(0);
});

test('both attendance endpoints reject age mismatch and allow a public free event', async () => {
  const event = await seed({ ageRestriction: { minAge: 18 } });
  for (const path of ['join', 'attend']) {
    expect((await request(app).post(`/api/events/${event.id}/${path}`).set('Authorization', `Bearer ${minorToken}`)).status).toBe(403);
  }
  const res = await request(app).post(`/api/events/${event.id}/join`).set('Authorization', `Bearer ${adultToken}`);
  expect(res.status).toBe(200);
  expect((await Event.findById(event._id)).attendees).toHaveLength(1);
});
