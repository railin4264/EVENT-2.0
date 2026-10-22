const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const jwtService = require('../src/services/jwtService');
const { paymentsEnabled, getPublicConfig } = require('../src/config/features');
const { confirmedRegistrations, diversifyRecommendations } = require('../src/utils/recommendationRanking');
const { app } = require('../src/server');
let owner, other, ownerToken, otherToken;
const oldKey = process.env.STRIPE_SECRET_KEY, oldFlag = process.env.PAYMENTS_ENABLED;
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({})]);
  [owner, other] = await User.create(['owner', 'other'].map(name => ({ username: `business_${name}`, email: `${name}@business.test`, firstName: name, password: 'Password!2026', birthDate: '1990-01-01' })));
  ownerToken = jwtService.generateTokenPair(owner).accessToken; otherToken = jwtService.generateTokenPair(other).accessToken;
});
afterEach(() => { if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey;
  if (oldFlag === undefined) delete process.env.PAYMENTS_ENABLED; else process.env.PAYMENTS_ENABLED = oldFlag; });
const create = patch => Event.create({ title: 'Concierto del coro', description: 'Evento para probar promoción sin cobro automático', category: 'music', status: 'published', createdBy: owner._id,
  date: new Date(Date.now() + 86400000), location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Santo Domingo' }, ...patch });
const promote = (id, token = ownerToken, body = {}) => request(app).post(`/api/events/${id}/promotion-request`).set('Authorization', `Bearer ${token}`).send(body);

test('a flag alone cannot activate checkout without a configured gateway', () => {
  delete process.env.STRIPE_SECRET_KEY; process.env.PAYMENTS_ENABLED = 'true';
  expect(paymentsEnabled()).toBe(false); expect(getPublicConfig().mode).toBe('informational');
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_no_network';
  expect(paymentsEnabled()).toBe(true);
  process.env.PAYMENTS_ENABLED = 'false'; expect(paymentsEnabled()).toBe(false);
});
test('a promotion request persists once and never features an event or records a payment', async () => {
  const event = await create();
  const results = await Promise.all([promote(event.id, ownerToken, { note: 'Primera propuesta' }), promote(event.id, ownerToken, { note: 'Otra propuesta' })]);
  expect(results.map(r => r.status)).toEqual([200, 200]);
  const saved = await Event.findById(event.id);
  expect(saved.promotionRequest.requested).toBe(true);
  expect(saved.isFeatured).not.toBe(true);
  expect(saved.promotionRequest.note).toMatch(/propuesta/);
});
test.each([{ status: 'draft' }, { status: 'pending_review' }, { status: 'cancelled' }, { isPrivate: true }, { date: new Date(Date.now() - 3600000) }])('unavailable events cannot request promotion %p', async patch => {
  const event = await create(patch);
  expect((await promote(event.id)).status).toBe(400);
  expect((await Event.findById(event.id)).promotionRequest.requested).not.toBe(true);
});
test('promotion enforces ownership, valid identifiers and a bounded text note', async () => {
  const event = await create();
  expect((await promote(event.id, otherToken)).status).toBe(403);
  expect((await promote('not-an-id')).status).toBe(400);
  for (const note of [{ unexpected: true }, 'x'.repeat(301)]) expect((await promote(event.id, ownerToken, { note })).status).toBe(400);
});
test('recommendations do not count pending or duplicated registrations as confirmed popularity', () => {
  expect(confirmedRegistrations([{ user: 'a', status: 'confirmed' }, { user: { _id: 'a' }, status: 'attending' }, { user: 'b', status: 'pending' }, { user: 'c', status: 'not-attending' }])).toBe(1);
});
test('recommendations introduce other hosts before repeated hosts without mutating candidates', () => {
  const row = (id, host, score) => ({ ev: { _id: id, createdBy: host, date: new Date() }, score });
  const candidates = [row('a', 'host1', 100), row('b', 'host1', 90), row('c', 'host1', 80), row('d', 'host2', 70)];
  expect(diversifyRecommendations(candidates, 3).map(item => item.ev._id)).toEqual(['a', 'b', 'd']);
  expect(candidates.map(item => item.ev._id)).toEqual(['a', 'b', 'c', 'd']);
  expect(diversifyRecommendations(candidates.slice(0, 3), 5)).toHaveLength(3);
});
