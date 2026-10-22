const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const ActivityIdea = require('../src/models/ActivityIdea');
const Notification = require('../src/models/Notification');
const jwtService = require('../src/services/jwtService');
const serverModule = require('../src/server');
const { app } = serverModule;
const originalIo = serverModule.io;
const io = { emit: jest.fn() };
let owner, stranger, admin, supporters;
const tokens = new Map();
const call = (path, user = owner, body = {}) => request(app).post(`/api/ideas/${path}`).set('Authorization', `Bearer ${tokens.get(user.id)}`).send(body);
const makeIdea = (overrides = {}) => ActivityIdea.create({ title: 'Violin en el parque', category: 'music', createdBy: owner._id,
  supporters: [{ user: owner._id }], supportersCount: 1, quorumTarget: 5,
  quorumDeadline: new Date(Date.now() + 86400000), ...overrides });
const makeEvent = (overrides = {}) => Event.create({ title: 'Violin publico', description: 'Actividad musical abierta', category: 'music', createdBy: owner._id,
  status: 'published', isPrivate: false, date: new Date(Date.now() + 86400000), location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Parque' }, ...overrides });
beforeAll(async () => {
  const users = await User.create(['owner', 'stranger', 'admin', 'a', 'b', 'c', 'd', 'e', 'f'].map(name => ({
    username: `idea_integrity_${name}`, email: `idea-integrity-${name}@example.test`, password: 'TestPassword1!',
    firstName: name, birthDate: new Date('1990-01-01'), role: name === 'admin' ? 'admin' : 'user' })));
  [owner, stranger, admin, ...supporters] = users;
  for (const user of users) tokens.set(user.id, jwtService.generateTokenPair(user).accessToken);
});
beforeEach(async () => {
  await Promise.all([ActivityIdea.deleteMany({}), Event.deleteMany({})]);
  jest.spyOn(Notification, 'createNotification').mockResolvedValue({});
  serverModule.io = io;
});
afterEach(() => { jest.restoreAllMocks(); serverModule.io = originalIo; });

test('concurrent distinct support retains every unique supporter and announces quorum only after persistence', async () => {
  const idea = await makeIdea();
  const results = await Promise.all(supporters.map(user => call(`${idea.id}/support`, user, { supported: true })));
  expect(results.every(result => result.status === 200)).toBe(true);
  const saved = await ActivityIdea.findById(idea.id);
  expect(saved.supportersCount).toBe(7);
  expect(new Set(saved.supporters.map(s => String(s.user))).size).toBe(7);
  expect(saved.quorumReached).toBe(true);
  expect(results.filter(result => result.body.data.justReachedQuorum)).toHaveLength(1);
  expect(io.emit.mock.calls.filter(([topic]) => topic === 'idea:quorum_reached')).toHaveLength(1);
});

test('repeated concurrent desired support is idempotent and leaves one identity', async () => {
  const idea = await makeIdea();
  const results = await Promise.all(Array.from({ length: 18 }, () => call(`${idea.id}/support`, stranger, { supported: true })));
  expect(results.every(result => result.status === 200 && result.body.data.supported === true)).toBe(true);
  expect((await ActivityIdea.findById(idea.id)).supportersCount).toBe(2);
  const remove = await Promise.all(Array.from({ length: 8 }, () => call(`${idea.id}/support`, stranger, { supported: false })));
  expect(remove.every(result => result.status === 200 && result.body.data.supported === false)).toBe(true);
  expect((await ActivityIdea.findById(idea.id)).supportersCount).toBe(1);
});

test('legacy toggle remains supported and rejects a nonboolean desired state', async () => {
  const idea = await makeIdea();
  expect((await call(`${idea.id}/support`, stranger)).body.data.supported).toBe(true);
  expect((await call(`${idea.id}/support`, stranger)).body.data.supported).toBe(false);
  expect((await call(`${idea.id}/support`, stranger, { supported: 'true' })).status).toBe(400);
  expect((await ActivityIdea.findById(idea.id)).supportersCount).toBe(1);
});

test('legacy ideas have a finite lifetime, stay in the archive and cannot gain new support', async () => {
  const old = await makeIdea({ quorumDeadline: undefined, createdAt: new Date(Date.now() - 20 * 86400000) });
  const fresh = await makeIdea({ quorumDeadline: undefined });
  const open = await request(app).get('/api/ideas');
  expect(open.body.data.map(idea => idea._id)).toContain(fresh.id);
  expect(open.body.data.map(idea => idea._id)).not.toContain(old.id);
  const archive = await request(app).get('/api/ideas?status=expired');
  expect(archive.body.data.map(idea => idea._id)).toContain(old.id);
  expect(archive.body.data[0].isExpired).toBe(true);
  expect(archive.body.data[0].expiresAt).toBeTruthy();
  expect((await call(`${old.id}/support`, stranger, { supported: true })).status).toBe(409);
  expect(await ActivityIdea.findById(old.id)).not.toBeNull();
});

test('publishing an idea records the chosen lifetime and rejects invalid durations', async () => {
  const response = await call('', owner, { title: 'Una actividad para compartir', category: 'music', daysToTarget: 7 });
  expect(response.status).toBe(201);
  expect(Math.round((Date.parse(response.body.data.expiresAt) - Date.parse(response.body.data.createdAt)) / 86400000)).toBe(7);
  expect((await call('', owner, { title: 'Otro plan con amigos', daysToTarget: 90 })).status).toBe(400);
});

test.each([
  ['closed', { status: 'closed' }], ['launched', { status: 'launched' }],
  ['expired', { quorumDeadline: new Date(Date.now() - 1000) }]
])('rejects support and launch on %s ideas', async (_, overrides) => {
  const idea = await makeIdea(overrides);
  const event = await makeEvent();
  expect((await call(`${idea.id}/support`, stranger, { supported: true })).status).toBe(409);
  expect((await call(`${idea.id}/launch`, owner, { eventId: event.id })).status).toBe(409);
  expect((await ActivityIdea.findById(idea.id)).supportersCount).toBe(1);
  expect(Notification.createNotification).not.toHaveBeenCalled();
});

test('repairs duplicate legacy supporters and stale quorum/count values from unique identities', async () => {
  const idea = await makeIdea({ supporters: [{ user: owner._id }, { user: owner._id }, { user: stranger._id }], supportersCount: 90, quorumReached: true, quorumReachedAt: new Date() });
  const result = await call(`${idea.id}/support`, stranger, { supported: true });
  expect(result.body.data).toMatchObject({ supported: true, supportersCount: 2, quorumReached: false, justReachedQuorum: false });
  const saved = await ActivityIdea.findById(idea.id);
  expect(saved.supporters).toHaveLength(2);
  expect(saved.quorumReachedAt).toBeUndefined();
});

test('a failed CAS does not mutate or announce quorum', async () => {
  const idea = await makeIdea({ supporters: [owner, stranger, ...supporters.slice(0, 2)].map(user => ({ user: user._id })), supportersCount: 4 });
  jest.spyOn(ActivityIdea, 'findOneAndUpdate').mockResolvedValue(null);
  const result = await call(`${idea.id}/support`, supporters[2], { supported: true });
  expect(result.status).toBe(409);
  expect((await ActivityIdea.findById(idea.id)).supportersCount).toBe(4);
  expect(io.emit).not.toHaveBeenCalled();
});

test('another organizer cannot appropriate an idea by supplying their own event', async () => {
  const idea = await makeIdea();
  const otherEvent = await makeEvent({ createdBy: stranger._id });
  expect((await call(`${idea.id}/launch`, stranger, { eventId: otherEvent.id })).status).toBe(403);
  expect((await call(`${idea.id}/launch`, owner, { eventId: otherEvent.id })).status).toBe(403);
  expect((await ActivityIdea.findById(idea.id)).status).toBe('open');
});

test.each([
  ['draft', { status: 'draft' }], ['pending review', { status: 'pending_review' }],
  ['private', { isPrivate: true }], ['cancelled', { status: 'cancelled' }],
  ['ended', { date: new Date(Date.now() - 86400000), endDate: new Date(Date.now() - 1000) }]
])('does not publish or link a %s event', async (_, overrides) => {
  const idea = await makeIdea();
  const event = await makeEvent(overrides);
  expect((await call(`${idea.id}/launch`, owner, { eventId: event.id })).status).toBe(409);
  expect((await ActivityIdea.findById(idea.id)).status).toBe('open');
  expect((await Event.findById(event.id)).status).toBe(event.status);
  expect(Notification.createNotification).not.toHaveBeenCalled();
});

test('concurrent launch links only one event and fans out once to deduplicated supporters', async () => {
  const idea = await makeIdea({ supporters: [{ user: owner._id }, { user: stranger._id }, { user: stranger._id }, { user: supporters[0]._id }] });
  const events = await Promise.all([makeEvent(), makeEvent()]);
  const results = await Promise.all(Array.from({ length: 6 }, (_, index) => call(`${idea.id}/launch`, owner, { eventId: events[index % 2].id })));
  expect(results.filter(result => result.status === 200)).toHaveLength(1);
  expect(results.filter(result => result.status === 409)).toHaveLength(5);
  const saved = await ActivityIdea.findById(idea.id);
  expect(saved.status).toBe('launched');
  expect((await Event.findById(saved.linkedEvent)).sourceIdeaId.toString()).toBe(idea.id);
  expect(await Event.countDocuments({ sourceIdeaId: idea._id })).toBe(1);
  expect(Notification.createNotification).toHaveBeenCalledTimes(2);
  expect((await call(`${idea.id}/launch`, owner, { eventId: saved.linkedEvent })).status).toBe(409);
  expect(Notification.createNotification).toHaveBeenCalledTimes(2);
});

test('one event cannot be linked to two different ideas concurrently', async () => {
  const ideas = await Promise.all([makeIdea(), makeIdea()]);
  const event = await makeEvent();
  const results = await Promise.all(ideas.map(idea => call(`${idea.id}/launch`, owner, { eventId: event.id })));
  expect(results.filter(result => result.status === 200)).toHaveLength(1);
  expect(results.filter(result => result.status === 409)).toHaveLength(1);
  expect(await ActivityIdea.countDocuments({ status: 'launched' })).toBe(1);
  expect(await ActivityIdea.countDocuments({ status: 'open', linkedEvent: null })).toBe(1);
});

test('conditional event failure compensates the idea and does not announce a launch', async () => {
  const idea = await makeIdea({ supporters: [{ user: stranger._id }] });
  const event = await makeEvent();
  jest.spyOn(Event, 'findOneAndUpdate').mockResolvedValue(null);
  expect((await call(`${idea.id}/launch`, owner, { eventId: event.id })).status).toBe(409);
  const saved = await ActivityIdea.findById(idea.id);
  expect(saved.status).toBe('open');
  expect(saved.linkedEvent).toBeUndefined();
  expect(Notification.createNotification).not.toHaveBeenCalled();
});

test('an event write error compensates the idea without pretending success', async () => {
  const idea = await makeIdea();
  const event = await makeEvent();
  jest.spyOn(Event, 'findOneAndUpdate').mockRejectedValue(new Error('Write unavailable'));
  expect((await call(`${idea.id}/launch`, owner, { eventId: event.id })).status).toBe(500);
  expect((await ActivityIdea.findById(idea.id)).status).toBe('open');
  expect(Notification.createNotification).not.toHaveBeenCalled();
});

test('admin can connect a valid event but notification errors do not undo a committed link', async () => {
  const idea = await makeIdea({ supporters: [{ user: owner._id }, { user: stranger._id }] });
  const event = await makeEvent({ createdBy: stranger._id });
  Notification.createNotification.mockRejectedValue(new Error('Delivery unavailable'));
  const result = await call(`${idea.id}/launch`, admin, { eventId: event.id });
  expect(result.status).toBe(200);
  expect(result.body.data.notified).toBe(0);
  expect((await ActivityIdea.findById(idea.id)).status).toBe('launched');
  expect((await Event.findById(event.id)).sourceIdeaId.toString()).toBe(idea.id);
});

test('expired open ideas are excluded from the public open list and demand', async () => {
  await makeIdea({ title: 'Idea vencida', quorumDeadline: new Date(Date.now() - 1000) });
  const live = await makeIdea({ title: 'Idea vigente', supportersCount: 99, quorumReached: true });
  const list = await request(app).get('/api/ideas');
  expect(list.body.data.map(idea => idea._id)).toEqual([live.id]);
  const demand = await request(app).get('/api/ideas/demand');
  expect(demand.body.data.totalIdeas).toBe(1);
  expect(demand.body.data.totalSupporters).toBe(1);
  expect(list.body.data[0].quorumReached).toBe(false);
});
