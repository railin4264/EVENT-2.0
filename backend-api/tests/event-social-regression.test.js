const request = require('supertest');
const mongoose = require('mongoose');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Order = require('../src/models/Order');
const Memory = require('../src/models/EventMemory');
const Connection = require('../src/models/EventConnection');
const PlusOne = require('../src/models/EventPlusOne');
const After = require('../src/models/EventAfter');
const Song = require('../src/models/EventSong');
const jwtService = require('../src/services/jwtService');
const { app } = require('../src/server');
let users, tokens, event, otherEvent;
const get = (path, user) => {
  const req = request(app).get(path);
  return user === undefined ? req : req.set('Authorization', `Bearer ${tokens[user]}`);
};
const post = (path, user, body = {}) => request(app).post(path).set('Authorization', `Bearer ${tokens[user]}`).send(body);
const path = feature => `/api/events/${event._id}/${feature}`;

beforeAll(async () => {
  users = await User.create(['owner', 'attendee', 'outsider'].map(name => ({ username: `social_${name}`,
    email: `social_${name}@example.com`, password: 'TestPassword1!', firstName: name, lastName: 'Social' })));
  tokens = users.map(user => jwtService.generateTokenPair(user).accessToken);
  await Connection.init();
});
beforeEach(async () => {
  for (const Model of [Event, Order, Memory, Connection, PlusOne, After, Song]) await Model.deleteMany({});
  const base = { title: 'Evento social de prueba', description: 'Evento aislado para verificar permisos sociales', category: 'music',
    date: new Date(Date.now() - 86400000), location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Lugar de prueba' } };
  event = await Event.create({ ...base, createdBy: users[0]._id,
    attendees: [0, 1].map(index => ({ user: users[index]._id, status: 'confirmed' })) });
  otherEvent = await Event.create({ ...base, createdBy: users[2]._id, isPrivate: true });
});

test('album and reconnect require confirmed participation; canceled attendees lose access', async () => {
  expect((await get(path('memories'))).status).toBe(401);
  for (const feature of ['memories', 'reconnect/candidates', 'reconnect/matches']) {
    expect((await get(path(feature), 2)).status).toBe(403);
    expect((await get(path(feature), 1)).status).toBe(200);
  }
  await Event.updateOne({ _id: event._id, 'attendees.user': users[1]._id }, { $set: { 'attendees.$.status': 'cancelled' } });
  expect((await get(path('memories'), 1)).status).toBe(403);
  expect((await post(path('reconnect'), 0, { targetUserId: users[1].id })).status).toBe(403);
  expect((await get(path('reconnect/candidates'), 0)).body.data).toEqual([]);
});

test('paid orders grant album access without attendee duplication and refunds revoke it', async () => {
  await Event.updateOne({ _id: event._id }, { $set: { attendees: [] } });
  const order = await Order.create({ orderNumber: 'SOCIAL-PAID-TEST', userId: users[1]._id, eventId: event._id,
    customerInfo: { firstName: 'Test', lastName: 'Buyer', email: users[1].email },
    items: [{ ticketId: new mongoose.Types.ObjectId(), quantity: 1, unitPrice: 0, totalPrice: 0 }],
    subtotal: 0, total: 0, status: 'confirmed', paymentStatus: 'succeeded' });
  expect((await get(path('memories'), 1)).status).toBe(200);
  await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'refunded' } });
  expect((await get(path('memories'), 1)).status).toBe(403);
});

test('organizing another event cannot delete or vote on this event resources', async () => {
  const memory = await Memory.create({ event: event._id, user: users[0]._id, imageUrl: 'https://example.com/photo.jpg' });
  const after = await After.create({ event: event._id, user: users[0]._id, spotName: 'After' });
  const song = await Song.create({ event: event._id, user: users[0]._id, title: 'Canción', artist: 'Artista' });
  const offer = await PlusOne.create({ event: event._id, user: users[0]._id, type: 'group_join', title: 'Nuestro grupo' });
  const prefix = `/api/events/${otherEvent._id}`;
  expect((await request(app).delete(`${prefix}/memories/${memory._id}`).set('Authorization', `Bearer ${tokens[2]}`)).status).toBe(404);
  for (const suffix of [`memories/${memory._id}/like`, `afters/${after._id}/vote`, `songs/${song._id}/vote`, `plus-ones/${offer._id}/interest`]) {
    expect((await post(`${prefix}/${suffix}`, 2)).status).toBe(404);
  }
  expect(await Memory.exists({ _id: memory._id })).toBeTruthy();
});

test('concurrent likes and song votes preserve every distinct voter and authenticated flags', async () => {
  const memory = await Memory.create({ event: event._id, user: users[0]._id, imageUrl: 'https://example.com/photo.jpg' });
  const song = await Song.create({ event: event._id, user: users[0]._id, title: 'Canción', artist: 'Artista', votes: [], votesCount: 0 });
  for (const suffix of [`memories/${memory._id}/like`, `songs/${song._id}/vote`]) {
    const responses = await Promise.all([post(path(suffix), 0), post(path(suffix), 1)]);
    expect(responses.map(response => response.status)).toEqual([200, 200]);
  }
  expect((await Memory.findById(memory._id)).likes).toHaveLength(2);
  expect((await Song.findById(song._id)).votesCount).toBe(2);
  const songs = (await get(path('songs'), 1)).body.data;
  expect(songs[0].hasVoted).toBe(true);
  expect(songs[0].votes).toBeUndefined();
  expect((await post(path(`songs/${song._id}/vote`), 1)).body.votesCount).toBe(1);
  expect((await post(path(`memories/${memory._id}/like`), 2)).status).toBe(403);
});

test('companion applicants and messages are visible only to the author', async () => {
  await PlusOne.create({ event: event._id, user: users[0]._id, type: 'group_join', title: 'Nuestro grupo',
    interestedUsers: [{ user: users[1]._id, message: 'Mensaje privado del solicitante' }] });
  const publicPost = (await get(path('plus-ones'))).body.data[0];
  expect(publicPost.interestedUsers).toEqual([]);
  expect(publicPost.interestedCount).toBe(1);
  expect(JSON.stringify(publicPost)).not.toContain('Mensaje privado');
  const ownerPost = (await get(path('plus-ones'), 0)).body.data[0];
  expect(ownerPost.isOwner).toBe(true);
  expect(ownerPost.interestedUsers[0].message).toBe('Mensaje privado del solicitante');
  const applicantPost = (await get(path('plus-ones'), 1)).body.data[0];
  expect(applicantPost.hasExpressedInterest).toBe(true);
  expect(applicantPost.interestedUsers).toEqual([]);
});

test('companion matching accepts applicants only and concurrent acceptance selects once', async () => {
  const offer = await PlusOne.create({ event: event._id, user: users[0]._id, type: 'group_join', title: 'Nuestro grupo',
    interestedUsers: [{ user: users[1]._id }] });
  const endpoint = path(`plus-ones/${offer._id}/match`);
  expect((await post(endpoint, 0, { targetUserId: users[2].id })).status).toBe(400);
  expect((await post(endpoint, 1, { targetUserId: users[1].id })).status).toBe(403);
  await PlusOne.updateOne({ _id: offer._id }, { $push: { interestedUsers: { user: users[2]._id } } });
  const results = await Promise.all([post(endpoint, 0, { targetUserId: users[1].id }), post(endpoint, 0, { targetUserId: users[2].id })]);
  expect(results.map(result => result.status).sort()).toEqual([200, 409]);
});

test('concurrent companion applications retain distinct applicants without duplicate submissions', async () => {
  const offer = await PlusOne.create({ event: event._id, user: users[0]._id, type: 'group_join', title: 'Nuestro grupo' });
  const endpoint = path(`plus-ones/${offer._id}/interest`);
  const results = await Promise.all([post(endpoint, 1), post(endpoint, 1), post(endpoint, 2)]);
  expect(results[2].status).toBe(200);
  expect(results.slice(0, 2).filter(result => result.status === 200)).toHaveLength(1);
  const saved = await PlusOne.findById(offer._id);
  expect(saved.interestedUsers).toHaveLength(2);
  expect(new Set(saved.interestedUsers.map(item => String(item.user))).size).toBe(2);
});

test('social reads respect private, draft and age-restricted parent visibility', async () => {
  for (const feature of ['afters', 'plus-ones', 'songs']) {
    expect((await get(`/api/events/${otherEvent._id}/${feature}`)).status).toBe(403);
    expect((await get(`/api/events/${otherEvent._id}/${feature}`, 2)).status).toBe(200);
  }
  await Event.updateOne({ _id: event._id }, { $set: { status: 'draft' } });
  expect((await get(path('songs'))).status).toBe(404);
  await Event.updateOne({ _id: event._id }, { $set: { status: 'published', 'ageRestriction.isAdultOnly': true } });
  expect((await get(path('songs'))).status).toBe(403);
});

test('simultaneous reciprocal selections converge to a mutual match without duplicates', async () => {
  const results = await Promise.all([post(path('reconnect'), 0, { targetUserId: users[1].id }),
    post(path('reconnect'), 1, { targetUserId: users[0].id })]);
  expect(results.map(result => result.status)).toEqual([200, 200]);
  expect(await Connection.countDocuments({ event: event._id, isMutual: true, status: 'matched' })).toBe(2);
  expect((await post(path('reconnect'), 0, { targetUserId: users[1].id })).body.isMutual).toBe(true);
  expect(await Connection.countDocuments({ event: event._id })).toBe(2);
});

test('former attendee can remove own memory but cannot read album; malformed IDs and URLs reject cleanly', async () => {
  const memory = await Memory.create({ event: event._id, user: users[1]._id, imageUrl: 'https://example.com/photo.jpg' });
  await Event.updateOne({ _id: event._id }, { $pull: { attendees: { user: users[1]._id } } });
  expect((await get(path('memories'), 1)).status).toBe(403);
  expect((await request(app).delete(path(`memories/${memory._id}`)).set('Authorization', `Bearer ${tokens[1]}`)).status).toBe(200);
  expect((await post(path('memories'), 0, { imageUrl: 'javascript:alert(1)' })).status).toBe(400);
  expect((await post(path('songs/not-an-id/vote'), 0)).status).toBe(400);
  expect((await get('/api/events/not-an-id/songs')).status).toBe(400);
  expect((await get(`/api/events/${new mongoose.Types.ObjectId()}/songs`)).status).toBe(404);
});
