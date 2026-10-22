const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Idea = require('../src/models/ActivityIdea');
const Condition = require('../src/models/IdeaCondition');
const Notification = require('../src/models/Notification');
const { parseCondition, summarizeConditions } = require('../src/utils/ideaConditions');
const jwt = require('../src/services/jwtService');
const { app } = require('../src/server');
let author, host, stranger, tokens;
const call = (method, path, user = author, body = {}) => {
  const req = request(app)[method](`/api/ideas/${path}`);
  if (user) req.set('Authorization', `Bearer ${tokens.get(user.id)}`);
  return req.send(body);
};
const makeIdea = () => Idea.create({ title: 'Pintura en el parque', category: 'art', createdBy: author._id, supporters: [{ user: stranger._id }], quorumDeadline: new Date(Date.now() + 86400000) });
const makeEvent = (overrides = {}) => Event.create({ title: 'Taller de pintura', description: 'Taller abierto de pintura', category: 'other', createdBy: host._id, status: 'published', date: new Date(Date.now() + 86400000), location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Parque de pintura' }, ...overrides });
beforeAll(async () => {
  [author, host, stranger] = await User.create(['author', 'host', 'stranger'].map(name => ({ username: `market_${name}`, firstName: name, email: `market_${name}@example.test`, password: 'TestPassword1!', birthDate: new Date('1990-01-01') })));
  tokens = new Map([author, host, stranger].map(user => [user.id, jwt.generateTokenPair(user).accessToken]));
  await Condition.init();
});
beforeEach(async () => { await Promise.all([Idea.deleteMany({}), Event.deleteMany({}), Condition.deleteMany({})]); jest.spyOn(Notification, 'createNotification').mockResolvedValue({}); });
afterEach(() => jest.restoreAllMocks());
test.each([{ maxBudget: -1 }, { maxBudget: '200' }, { maxBudget: 0.001 }, { dayOfWeek: 7 }, { zone: { bad: true } }, { maxBudget: 20, currency: 'ZZZ' }])('invalid condition rejected %j', body => { expect(() => parseCondition(body)).toThrow(); });
test('aggregate suppresses all small groups and excludes identifying keys', () => {
  expect(summarizeConditions([{ user: 'secret', maxBudget: 100 }])).toEqual({ ready: false, minimumResponses: 5 });
  const result = summarizeConditions(Array.from({ length: 5 }, () => ({ maxBudget: 100, currency: 'DOP', zone: 'Santo Domingo', dayOfWeek: 6, user: 'secret' })));
  expect(result.budgets).toEqual([{ value: 'DOP: hasta 500', count: 5 }]);
  expect(JSON.stringify(result)).not.toContain('secret');
});
test('own responses private, replacement removes old fields, withdrawal allowed', async () => {
  const idea = await makeIdea();
  expect((await call('put', `${idea.id}/conditions`, author, { maxBudget: 500, zone: 'Mi zona' })).status).toBe(200);
  const guest = await call('get', `${idea.id}/conditions`, null);
  expect(guest.body.data.own).toBeNull(); expect(JSON.stringify(guest.body)).not.toContain('Mi zona');
  expect((await call('get', `${idea.id}/conditions`, stranger)).body.data.own).toBeNull();
  await call('put', `${idea.id}/conditions`, author, { dayOfWeek: 6 });
  expect((await call('get', `${idea.id}/conditions`, author)).body.data.own).toEqual({ currency: 'DOP', dayOfWeek: 6 });
  await call('put', `${idea.id}/conditions`, author, { remove: true });
  expect(await Condition.countDocuments()).toBe(0);
});
test('parallel updates retain only one response per user', async () => {
  const idea = await makeIdea();
  const results = await Promise.all(Array.from({ length: 5 }, () => call('put', `${idea.id}/conditions`, author, { maxBudget: 400 })));
  expect(results.every(r => r.status === 200)).toBe(true);
  expect(await Condition.countDocuments({ idea: idea.id, user: author.id })).toBe(1);
});
test('event proposals enforce ownership, public eligibility and duplicate concurrency', async () => {
  const idea = await makeIdea(), event = await makeEvent();
  expect((await call('post', `${idea.id}/proposals`, stranger, { eventId: event.id })).status).toBe(403);
  const results = await Promise.all(Array.from({ length: 5 }, () => call('post', `${idea.id}/proposals`, host, { eventId: event.id })));
  expect(results.filter(r => r.status === 201)).toHaveLength(1);
  expect((await Idea.findById(idea.id)).proposals).toHaveLength(1);
  await Event.updateOne({ _id: event.id }, { $set: { isPrivate: true } });
  expect((await call('get', `${idea.id}/proposals`, null)).body.data.proposals).toEqual([]);
});
test('accept only author; concurrent acceptance launches once with one fanout and no RSVP', async () => {
  const idea = await makeIdea(), event = await makeEvent();
  await call('post', `${idea.id}/proposals`, host, { eventId: event.id });
  const proposal = (await Idea.findById(idea.id)).proposals[0];
  expect((await call('post', `${idea.id}/proposals/${proposal.id}/accept`, host)).status).toBe(403);
  const results = await Promise.all(Array.from({ length: 4 }, () => call('post', `${idea.id}/proposals/${proposal.id}/accept`, author)));
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(Notification.createNotification).toHaveBeenCalledTimes(1);
  expect((await Idea.findById(idea.id)).status).toBe('launched');
  expect((await Event.findById(event.id)).attendees).toHaveLength(0);
  expect(String((await Event.findById(event.id)).sourceIdeaId)).toBe(idea.id);
});
test('newly private event cannot be accepted or notified', async () => {
  const idea = await makeIdea(), event = await makeEvent();
  await call('post', `${idea.id}/proposals`, host, { eventId: event.id });
  const proposal = (await Idea.findById(idea.id)).proposals[0];
  await Event.updateOne({ _id: event.id }, { $set: { isPrivate: true } });
  expect((await call('post', `${idea.id}/proposals/${proposal.id}/accept`, author)).status).toBe(409);
  expect(Notification.createNotification).not.toHaveBeenCalled();
});
