const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const EventReview = require('../src/models/EventReview');
const jwtService = require('../src/services/jwtService');
const { listOwnedTickets } = require('../src/services/admissionService');
const { app } = require('../src/server');
let owner, attendee, ownerToken, attendeeToken;
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), EventReview.deleteMany({})]);
  [owner, attendee] = await User.create(['owner', 'attendee'].map(name => ({ username: `connections_${name}`, firstName: name,
    email: `${name}@connections.test`, password: 'Password!2026', birthDate: '1990-01-01' })));
  ownerToken = jwtService.generateTokenPair(owner).accessToken;
  attendeeToken = jwtService.generateTokenPair(attendee).accessToken;
});
const create = patch => Event.create({ title: 'Conexiones del producto', description: 'Evento de prueba para comprobar conexiones reales', category: 'music',
  date: new Date(Date.now() + 86400000), createdBy: owner._id, status: 'published', price: { amount: 0, currency: 'DOP' },
  location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Dirección reservada', city: 'Santo Domingo', countryCode: 'DO' }, ...patch });
test('authorized date edits record history and client cannot forge it', async () => {
  const event = await create();
  const date = new Date(Date.now() + 2 * 86400000).toISOString();
  expect((await request(app).put(`/api/events/${event.id}`).set('Authorization', `Bearer ${attendeeToken}`).send({ date })).status).toBe(403);
  const response = await request(app).put(`/api/events/${event.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ date, previousDate: '2000-01-01', rescheduledAt: '2000-01-01' });
  expect(response.status).toBe(200);
  const saved = await Event.findById(event.id);
  expect(saved.previousDate.toISOString()).toBe(event.date.toISOString());
  expect(saved.rescheduledAt.getTime()).toBeGreaterThan(Date.now() - 60000);
  expect((await request(app).get(`/api/event-planning/${event.id}`)).body.data.alternativesAvailable).toBe(true);
});
test('ordinary edits do not fabricate a date change', async () => {
  const event = await create();
  const response = await request(app).put(`/api/events/${event.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ title: 'Título actualizado', previousDate: '2000-01-01', rescheduledAt: '2000-01-01' });
  expect(response.status).toBe(200);
  expect((await Event.findById(event.id)).rescheduledAt).toBeUndefined();
});
test('legacy event readers do not leak new secret arrival instructions', async () => {
  const event = await create({ isSecretLocation: true, practicalInfo: { arrival: 'Puerta privada 847', parking: 'Garaje privado 847', welcoming: 'Recibe junto a puerta 847', bring: 'Agua' } });
  const detail = await request(app).get(`/api/events/${event.id}`);
  expect(detail.status).toBe(200);
  expect(detail.body.event.practicalInfo).toEqual({ bring: 'Agua' });
  expect(JSON.stringify(detail.body.event.practicalInfo)).not.toContain('847');
  const list = await request(app).get('/api/events');
  expect(JSON.stringify(list.body.events[0].practicalInfo)).not.toContain('847');
  const own = await request(app).get(`/api/events/${event.id}`).set('Authorization', `Bearer ${ownerToken}`);
  expect(own.body.event.practicalInfo.arrival).toContain('847');
});
test('a real free RSVP admission persists evidence and enables exactly one own review', async () => {
  const event = await create({ date: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000), attendees: [{ user: attendee._id, status: 'confirmed' }] });
  const [pass] = await listOwnedTickets(attendee.id);
  const before = await request(app).put(`/api/organizer-reputation/events/${event.id}/review`).set('Authorization', `Bearer ${attendeeToken}`).send({ rating: 5 });
  expect(before.status).toBe(403);
  const checkIn = await request(app).post('/api/tickets/validate-qr').set('Authorization', `Bearer ${ownerToken}`).send({ qrCode: pass.qrCode, eventId: event.id });
  expect(checkIn.body.data.valid).toBe(true);
  expect((await Event.findById(event.id)).attendees[0].checkedInAt).toBeInstanceOf(Date);
  const review = await request(app).put(`/api/organizer-reputation/events/${event.id}/review`).set('Authorization', `Bearer ${attendeeToken}`).send({ rating: 4, comment: 'Entrada registrada y experiencia real' });
  expect(review.status).toBe(200);
  const own = await request(app).get(`/api/organizer-reputation/events/${event.id}/review`).set('Authorization', `Bearer ${attendeeToken}`);
  expect(own.headers['cache-control']).toBe('private, no-store');
  expect(own.body.data.review.rating).toBe(4);
  expect(await EventReview.countDocuments({ event: event._id, user: attendee._id })).toBe(1);
});
