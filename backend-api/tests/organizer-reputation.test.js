const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Order = require('../src/models/Order');
const Review = require('../src/models/EventReview');
const jwtService = require('../src/services/jwtService');
const { verifiedAttendance } = require('../src/services/organizerReputation');
const app = express(); app.use(express.json()); app.use('/api/organizer-reputation', require('../src/routes/organizerReputation'));
app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
let host, guest, token;
beforeAll(async () => { await Review.init(); });
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Order.deleteMany({}), Review.deleteMany({})]);
  [host, guest] = await User.create(['host', 'guest'].map(name => ({ username: `reputation_${name}`, email: `${name}@reputation.test`, firstName: name, password: 'Password!2026', birthDate: '1990-01-01', isEmailVerified: true })));
  token = jwtService.generateTokenPair(guest).accessToken;
});
const make = patch => Event.create({ title: 'Historial comprobable', description: 'Un evento de prueba con entradas registradas', category: 'music', date: new Date(Date.now() - 3600000),
  createdBy: host._id, status: 'published', location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Santo Domingo' }, ...patch });
const checkIn = (event, patch = {}) => Order.collection.insertOne({ orderNumber: new mongoose.Types.ObjectId().toString(), eventId: event._id, userId: guest._id, status: 'confirmed', paymentStatus: 'succeeded', items: [{ checkedInAt: new Date(Date.now() - 1000) }], ...patch });
const put = (event, body = { rating: 4, comment: 'Buena organización' }) => request(app).put(`/api/organizer-reputation/events/${event.id}/review`).set('Authorization', `Bearer ${token}`).send(body);

test('requires authentication and does not equate RSVP with check-in', async () => {
  const event = await make({ attendees: [{ user: guest.id, status: 'confirmed' }] });
  expect((await request(app).put(`/api/organizer-reputation/events/${event.id}/review`).send({ rating: 5 })).status).toBe(401);
  expect((await put(event)).status).toBe(403);
});
test.each([{ paymentStatus: 'pending' }, { status: 'refunded' }, { items: [] }, { items: [{ checkedInAt: new Date(Date.now() + 86400000) }] }, { userId: new mongoose.Types.ObjectId() }])('rejects non-admitted orders %p', async patch => {
  const event = await make(); await checkIn(event, patch); expect((await put(event)).status).toBe(403);
});
test.each([{ isPrivate: true }, { isSecretLocation: true }, { status: 'cancelled' }, { status: 'draft' }])('does not accept or disclose reviews for unavailable event %p', async patch => {
  const event = await make(patch); await checkIn(event);
  expect((await put(event)).status).toBe(404);
  expect((await request(app).get(`/api/organizer-reputation/events/${event.id}/review`).set('Authorization', `Bearer ${token}`)).status).toBe(404);
});
test('future events and hosts cannot review themselves', async () => {
  const future = await make({ date: new Date(Date.now() + 86400000) }); await checkIn(future);
  expect((await put(future)).status).toBe(403);
  const event = await make(); await checkIn(event, { userId: host._id });
  expect(await verifiedAttendance(event, host.id)).toBe(false);
});
test('concurrent submissions keep one opinion per attendee and event', async () => {
  const event = await make(); await checkIn(event);
  const results = await Promise.all([put(event), put(event, { rating: 3 })]);
  expect(results.map(result => result.status)).toEqual([200, 200]);
  expect(await Review.countDocuments({ event: event._id, user: guest._id })).toBe(1);
  const mine = await request(app).get(`/api/organizer-reputation/events/${event.id}/review`).set('Authorization', `Bearer ${token}`);
  expect(mine.body.data.eligible).toBe(true); expect(mine.body.data.review).not.toHaveProperty('user');
});
test.each([{ rating: '5' }, { rating: 6 }, { rating: 1.5 }, { rating: 3, comment: 'x'.repeat(601) }, { rating: 4, comment: {} }])('validates review body %p', async body => {
  const event = await make(); expect((await put(event, body)).status).toBe(400);
});
test('public summary uses explicit denominator and separates declared completion from door evidence', async () => {
  const event = await make(); await checkIn(event); await put(event);
  await make({ status: 'cancelled' }); await make({ status: 'completed' });
  await make({ status: 'completed', isPrivate: true }); await make({ isSecretLocation: true }); await make({ date: new Date(Date.now() + 86400000) });
  const result = await request(app).get(`/api/organizer-reputation/${host.id}`);
  expect(result.status).toBe(200);
  expect(result.body.data).toMatchObject({ scheduled: 3, cancelled: 1, withCheckIns: 1, markedCompleted: 1, cancellationRate: 33.3, reviews: { count: 1, average: 4 } });
  expect(JSON.stringify(result.body)).not.toContain(guest.email);
  await Event.updateOne({ _id: event.id }, { $set: { isPrivate: true } });
  const hidden = await request(app).get(`/api/organizer-reputation/${host.id}`);
  expect(hidden.body.data.reviews.count).toBe(0);
});
test('empty history is not advertised as perfect reliability', async () => {
  const result = await request(app).get(`/api/organizer-reputation/${host.id}`);
  expect(result.body.data.cancellationRate).toBeNull(); expect(result.body.data.reviews.average).toBeNull();
});
test('a persisted RSVP check-in qualifies without purchasing an order', async () => {
  const event = await make({ attendees: [{ user: guest._id, status: 'confirmed', checkedInAt: new Date(Date.now() - 1000), checkedInBy: host._id }] });
  expect((await put(event, { rating: 5 })).status).toBe(200);
  const summary = await request(app).get(`/api/organizer-reputation/${host.id}`);
  expect(summary.body.data.withCheckIns).toBe(1);
});
test('a pending RSVP cannot use a check-in field to qualify', async () => {
  const event = await make({ attendees: [{ user: guest._id, status: 'pending', checkedInAt: new Date(Date.now() - 1000) }] });
  expect((await put(event)).status).toBe(403);
});
test('does not expose a hidden organizers history', async () => {
  await User.updateOne({ _id: host.id }, { $set: { 'settings.privacy.showProfile': false } });
  expect((await request(app).get(`/api/organizer-reputation/${host.id}`)).status).toBe(404);
});
