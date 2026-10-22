const express = require('express');
const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Tribe = require('../src/models/Tribe');
const app = express(); app.use(express.json()); app.use('/api/search', require('../src/routes/search'));
let owner;
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Tribe.deleteMany({})]);
  owner = await User.create({ username: 'coro_creator', firstName: 'Coro', lastName: 'Creator', email: 'host@search.test', password: 'Password!2026', role: 'creator' });
});
const event = patch => Event.create({ title: 'Coro musical', description: 'Una experiencia pública para conectar personas', category: 'music', status: 'published', createdBy: owner._id, date: new Date(Date.now() + 86400000), price: { amount: 500, currency: 'DOP' }, location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Calle confidencial 123', city: 'Santo Domingo' }, ...patch });
const tribe = patch => Tribe.create({ name: 'Coro de música', description: 'Una comunidad para personas que aman la música', category: 'music', creator: owner._id, ...patch });
test('anonymous search returns events, public tribes and people in one canonical response', async () => {
  await event({}); await tribe({});
  const response = await request(app).get('/api/search?q=Coro&type=all');
  expect(response.status).toBe(200); expect(response.body.results.map(item => item.type).sort()).toEqual(['event', 'tribe', 'user']);
  expect(response.body.results.find(item => item.type === 'user').metadata.isHost).toBe(true);
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(JSON.stringify(response.body)).not.toContain('host@search.test'); expect(JSON.stringify(response.body)).not.toContain('password');
});
test('drafts, private events, hidden accounts and private/secret tribes are never returned', async () => {
  await event({ title: 'Coro draft', status: 'draft' }); await event({ title: 'Coro privado', isPrivate: true }); await event({ title: 'Coro adulto', ageRestriction: { isAdultOnly: true } });
  await tribe({ name: 'Coro privado', settings: { privacy: 'private' } }); await tribe({ name: 'Coro secreto', settings: { privacy: 'secret' } });
  await User.create({ username: 'coro_hidden', firstName: 'Coro', email: 'hidden@search.test', password: 'Password!2026', isPrivate: true });
  const response = await request(app).get('/api/search?q=coro');
  expect(response.body.results).toHaveLength(1); expect(response.body.results[0].id).toBe(owner.id);
});
test('secret event searches reveal neither exact location nor allow address-based inference', async () => {
  const secret = await event({ isSecretLocation: true });
  const response = await request(app).get('/api/search?q=coro&type=events');
  expect(response.body.results[0].id).toBe(secret.id);
  const serialized = JSON.stringify(response.body); expect(serialized).not.toContain('confidencial'); expect(serialized).not.toContain('-69.9');
  expect(response.body.results[0].metadata.location).toBe('Ubicación reservada');
  const filtered = await request(app).get('/api/search?q=coro&type=events&location=confidencial'); expect(filtered.body.results).toHaveLength(0);
});
test('host filter matches creator and organizer accounts, not every person', async () => {
  await User.create({ username: 'coro_person', firstName: 'Coro', email: 'person@search.test', password: 'Password!2026' });
  const response = await request(app).get('/api/search?q=coro&type=hosts'); expect(response.body.results.map(item => item.id)).toEqual([owner.id]);
});
test.each(['q[$ne]=x', 'q=coro&type=unknown', 'q=coro&page=-1', 'q=coro&limit=10000', 'q=coro&minPrice=-1', 'q=coro&startDate=invalid', 'q=' + 'x'.repeat(101)])('rejects malformed parameters %s', async query => {
  expect((await request(app).get(`/api/search?${query}`)).status).toBe(400);
});
test('regex syntax is searched literally and cannot match the entire catalog', async () => {
  await event({}); const response = await request(app).get('/api/search').query({ q: '.*', type: 'events' });
  expect(response.status).toBe(200); expect(response.body.results).toHaveLength(0);
});
test('pagination is bounded and deterministic and existing aliases remain privacy safe', async () => {
  await event({ title: 'Coro uno' }); await event({ title: 'Coro dos' });
  const first = await request(app).get('/api/search?q=coro&type=events&limit=1'); const second = await request(app).get('/api/search?q=coro&type=events&limit=1&page=2');
  expect(first.body.pagination.hasMore).toBe(true); expect(second.body.results[0].id).not.toBe(first.body.results[0].id);
  expect((await request(app).get('/api/search/global?q=coro&type=events')).body.results.events.total).toBe(2);
  expect((await request(app).get('/api/search/suggestions?q=coro&type=events')).body.suggestions).toHaveLength(2);
});

test('people who actually publish public events are hosts even with an ordinary account role', async () => {
  const people = await User.create(['actualhost', 'privatehost'].map(name => ({ username: `coro_${name}`, firstName: 'Coro', email: `${name}@search.test`, password: 'Password!2026' })));
  await event({ createdBy: people[0]._id }); await event({ createdBy: people[1]._id, isPrivate: true });
  const response = await request(app).get('/api/search?q=coro&type=hosts');
  expect(response.body.results.map(item => item.id).sort()).toEqual([owner.id, people[0].id].sort());
  expect(response.body.results.find(item => item.id === people[0].id).metadata.isHost).toBe(true);
});

test('common accented words can be found without accents while regex metacharacters stay literal', async () => {
  const found = await event({ title: 'Festival de Música', tags: [] });
  const response = await request(app).get('/api/search?q=musica&type=events');
  expect(response.body.results.map(item => item.id)).toEqual([found.id]);
});
test('event category and amount filters are applied server-side', async () => {
  await event({});
  expect((await request(app).get('/api/search?q=coro&type=events&category=music&minPrice=400&maxPrice=600')).body.results).toHaveLength(1);
  expect((await request(app).get('/api/search?q=coro&type=events&minPrice=501')).body.results).toHaveLength(0);
  expect((await request(app).get('/api/search?q=coro&type=events&category=art')).body.results).toHaveLength(0);
});

test('global and location searches find public events by city and venue without disclosing reserved addresses', async () => {
  const match = await event({ title: 'Jazz al atardecer', location: { type: 'Point', coordinates: [-3.7, 40.4], address: 'Calle del Arte 10', city: 'Madrid', country: 'España', venue: 'Sala Central' } });
  expect((await request(app).get('/api/search?q=Madrid')).body.results.map(item => item.id)).toContain(match.id);
  expect((await request(app).get('/api/search?q=Central&type=locations')).body.results.map(item => item.id)).toEqual([match.id]);
  await event({ title: 'Actividad privada', isSecretLocation: true, location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Destino reservado', venue: 'Recinto secreto', city: 'Santiago' } });
  expect((await request(app).get('/api/search?q=reservado&type=locations')).body.results).toHaveLength(0);
  expect((await request(app).get('/api/search?q=secreto&type=locations')).body.results).toHaveLength(0);
});

test('usernames can be searched with the familiar @ prefix', async () => {
  const response = await request(app).get('/api/search').query({ q: '@coro_creator', type: 'users' });
  expect(response.body.results.map(item => item.id)).toEqual([owner.id]);
});
