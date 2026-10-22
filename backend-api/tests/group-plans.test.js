const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const GroupPlan = require('../src/models/GroupPlan');
const jwtService = require('../src/services/jwtService');
const { app } = require('../src/server');
let owner, outsider, token, otherToken, events;

beforeAll(async () => {
  owner = await User.create({ username: 'plan_owner', email: 'planowner@example.com', password: 'TestPassword1!', firstName: 'Plan', lastName: 'Owner' });
  outsider = await User.create({ username: 'plan_other', email: 'planother@example.com', password: 'TestPassword1!', firstName: 'Other', lastName: 'User' });
  token = jwtService.generateTokenPair(owner).accessToken;
  otherToken = jwtService.generateTokenPair(outsider).accessToken;
});
beforeEach(async () => {
  await GroupPlan.deleteMany({});
  await Event.deleteMany({});
  events = await Event.create([1, 2, 3].map(index => ({ title: `Plan de prueba ${index}`, description: 'Evento de prueba aislado para planes en grupo',
    category: 'music', date: new Date(Date.now() + 7 * 86400000), createdBy: owner._id,
    location: { type: 'Point', coordinates: [-69.93456, 18.48678], address: 'Dirección exacta de prueba' } })));
});
const create = () => request(app).post('/api/plans').set('Authorization', `Bearer ${token}`)
  .send({ title: 'Nuestro próximo plan', eventIds: events.map(event => String(event._id)) });

test('creation requires auth and only accepts distinct public unrestricted future events', async () => {
  expect((await request(app).post('/api/plans').send({})).status).toBe(401);
  const duplicate = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`)
    .send({ title: 'Duplicados', eventIds: [String(events[0]._id), String(events[0]._id)] });
  expect(duplicate.status).toBe(400);
  for (const change of [{ isPrivate: true }, { 'ageRestriction.minAge': 18 }, { 'ageRestriction.maxAge': 17 },
    { 'ageRestriction.isAdultOnly': true }, { status: 'draft' }, { date: new Date(Date.now() - 1000) }]) {
    await Event.updateOne({ _id: events[0]._id }, { $set: change });
    expect((await create()).status).toBe(400);
    await Event.updateOne({ _id: events[0]._id }, { $set: { isPrivate: false, ageRestriction: { minAge: 0, isAdultOnly: false }, status: 'published', date: events[0].date } });
  }
});

test('shared links conceal voter identity, ownership and secret location', async () => {
  await Event.updateOne({ _id: events[0]._id }, { isSecretLocation: true });
  const created = await create();
  expect(created.status).toBe(201);
  const share = created.body.data.shareToken;
  expect(share).toMatch(/^[a-f0-9]{48}$/);
  const read = await request(app).get(`/api/plans/${share}`);
  expect(read.status).toBe(200);
  expect(read.body.data.isOwner).toBe(false);
  expect(read.body.data.options[0].event.location).toBe('Ubicación por confirmar');
  expect(JSON.stringify(read.body)).not.toMatch(/ballots|createdBy|planowner@example|coordinates/);
  const option = read.body.data.options[0];
  await Event.updateOne({ _id: events[0]._id }, { isPrivate: true });
  const hidden = await request(app).get(`/api/plans/${share}`);
  expect(hidden.body.data.options[0]).toMatchObject({ id: option.id, available: false, event: null });
});

test('guest votes persist with signed cookie, can change and concurrent retries count once', async () => {
  const plan = (await create()).body.data;
  const guest = request.agent(app);
  const opened = await guest.get(`/api/plans/${plan.shareToken}`);
  expect(opened.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  const vote = optionId => guest.post(`/api/plans/${plan.shareToken}/vote`).send({ optionId });
  const results = await Promise.all([vote(plan.options[0].id), vote(plan.options[1].id)]);
  expect(results.every(result => result.status === 200)).toBe(true);
  let read = await guest.get(`/api/plans/${plan.shareToken}`);
  expect(read.body.data.totalVotes).toBe(1);
  expect(read.body.data.options.reduce((sum, option) => sum + option.votes, 0)).toBe(1);
  await vote(plan.options[2].id);
  read = await guest.get(`/api/plans/${plan.shareToken}`);
  expect(read.body.data.myVote).toBe(plan.options[2].id);
  expect(read.body.data.totalVotes).toBe(1);
  expect(read.body.data.options[2].votes).toBe(1);
  const stranger = await request(app).get(`/api/plans/${plan.shareToken}`);
  expect(stranger.body.data.myVote).toBeNull();
});

test('only owner can decide a leading option and closed polls reject votes', async () => {
  const plan = (await create()).body.data;
  const guest = request.agent(app);
  await guest.get(`/api/plans/${plan.shareToken}`);
  await guest.post(`/api/plans/${plan.shareToken}/vote`).send({ optionId: plan.options[0].id });
  const path = `/api/plans/${plan.shareToken}/decide`;
  expect((await request(app).post(path).set('Authorization', `Bearer ${otherToken}`).send({ optionId: plan.options[0].id })).status).toBe(403);
  expect((await request(app).post(path).set('Authorization', `Bearer ${token}`).send({ optionId: plan.options[1].id })).status).toBe(400);
  const decided = await request(app).post(path).set('Authorization', `Bearer ${token}`).send({ optionId: plan.options[0].id });
  expect(decided.status).toBe(200);
  expect(decided.body.data).toMatchObject({ status: 'decided', selectedOptionId: plan.options[0].id });
  expect((await guest.post(`/api/plans/${plan.shareToken}/vote`).send({ optionId: plan.options[1].id })).status).toBe(409);
  expect((await request(app).post(path).set('Authorization', `Bearer ${token}`).send({ optionId: plan.options[0].id })).status).toBe(409);
});

test('expired polls cannot vote, invalid options and unknown links are rejected', async () => {
  const plan = (await create()).body.data;
  expect((await request(app).get('/api/plans/not-a-valid-token')).status).toBe(404);
  expect((await request(app).get(`/api/plans/${'a'.repeat(48)}`)).status).toBe(404);
  expect((await request(app).post(`/api/plans/${plan.shareToken}/vote`).send({ optionId: 'invented' })).status).toBe(400);
  await GroupPlan.updateOne({ shareToken: plan.shareToken }, { expiresAt: new Date(Date.now() - 1000) });
  const read = await request(app).get(`/api/plans/${plan.shareToken}`);
  expect(read.body.data.status).toBe('expired');
  expect((await request(app).post(`/api/plans/${plan.shareToken}/vote`).send({ optionId: plan.options[0].id })).status).toBe(409);
});

test('authenticated votes are one per account across browsers and mine only lists own polls', async () => {
  const plan = (await create()).body.data;
  for (const option of plan.options) {
    expect((await request(app).post(`/api/plans/${plan.shareToken}/vote`).set('Authorization', `Bearer ${otherToken}`).send({ optionId: option.id })).status).toBe(200);
  }
  const read = await request(app).get(`/api/plans/${plan.shareToken}`).set('Authorization', `Bearer ${otherToken}`);
  expect(read.body.data.totalVotes).toBe(1);
  expect(read.body.data.myVote).toBe(plan.options[2].id);
  expect((await request(app).get('/api/plans/mine').set('Authorization', `Bearer ${otherToken}`)).body.data).toEqual([]);
  expect((await request(app).get('/api/plans/mine').set('Authorization', `Bearer ${token}`)).body.data).toHaveLength(1);
});

test('the voting deadline cannot pass the beginning of the first event', async () => {
  const early = new Date(Date.now() + 3600000);
  await Event.updateOne({ _id: events[0]._id }, { date: early });
  const created = await create();
  expect(created.status).toBe(201);
  expect(new Date(created.body.data.expiresAt).getTime()).toBe(early.getTime());
});

test('an unavailable leading option does not prevent deciding the remaining leading choice', async () => {
  const plan = (await create()).body.data;
  for (let index = 0; index < 2; index++) {
    await request(app).post(`/api/plans/${plan.shareToken}/vote`).send({ optionId: plan.options[0].id });
  }
  await request(app).post(`/api/plans/${plan.shareToken}/vote`).set('Authorization', `Bearer ${otherToken}`).send({ optionId: plan.options[1].id });
  await Event.updateOne({ _id: events[0]._id }, { status: 'cancelled' });
  const decided = await request(app).post(`/api/plans/${plan.shareToken}/decide`).set('Authorization', `Bearer ${token}`).send({ optionId: plan.options[1].id });
  expect(decided.status).toBe(200);
  expect(decided.body.data.selectedOptionId).toBe(plan.options[1].id);
});

test('the participant cap is atomic while an existing participant can still change their vote', async () => {
  const plan = (await create()).body.data;
  const ownerHash = require('crypto').createHash('sha256').update(`user:${owner._id}`).digest('hex');
  const ballots = Object.fromEntries(Array.from({ length: 999 }, (_, index) => [`guest${index}`, plan.options[0].id]));
  ballots[ownerHash] = plan.options[0].id;
  await GroupPlan.updateOne({ shareToken: plan.shareToken }, { ballots });
  const guest = await request(app).post(`/api/plans/${plan.shareToken}/vote`).send({ optionId: plan.options[1].id });
  expect(guest.status).toBe(409);
  const existing = await request(app).post(`/api/plans/${plan.shareToken}/vote`).set('Authorization', `Bearer ${token}`).send({ optionId: plan.options[1].id });
  expect(existing.status).toBe(200);
  expect(existing.body.data.totalVotes).toBe(1000);
  expect(existing.body.data.myVote).toBe(plan.options[1].id);
});
