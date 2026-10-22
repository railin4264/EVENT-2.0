const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Supplier = require('../src/models/Supplier');
const Wallet = require('../src/models/Wallet');
const Transaction = require('../src/models/Transaction');
const jwt = require('../src/services/jwtService');
const telegram = require('../src/services/telegramBotService');
const app = express(); app.use(express.json());
app.use('/suppliers', require('../src/routes/suppliers'));
app.use('/wallet', require('../src/routes/wallet'));
app.use('/ai', require('../src/routes/ai'));
app.use('/analytics', require('../src/routes/analytics'));
app.use('/telegram', require('../src/routes/telegram'));
app.use('/search', require('../src/routes/search'));
let owner, other, token;
const get = path => request(app).get(path).set('Authorization', `Bearer ${token}`);
const post = (path, data) => request(app).post(path).set('Authorization', `Bearer ${token}`).send(data);
beforeAll(async () => {
  [owner, other] = await User.create([{ firstName: 'Real', username: 'realhost', email: 'realhost@example.test', password: 'TestPassword!2026' }, { firstName: 'Other', username: 'otherhost', email: 'otherhost@example.test', password: 'TestPassword!2026' }]);
  token = jwt.generateAccessToken({ id: owner.id });
});
test('public supplier reads do not create a fictitious catalogue', async () => {
  await Supplier.deleteMany({});
  const response = await get('/suppliers'); expect(response.status).toBe(200); expect(response.body.data).toEqual([]); expect(await Supplier.countDocuments()).toBe(0);
});
test('supplier registration cannot invent verification, reviews or featured placement', async () => {
  const response = await post('/suppliers', { name: 'Servicio presentado por anfitrión', description: 'Fotografía para encuentros y actividades.', category: 'photography_video', rating: 5, reviewsCount: 999, featured: true, isVerified: true });
  expect(response.status).toBe(201); expect(response.body.data).toMatchObject({ isVerified: false, featured: false, reviewsCount: 0, rating: 0 });
  await Supplier.updateOne({ _id: response.body.data._id }, { archivedAt: new Date() });
  expect((await get('/suppliers')).body.data).toEqual([]);
  expect((await get('/suppliers?search=%5B%28')).status).toBe(200);
});
test.each(['/wallet/topup', '/wallet/transfer'])('%s never manufactures or moves money without a payment rail', async path => {
  const before = { wallets: await Wallet.countDocuments(), transactions: await Transaction.countDocuments() };
  const response = await post(path, { amount: 100, recipientId: other.id });
  expect(response.status).toBe(503); expect(response.body.success).toBe(false);
  expect(await Wallet.countDocuments()).toBe(before.wallets); expect(await Transaction.countDocuments()).toBe(before.transactions);
});
test('missing AI configuration never returns a random enhancement as success', async () => {
  const previous = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  try { const r = await post('/ai/enhance-event', { title: 'Encuentro', description: 'Texto original' }); expect(r.status).toBe(503); expect(r.body.code).toBe('AI_NOT_CONFIGURED'); expect(r.body.data).toBeUndefined(); }
  finally { if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous; }
});
test('Telegram without token does not report simulated delivery or expose an invented bot', async () => {
  const previous = telegram.botToken; telegram.botToken = '';
  try { expect(await telegram.sendTelegramMessage('1', 'Private message')).toEqual({ success: false, code: 'TELEGRAM_NOT_CONFIGURED' }); }
  finally { telegram.botToken = previous; }
  const r = await request(app).get('/telegram/status'); expect(r.body.configured).toBe(false); expect(r.body.botName).toBeNull();
  expect((await request(app).post('/telegram/webhook').send({ message: {} })).status).toBe(503);
});
test('analytics uses actual catalogue and confirmed registrations, with organizer isolation', async () => {
  const base = { title: 'Encuentro público', description: 'Un encuentro real registrado para esta prueba.', date: new Date(Date.now()+86400000), category: 'music', status: 'published', location: { coordinates: [-69.9,18.4], address: 'Teatro' } };
  const event = await Event.create({ ...base, createdBy: owner.id, attendees: [{ user: other.id, status: 'confirmed' }, { user: owner.id, status: 'pending' }] });
  const foreign = await Event.create({ ...base, title: 'Evento ajeno', createdBy: other.id });
  await mongoose.model('AnalyticsEvent').create([{ name: 'event_interaction', timestamp: new Date(), properties: { eventId: event.id, action: 'view' } }, { name: 'event_interaction', timestamp: new Date(), properties: { eventId: foreign.id, action: 'view' } }]);
  const r = await get('/analytics/events'); expect(r.status).toBe(200);
  expect(r.body.analytics.overview).toMatchObject({ totalEvents: 1, totalAttendees: 1, totalRevenue: null, averageRating: null, totalPageViews: 1 });
  expect(r.body.analytics.topEvents[0]).toMatchObject({ title: base.title, rating: null, attendees: 1, views: 1 });
  expect(r.body.analytics.trends.categories).toEqual([{ name: 'music', count: 1, growth: null }]);
  expect((await get(`/analytics/events?eventId=${foreign.id}`)).status).toBe(404);
  expect((await get('/analytics/events?timeframe=invalid')).status).toBe(400);
});

test('hidden profiles are not exposed through global search, hosts or suggestions', async () => {
  await User.updateOne({ _id: other.id }, { $set: { role: 'organizer', 'settings.privacy.showProfile': false } });
  for (const path of ['/search?q=otherhost', '/search?q=otherhost&type=hosts', '/search/suggestions?q=otherhost']) {
    const response = await get(path); expect(response.status).toBe(200); expect(response.body.results || response.body.suggestions).toEqual([]);
  }
});
