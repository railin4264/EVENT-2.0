const express = require('express');
const request = require('supertest');
const Event = require('../src/models/Event');
const ActivityIdea = require('../src/models/ActivityIdea');
const User = require('../src/models/User');
const CommunityAction = require('../src/models/CommunityAction');
const Order = require('../src/models/Order');
const jwt = require('../src/services/jwtService');
const { permission, repeatDays, serialize } = require('../src/utils/communityActions');
const app = express(); app.use(express.json()); app.use('/community', require('../src/routes/communityActions'));
let owner, member, stranger, event, tokens;
beforeEach(async () => {
  await Promise.all([Event.deleteMany({}), User.deleteMany({}), ActivityIdea.deleteMany({}), CommunityAction.deleteMany({}), Order.deleteMany({})]);
  await CommunityAction.init();
  [owner, member, stranger] = await User.create(['owner', 'member', 'stranger'].map(name => ({ username: `community_${name}`, email: `${name}@community.test`, firstName: name, password: 'Password!2026', birthDate: '1990-01-01' })));
  tokens = [owner, member, stranger].map(user => jwt.generateTokenPair(user).accessToken);
  event = await Event.create({ title: 'Actividad de comunidad', description: 'Una actividad pública para coordinar', category: 'music', status: 'published', createdBy: owner._id, date: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Lugar público' }, attendees: [{ user: member._id, status: 'confirmed' }] });
});
const call = (method, path = '', body, token = tokens[0], scope = 'events', id = event.id) => { let req = request(app)[method](`/community/${scope}/${id}${path}`); if (token) req = req.set('Authorization', `Bearer ${token}`); return body === undefined ? req : req.send(body); };
const addRole = async () => { const result = await call('post', '/roles', { title: 'Fotografía', slots: 1 }); expect(result.status).toBe(200); return result.body.data.roles[0].id; };

test('guest sees public needs but no private offers or names', async () => {
  const role = await addRole(); await call('post', `/roles/${role}/offer`, { note: 'Puedo aportar mi cámara' }, tokens[1]);
  expect((await call('get')).body.data.roles[0].offers[0].name).toBe(member.firstName);
  const response = await call('get', '', undefined, null);
  expect(response.status).toBe(200); expect(response.body.data.roles[0].offers).toEqual([]);
  expect(response.body.data.canShareCall).toBe(true);
});

test('private and secret activities never offer a public call, including to their owner', async () => {
  for (const patch of [
    { isPrivate: true },
    { isPrivate: false, isSecretLocation: true },
    { isSecretLocation: false, visibility: 'secret' },
    { visibility: 'private' },
  ]) {
    // `visibility` is a legacy field; seed it through the collection because
    // the current schema otherwise strips it before it reaches MongoDB.
    await Event.collection.updateOne({ _id: event._id }, { $set: patch });
    expect((await call('get')).body.data.canShareCall).toBe(false);
    expect((await call('get', '', undefined, tokens[2])).status).toBe(404);
    expect((await call('get', '', undefined, tokens[1])).status).toBe(200);
  }
});
test('private, unapproved and age-restricted events fail closed for outsiders', async () => {
  for (const patch of [{ isPrivate: true }, { isPrivate: false, status: 'draft' }, { status: 'published', ageRestriction: { minAge: 90 } }]) {
    await Event.updateOne({ _id: event._id }, { $set: patch });
    expect((await call('get', '', undefined, tokens[2])).status).toBe(404);
  }
});
test('only manager creates or closes roles', async () => {
  expect((await call('post', '/roles', { title: 'Sonido', slots: 1 }, tokens[1])).status).toBe(403);
  const role = await addRole(); expect((await call('patch', `/roles/${role}`, { closed: true })).status).toBe(200);
  expect((await call('post', `/roles/${role}/offer`, { note: 'Equipo' }, tokens[1])).status).toBe(400);
});
test('duplicate concurrent offers produce exactly one request', async () => {
  const role = await addRole();
  const results = await Promise.all([1, 2].map(() => call('post', `/roles/${role}/offer`, { note: 'Llevo cámara' }, tokens[1])));
  expect(results.map(result => result.status).sort()).toEqual([200, 409]);
  const saved = await CommunityAction.findOne({ target: event._id }); expect(saved.roles[0].offers).toHaveLength(1);
});
test('acceptance enforces capacity even under concurrent manager requests', async () => {
  const role = await addRole(); await call('post', `/roles/${role}/offer`, { note: 'Una cámara' }, tokens[1]); await call('post', `/roles/${role}/offer`, { note: 'Otra cámara' }, tokens[2]);
  const results = await Promise.all([member, stranger].map(user => call('patch', `/roles/${role}/offers/${user.id}`, { status: 'accepted' })));
  expect(results.map(result => result.status).sort()).toEqual([200, 409]);
  expect((await call('get')).body.data.roles[0].acceptedCount).toBe(1);
});
test('offer owner may withdraw, and strangers cannot see its note', async () => {
  const role = await addRole(); await call('post', `/roles/${role}/offer`, { note: 'Mi información privada' }, tokens[1]);
  expect((await call('get', '', undefined, tokens[2])).text).not.toContain('Mi información privada');
  await call('delete', `/roles/${role}/offer`, undefined, tokens[1]); expect((await call('get')).body.data.roles[0].offers).toEqual([]);
});
test('repeat demand accepts only a confirmed attendee after the event and updates one vote', async () => {
  expect((await call('put', '/repeat', { interested: true, days: ['saturday'] }, tokens[1])).status).toBe(403);
  await Event.updateOne({ _id: event._id }, { $set: { date: new Date(Date.now() - 7200000), endDate: new Date(Date.now() - 3600000) } });
  expect((await call('put', '/repeat', { interested: true, days: ['saturday'] }, tokens[2])).status).toBe(403);
  await Promise.all([1, 2].map(() => call('put', '/repeat', { interested: true, days: ['saturday', 'saturday'] }, tokens[1])));
  const response = await call('get'); expect(response.body.data.repeat.interestedCount).toBe(1); expect(response.body.data.repeat.dayCounts.saturday).toBe(1);
  expect(response.text).not.toContain(member.id);
  await call('put', '/repeat', { interested: false }, tokens[1]); expect((await call('get')).body.data.repeat.interestedCount).toBe(0);
});
test('meetup consent is separate, names hidden from nonparticipants, changed place resets participation', async () => {
  const time = new Date(Date.now() + 3600000).toISOString();
  expect((await call('put', '/meetup', { place: 'Entrada del parque', time, isPublicPlace: false })).status).toBe(400);
  await call('put', '/meetup', { place: 'Entrada del parque', time, isPublicPlace: true });
  expect((await call('put', '/meetup/join', { joined: true, shareName: true }, tokens[2])).status).toBe(403);
  await call('put', '/meetup/join', { joined: true, shareName: true }, tokens[1]);
  expect((await call('get', '', undefined, tokens[2])).body.data.meetup.names).toEqual([]);
  expect((await call('get', '', undefined, tokens[1])).body.data.meetup.names).toEqual(['member']);
  await call('put', '/meetup', { place: 'Entrada del museo', time, isPublicPlace: true });
  expect((await call('get')).body.data.meetup.participantCount).toBe(0);
});
test('meetup expires after event and cannot expose a stale meeting or names', async () => {
  await call('put', '/meetup', { place: 'Parque', time: new Date(Date.now() + 3600000).toISOString(), isPublicPlace: true });
  await Event.updateOne({ _id: event._id }, { $set: { date: new Date(Date.now() - 7200000), endDate: new Date(Date.now() - 3600000) } });
  expect((await call('get')).body.data.meetup).toBeNull();
  expect((await call('put', '/meetup/join', { joined: true, shareName: true }, tokens[1])).status).toBe(400);
});
test('ideas support needs and voluntary offers, never repeat votes or meetings', async () => {
  const idea = await ActivityIdea.create({ title: 'Tocar guitarra juntos', createdBy: owner._id, category: 'music', status: 'open' });
  const result = await call('post', '/roles', { title: 'Llevar guitarra', slots: 2 }, tokens[0], 'ideas', idea.id);
  expect(result.status).toBe(200);
  expect((await call('post', `/roles/${result.body.data.roles[0].id}/offer`, { note: 'Llevo la mía' }, tokens[1], 'ideas', idea.id)).status).toBe(200);
  expect((await call('put', '/repeat', { interested: true }, tokens[1], 'ideas', idea.id)).status).toBe(403);
  await ActivityIdea.updateOne({ _id: idea._id }, { status: 'closed' }); expect((await call('get', '', undefined, tokens[1], 'ideas', idea.id)).status).toBe(404);
});
test('input bounds, malformed target and closed activity are rejected', async () => {
  for (const body of [{ title: 'x', slots: 0 }, { title: 'x', slots: 1.5 }, { title: 'x'.repeat(101), slots: 1 }]) expect((await call('post', '/roles', body)).status).toBe(400);
  expect((await call('get', '', undefined, tokens[0], 'events', 'invalid')).status).toBe(400);
  await Event.updateOne({ _id: event._id }, { status: 'cancelled' }); expect((await call('post', '/roles', { title: 'Sonido', slots: 1 })).status).toBe(400);
});
test('helpers reject invalid days and expose neither repeat voter IDs nor anonymous names', () => {
  expect(() => repeatDays(['someday'])).toThrow();
  expect(permission('events', { status: 'published', date: new Date(0), createdBy: owner._id, attendees: [{ user: member._id, status: 'pending' }] }, member).canRepeat).toBe(false);
  const result = serialize({ repeatVotes: [{ user: member._id, days: ['saturday'] }], meetup: { place: 'Parque', participants: [{ user: member._id, name: 'Privado', shareName: false }] } }, { canManage: true, meetupActive: true }, owner);
  expect(result.meetup.names).toEqual([]); expect(JSON.stringify(result.repeat)).not.toContain(member.id);
});
test('expired events retain repeat demand for confirmed attendees', async () => {
  await Event.updateOne({ _id: event._id }, { $set: { status: 'expired', date: new Date(Date.now() - 7200000), endDate: new Date(Date.now() - 3600000) } });
  const result = await call('put', '/repeat', { interested: true, days: ['sunday'] }, tokens[1]);
  expect(result.status).toBe(200); expect(result.body.data.repeat.interestedCount).toBe(1);
  expect(result.body.data.canContribute).toBe(false); expect(result.body.data.meetup).toBeNull();
});
test('verified ticket orders qualify for private meetup and repeat, pending orders do not', async () => {
  await Event.updateOne({ _id: event._id }, { isPrivate: true, attendees: [] });
  const order = await Order.create({ orderNumber: 'COMMUNITY-ORDER-001', eventId: event._id, userId: member._id, customerInfo: { firstName: 'Miembro', lastName: 'Prueba', email: member.email }, items: [], subtotal: 500, total: 500, currency: 'DOP', status: 'pending_payment', paymentStatus: 'pending' });
  expect((await call('get', '', undefined, tokens[1])).status).toBe(404);
  await Order.updateOne({ _id: order._id }, { status: 'confirmed', paymentStatus: 'succeeded' });
  await call('put', '/meetup', { place: 'Entrada pública', time: new Date(Date.now() + 3600000).toISOString(), isPublicPlace: true });
  expect((await call('put', '/meetup/join', { joined: true, shareName: false }, tokens[1])).status).toBe(200);
  await Event.updateOne({ _id: event._id }, { status: 'expired', date: new Date(Date.now() - 7200000), endDate: new Date(Date.now() - 3600000) });
  expect((await call('put', '/repeat', { interested: true, days: ['saturday'] }, tokens[1])).status).toBe(200);
  await Order.updateOne({ _id: order._id }, { status: 'refunded', paymentStatus: 'refunded' });
  expect((await call('get', '', undefined, tokens[1])).status).toBe(404);
});
