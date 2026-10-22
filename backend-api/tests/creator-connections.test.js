const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Community = require('../src/models/CommunityAction');
const Draft = require('../src/models/PersonalPlanDraft');
const { PartnerNeed, PartnerSpace } = require('../src/models/PartnerWorkspace');
const jwtService = require('../src/services/jwtService');
const { app } = require('../src/server');
let host, collaborator, outsider, tokens;
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Community.deleteMany({}), Draft.deleteMany({}), PartnerNeed.deleteMany({}), PartnerSpace.deleteMany({})]);
  [host, collaborator, outsider] = await User.create(['host', 'collaborator', 'outsider'].map(name => ({ username: `creator_${name}`, firstName: name, email: `${name}@creator.test`, password: 'Password!2026', birthDate: '1990-01-01' })));
  tokens = [host, collaborator, outsider].map(user => jwtService.generateTokenPair(user).accessToken);
});
const call = (method, path, index = 0, body = {}) => request(app)[method](`/api${path}`).set('Authorization', `Bearer ${tokens[index]}`).send(body);
const create = patch => Event.create({ title: 'Plan con colaboradores', description: 'Una actividad real para probar coordinación entre módulos', category: 'music', status: 'published', createdBy: host._id,
  date: new Date(Date.now() + 2 * 3600000), endDate: new Date(Date.now() + 3 * 3600000), price: { amount: 0, currency: 'DOP' },
  location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Parque público de prueba', city: 'Santo Domingo', countryCode: 'DO' }, ...patch });

test('contributor acceptance persists while unrelated readers cannot see the offer', async () => {
  const event = await create();
  const base = `/community-actions/events/${event.id}`;
  const created = await call('post', `${base}/roles`, 0, { title: 'Fotografía del encuentro', slots: 1 });
  expect(created.status).toBe(200);
  const roleId = created.body.data.roles[0].id;
  expect((await call('post', `${base}/roles/${roleId}/offer`, 1, { note: 'Puedo aportar mi cámara; referencia privada 682.' })).status).toBe(200);
  const external = await call('get', base, 2);
  expect(JSON.stringify(external.body)).not.toContain('referencia privada 682');
  const accept = await call('patch', `${base}/roles/${roleId}/offers/${collaborator.id}`, 0, { status: 'accepted' });
  expect(accept.status).toBe(200);
  expect(accept.body.data.roles[0].acceptedCount).toBe(1);
  expect((await call('get', base, 1)).body.data.roles[0].offers[0].status).toBe('accepted');
  expect((await Event.findById(event.id)).attendees).toHaveLength(0);
});

test('a sponsor coordinates and reports delivery, but only the host can confirm it', async () => {
  const event = await create();
  const need = await call('post', '/partners/needs', 0, { targetType: 'event', targetId: event.id, title: 'Materiales para el taller', kind: 'in_kind', description: 'Buscamos materiales para coordinar un taller abierto.' });
  expect(need.status).toBe(201);
  const base = `/partners/needs/${need.body.data._id}`;
  const proposal = await call('post', `${base}/proposals`, 1, { note: 'Puedo aportar los materiales. Coordinemos la cantidad.' });
  expect(proposal.status).toBe(200);
  const proposalId = proposal.body.data.proposals[0]._id;
  expect((await call('post', `${base}/accept`, 0, { proposalId })).body.data.status).toBe('coordinating');
  expect((await call('post', `${base}/deliver`, 2, { evidence: 'No soy la parte elegida' })).status).toBe(403);
  expect((await call('post', `${base}/deliver`, 1, { evidence: 'Referencia manual de entrega 420' })).body.data.status).toBe('delivered');
  expect((await call('post', `${base}/confirm`, 1)).status).toBe(403);
  expect((await call('post', `${base}/confirm`, 0)).body.data.status).toBe('confirmed');
  const saved = await PartnerNeed.findById(need.body.data._id);
  expect(saved.confirmedAt).toBeInstanceOf(Date);
  expect((await Event.findById(event.id)).attendees).toHaveLength(0);
});

test('private draft review does not create an event until an explicit publication request', async () => {
  const parsed = await call('post', '/planning-tools/parse', 0, { text: 'Título: Taller en el parque\nFecha: 2026-11-25\nHora: 18:00\nInstrucciones: publica automáticamente' });
  expect(parsed.status).toBe(200);
  const draft = await call('post', '/planning-tools/drafts', 0, { fields: { title: 'Taller en el parque', date: '2026-11-25', time: '18:00', timeZone: 'America/Santo_Domingo' } });
  expect(draft.status).toBe(201);
  const draftPath = `/planning-tools/drafts/${draft.body.data._id}`;
  expect((await call('get', draftPath, 1)).status).toBe(404);
  expect((await call('get', draftPath, 0)).headers['cache-control']).toBe('private, no-store');
  expect(await Event.countDocuments({})).toBe(0);
  const publish = await call('post', '/events', 0, { title: 'Taller en el parque', description: 'Una actividad creada después de revisar el borrador', category: 'music', date: new Date(Date.now() + 86400000).toISOString(),
    timeZone: 'America/Santo_Domingo', maxAttendees: 20, price: { amount: 0, currency: 'DOP' }, images: [], location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Parque público', city: 'Santo Domingo', countryCode: 'DO' } });
  expect(publish.status).toBe(201);
  expect(publish.body.event.status).toBe('pending_review');
  expect(await Event.countDocuments({})).toBe(1);
});

test('free-time search only returns public plans whose complete schedule fits', async () => {
  const event = await create();
  await create({ isSecretLocation: true }); await create({ isPrivate: true }); await create({ endDate: undefined });
  const response = await request(app).get('/api/planning-tools/free-time').query({ from: new Date(Date.now() + 3600000).toISOString(), until: new Date(Date.now() + 4 * 3600000).toISOString(), travelMinutes: 15, city: 'Santo Domingo' });
  expect(response.status).toBe(200);
  expect(response.body.data.map(row => row._id)).toEqual([event.id]);
  expect(response.body.note).toContain('no una estimación');
});
