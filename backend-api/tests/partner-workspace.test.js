const express = require('express');
const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Idea = require('../src/models/ActivityIdea');
const { PartnerNeed: Need, PartnerSpace: Space } = require('../src/models/PartnerWorkspace');
const jwt = require('../src/services/jwtService');
const { evidence } = require('../src/services/partnerWorkspace');
const app = express(); app.use(express.json()); app.use('/partners', require('../src/routes/partners'));
let owner, sponsor, outsider, event, tokens;
const send = (path, who, body = {}) => request(app).post(`/partners${path}`).set('Authorization', `Bearer ${tokens[who]}`).send(body);
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Idea.deleteMany({}), Need.deleteMany({}), Space.deleteMany({})]);
  [owner, sponsor, outsider] = await User.create(['host', 'sponsor', 'outsider'].map(name => ({ username: `partner_${name}`, email: `${name}@partners.test`, firstName: name, password: 'Password!2026', birthDate: '1990-01-01' })));
  tokens = Object.fromEntries([['owner', owner], ['sponsor', sponsor], ['outsider', outsider]].map(([k, v]) => [k, jwt.generateTokenPair(v).accessToken]));
  event = await Event.create({ title: 'Coro con aliados', description: 'Un evento para probar colaboraciones honestas', category: 'music', status: 'published', createdBy: owner._id, date: new Date(Date.now() + 86400000), location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Lugar privado no se exporta' }, attendees: [{ user: owner._id, status: 'attending' }, { user: sponsor._id, status: 'pending' }] });
});
const make = async (kind = 'in_kind') => (await send('/needs', 'owner', { title: 'Necesitamos apoyo', description: 'Servicios para realizar el encuentro', kind, targetType: 'event', targetId: event.id })).body.data;
const propose = (need, who = 'sponsor', extra = {}) => send(`/needs/${need._id}/proposals`, who, { note: 'Podemos aportar el equipo y coordinar', ...extra });
test('owner opts in and public kit has real aggregates without identities or exact address', async () => {
  await make(); const response = await request(app).get('/partners/needs');
  expect(response.status).toBe(200); expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.body.data[0].resource.audience).toBe(1);
  const json = JSON.stringify(response.body); expect(json).not.toContain(owner.id); expect(json).not.toContain(sponsor.email); expect(json).not.toContain('Lugar privado');
});
test('creation requires authentication and source ownership', async () => {
  expect((await request(app).post('/partners/needs').send({})).status).toBe(401);
  expect((await send('/needs', 'sponsor', { title: 'Ajeno', description: 'Ajeno', kind: 'in_kind', targetType: 'event', targetId: event.id })).status).toBe(403);
});

test('expired legacy ideas are not offered as collaboration targets', async () => {
  const old = await Idea.create({ title: 'Idea antigua sin plazo', category: 'music', createdBy: owner._id, createdAt: new Date(Date.now() - 20 * 86400000) });
  const targets = await request(app).get('/partners/targets').set('Authorization', `Bearer ${tokens.owner}`);
  expect(targets.body.data.some(row => row._id === old.id)).toBe(false);
  expect((await send('/needs', 'owner', { title: 'Apoyo para idea vencida', description: 'No debe aceptar nuevas colaboraciones', kind: 'in_kind', targetType: 'idea', targetId: old.id })).status).toBe(403);
});
test.each([{ isPrivate: true }, { status: 'cancelled' }, { status: 'pending_review' }])('unavailable source never appears in public feeds %p', async patch => {
  await make(); await Event.updateOne({ _id: event._id }, { $set: patch });
  expect((await request(app).get('/partners/needs')).body.data).toEqual([]);
  const mine = await request(app).get('/partners/mine').set('Authorization', `Bearer ${tokens.owner}`);
  expect(mine.body.data.needs[0].resource).toBeNull();
});
test('concurrent duplicate proposals persist once and cannot self-propose', async () => {
  const need = await make(); const results = await Promise.all([propose(need), propose(need)]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect((await Need.findById(need._id)).proposals).toHaveLength(1);
  expect((await propose(need, 'owner')).status).toBe(400);
});
test('only one concurrent acceptance wins; only host selects', async () => {
  const need = await make(); await propose(need); await propose(need, 'outsider'); const saved = await Need.findById(need._id);
  expect((await send(`/needs/${need._id}/accept`, 'outsider', { proposalId: saved.proposals[0].id })).status).toBe(403);
  const results = await Promise.all(saved.proposals.map(p => send(`/needs/${need._id}/accept`, 'owner', { proposalId: p.id })));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
});
test('delivery is self-reported until the beneficiary confirms, with participant-only evidence', async () => {
  const need = await make(); await propose(need); const proposal = (await Need.findById(need._id)).proposals[0];
  await send(`/needs/${need._id}/accept`, 'owner', { proposalId: proposal.id });
  expect((await send(`/needs/${need._id}/deliver`, 'outsider', { evidence: 'REF' })).status).toBe(403);
  expect((await send(`/needs/${need._id}/confirm`, 'sponsor')).status).toBe(403);
  expect((await send(`/needs/${need._id}/deliver`, 'sponsor', { evidence: 'REF-001' })).body.data.status).toBe('delivered');
  const own = await request(app).get('/partners/mine').set('Authorization', `Bearer ${tokens.owner}`); expect(own.body.data.needs[0].evidence).toBe('REF-001');
  expect((await send(`/needs/${need._id}/confirm`, 'owner')).body.data.status).toBe('confirmed');
  expect((await send(`/needs/${need._id}/confirm`, 'owner')).status).toBe(409);
});
test('proposals are isolated by account and never public', async () => {
  const need = await make(); await propose(need);
  expect((await request(app).get('/partners/needs')).body.data[0].proposals).toEqual([]);
  expect((await request(app).get('/partners/mine').set('Authorization', `Bearer ${tokens.outsider}`)).body.data.needs).toEqual([]);
  expect((await request(app).get('/partners/mine').set('Authorization', `Bearer ${tokens.sponsor}`)).body.data.needs[0].proposals).toHaveLength(1);
});
test('only own active spaces may be offered, capacity and explicit conditions validated', async () => {
  const b = { title: 'Estudio de prueba', city: 'Santo Domingo', country: 'República Dominicana', capacity: 20, conditions: 'Coordinar precio y horario', availability: 'Sábados a consultar', accessibility: 'Planta baja' };
  expect((await send('/spaces', 'sponsor', { ...b, capacity: -1 })).status).toBe(400);
  const space = (await send('/spaces', 'sponsor', b)).body.data;
  const need = await make('space');
  expect((await propose(need, 'outsider', { spaceId: space._id })).status).toBe(403);
  expect((await propose(need, 'sponsor', { spaceId: space._id })).status).toBe(200);
  expect(JSON.stringify((await request(app).get('/partners/spaces')).body)).not.toContain(sponsor.id);
  expect((await send(`/spaces/${space._id}/close`, 'outsider')).status).toBe(404);
  await send(`/spaces/${space._id}/close`, 'sponsor'); expect((await request(app).get('/partners/spaces')).body.data).toEqual([]);
  const proposal = (await Need.findById(need._id)).proposals[0];
  expect((await send(`/needs/${need._id}/accept`, 'owner', { proposalId: proposal.id })).status).toBe(409);
});
test('open ideas accept venue needs; closed ideas do not and aggregate deduplicates supporters', async () => {
  const idea = await Idea.create({ title: 'Un taller en mi barrio', category: 'other', createdBy: owner._id, supporters: [{ user: sponsor._id }, { user: sponsor._id }] });
  const response = await send('/needs', 'owner', { title: 'Un espacio para el taller', description: 'Buscamos un salón accesible', kind: 'space', targetType: 'idea', targetId: idea.id });
  expect(response.status).toBe(201); expect(response.body.data.resource.audience).toBe(1);
  await Idea.updateOne({ _id: idea._id }, { status: 'closed' }); expect((await request(app).get('/partners/needs')).body.data).toEqual([]);
});
test('source selector returns only available own activities', async () => {
  expect((await request(app).get('/partners/targets').set('Authorization', `Bearer ${tokens.owner}`)).body.data[0]._id).toBe(event.id);
  expect((await request(app).get('/partners/targets').set('Authorization', `Bearer ${tokens.sponsor}`)).body.data).toEqual([]);
});
test.each(['javascript:alert(1)', 'data:text/html,test', 'https://user:secret@example.test/'])('unsafe evidence is rejected %s', input => { expect(() => evidence(input)).toThrow(); });
test('coordination messages are isolated to host and selected partner', async () => {
  const need = await make(); await propose(need); const proposal = (await Need.findById(need._id)).proposals[0];
  await send(`/needs/${need._id}/accept`, 'owner', { proposalId: proposal.id });
  expect((await send(`/needs/${need._id}/messages`, 'outsider', { text: 'No autorizado' })).status).toBe(403);
  expect((await send(`/needs/${need._id}/messages`, 'owner', { text: 'Entrega a las 10' })).body.data.messages[0].role).toBe('host');
  const response = await send(`/needs/${need._id}/messages`, 'sponsor', { text: 'Confirmado' }); expect(response.body.data.messages).toHaveLength(2);
  expect(JSON.stringify(response.body.data.messages)).not.toContain(owner.id);
  await send(`/needs/${need._id}/deliver`, 'sponsor'); await send(`/needs/${need._id}/confirm`, 'owner');
  expect((await send(`/needs/${need._id}/messages`, 'sponsor', { text: 'Terminó' })).status).toBe(409);
});
test('age restricted needs hide from guests but remain available to eligible sponsors', async () => {
  await make(); await Event.updateOne({ _id: event._id }, { 'ageRestriction.minAge': 18 });
  expect((await request(app).get('/partners/needs')).body.data).toEqual([]);
  expect((await request(app).get('/partners/needs').set('Authorization', `Bearer ${tokens.sponsor}`)).body.data).toHaveLength(1);
});
test('secret location never exports city in kit resource', async () => {
  await make(); await Event.updateOne({ _id: event._id }, { isSecretLocation: true });
  expect((await request(app).get('/partners/needs')).body.data[0].resource.city).toBeUndefined();
});
