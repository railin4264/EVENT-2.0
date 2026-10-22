const express = require('express');
const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Follow = require('../src/models/Follow');
const jwt = require('../src/services/jwtService');
const app = express(); app.use(express.json()); app.use('/users', require('../src/routes/users'));
let viewer, host, token;
beforeAll(async () => {
  viewer = await User.create({ username: 'profileviewer', email: 'viewer@example.test', password: 'Password!2026', firstName: 'Visitante' });
  host = await User.create({ username: 'profilehost', email: 'host@example.test', password: 'Password!2026', firstName: 'Anfitrión', phone: '+18095550100' });
  token = jwt.generateAccessToken({ id: viewer.id });
});
beforeEach(async () => {
  await Promise.all([Event.deleteMany({}), Follow.deleteMany({}), User.updateOne({ _id: host.id }, { $set: { isPrivate: false, 'settings.privacy.showProfile': true, 'settings.privacy.showAttendedEvents': true } })]);
});
const get = path => request(app).get(path).set('Authorization', `Bearer ${token}`);
test('community profile endpoint permits browsing without exposing account fields', async () => {
  const r = await get(`/users/profile/${host.id}`); expect(r.status).toBe(200); expect(r.body.user.firstName).toBe('Anfitrión');
  expect(r.body.user.email).toBeUndefined(); expect(r.body.user.phone).toBeUndefined(); expect(r.body.user.password).toBeUndefined();
  expect(r.headers['cache-control']).toBe('private, no-store');
  expect((await get(`/users/${host.id}`)).status).toBe(403);
});
test('hidden profiles and malformed identifiers stay unavailable', async () => {
  await User.updateOne({ _id: host.id }, { $set: { 'settings.privacy.showProfile': false } });
  expect((await get(`/users/profile/${host.id}`)).status).toBe(404);
  expect((await get('/users/profile/not-an-id')).status).toBe(400);
});
test.each([{ isPrivate: true }, { 'settings.privacy.showAttendedEvents': false }])('attendance privacy is enforced by the API %p', async patch => {
  await User.updateOne({ _id: host.id }, { $set: patch });
  const profile = await get(`/users/profile/${host.id}`); expect(profile.body.user.canViewAttendance).toBe(false);
  const r = await get(`/users/${host.id}/attended-events`); expect(r.status).toBe(200); expect(r.body.events).toEqual([]); expect(r.body.restricted).toBe(true);
});
test('shared attendance excludes private/secret events and does not expose the guest list', async () => {
  const base = { title: 'Encuentro musical', description: 'Una actividad pública para compartir.', date: new Date(Date.now()+86400000), category: 'music', createdBy: host.id, status: 'published', location: { coordinates: [-69.9,18.4], address: 'Teatro central' }, attendees: [{ user: host.id, status: 'confirmed' }, { user: viewer.id, status: 'confirmed' }] };
  await Event.create([base, { ...base, title: 'Privado', isPrivate: true }, { ...base, title: 'Secreto', isSecretLocation: true }]);
  const r = await get(`/users/${host.id}/attended-events`); expect(r.status).toBe(200); expect(r.body.events).toHaveLength(1);
  expect(r.body.events[0].title).toBe(base.title); expect(r.body.events[0].attendees).toBeUndefined();
});

test('a custodian of imported agendas is not credited with organizing those events', async () => {
  const curator = await User.create({ username: 'agenda_custodian', email: 'agenda-custodian@test.example', firstName: 'Curator', password: 'TestPassword1!', isOrganizerVerified: true });
  const base = { title: 'Actividad externa', description: 'Actividad pública del proveedor de la agenda.', category: 'art', createdBy: curator.id,
    date: new Date(Date.now() + 86400000), status: 'published', location: { coordinates: [-3.7, 40.4], address: 'Calle Mayor 15' } };
  await Event.create([{ ...base, imported: true }, { ...base, title: 'Evento propio', imported: false }]);
  const response = await request(app).get('/users/featured-organizers');
  expect(response.body.data.find(user => user._id === curator.id).activeEventsCount).toBe(1);
});
