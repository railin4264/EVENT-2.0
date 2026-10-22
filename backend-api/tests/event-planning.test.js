const express = require('express');
const request = require('supertest');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const jwt = require('../src/services/jwtService');
const { budgetSummary, normalizePlanning } = require('../src/utils/eventPlanning');
const app = express(); app.use(express.json()); app.use('/api/event-planning', require('../src/routes/eventPlanning'));
let owner, other, token;
beforeEach(async () => {
  await Promise.all([Event.deleteMany({}), User.deleteMany({})]);
  [owner, other] = await User.create(['owner', 'other'].map(name => ({ username: `planning_${name}`, firstName: name, email: `${name}@planning.test`, password: 'Password!2026', birthDate: '1990-01-01' })));
  token = jwt.generateTokenPair(owner).accessToken;
});
const create = patch => Event.create({ title: 'Salida de prueba', description: 'Prueba de una salida con todos los gastos declarados', category: 'music', status: 'published', createdBy: owner._id, date: new Date(Date.now() + 86400000), price: { amount: 500, currency: 'DOP' }, location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Santo Domingo', city: 'Santo Domingo', countryCode: 'DO' }, ...patch });
const edit = (event, body, auth = token) => request(app).put(`/api/event-planning/${event.id}`).set('Authorization', `Bearer ${auth}`).send(body);
test('sum uses cents, excludes optional costs and labels incomplete costs', () => {
  const result = budgetSummary({ price: { amount: 0.1, currency: 'DOP' }, outingBudget: { mandatory: [{ label: 'Consumición', amount: 0.2, currency: 'DOP' }], optional: [{ label: 'Extra', amount: 3, currency: 'DOP' }] } });
  expect(result.knownMinimum).toBe(0.3); expect(result.complete).toBe(false); expect(result.optional).toHaveLength(1);
  expect(budgetSummary({}).entry).toBeNull();
});
test.each([{ amount: -1 }, { amount: '10' }, { amount: 0.123 }, { currency: 'USD' }, { label: '' }])('invalid budget rows reject %p', row => {
  expect(() => normalizePlanning({ budget: { complete: true, mandatory: [{ label: 'Consumo', amount: 10, currency: 'DOP', ...row }], optional: [] } }, 'DOP')).toThrow();
});
test('saving actual details persists and never changes entry or attendance', async () => {
  const event = await create();
  const response = await edit(event, { practical: { bring: 'Lleva agua' }, budget: { complete: true, mandatory: [{ label: 'Consumo mínimo', amount: 100, currency: 'DOP' }], optional: [] } });
  expect(response.status).toBe(200); expect(response.body.data.budget.knownMinimum).toBe(600);
  const saved = await Event.findById(event.id); expect(saved.price.amount).toBe(500); expect(saved.attendees).toHaveLength(0); expect(saved.practicalInfo.bring).toBe('Lleva agua');
});
test('requires owner and authentication; draft and private cannot leak through read', async () => {
  const event = await create();
  expect((await request(app).put(`/api/event-planning/${event.id}`).send({ practical: { bring: 'agua' } })).status).toBe(401);
  expect((await edit(event, { practical: {} }, jwt.generateTokenPair(other).accessToken)).status).toBe(403);
  for (const patch of [{ status: 'draft' }, { status: 'pending_review' }, { isPrivate: true }, { ageRestriction: { isAdultOnly: true } }]) {
    const hidden = await create(patch); expect((await request(app).get(`/api/event-planning/${hidden.id}`)).status).toBe(404);
  }
});
test('secret arrival instructions are withheld even though public practical information remains', async () => {
  const event = await create({ isSecretLocation: true, practicalInfo: { arrival: 'Código puerta 124', bring: 'Agua', parking: 'Calle secreta' } });
  const response = await request(app).get(`/api/event-planning/${event.id}`);
  expect(response.body.data.practical).toEqual({ bring: 'Agua' });
  expect(JSON.stringify(response.body)).not.toContain('124');
});
test('Plan B is cancelled-only, public, age-safe, same city and affordable known minimum', async () => {
  const source = await create({ status: 'cancelled' });
  const valid = await create({ title: 'Alternativa válida', timeZone: 'America/Santo_Domingo' });
  await create({ isPrivate: true }); await create({ isSecretLocation: true }); await create({ ageRestriction: { isAdultOnly: true } }); await create({ price: { amount: 600, currency: 'DOP' } });
  const response = await request(app).get(`/api/event-planning/${source.id}/alternatives`);
  expect(response.body.data.map(event => event.id)).toEqual([valid.id]);
  expect(response.body.data[0].timeZone).toBe('America/Santo_Domingo');
  expect((await request(app).get(`/api/event-planning/${valid.id}/alternatives`)).body.data).toEqual([]);
  expect((await Event.findById(valid.id)).attendees).toHaveLength(0);
});
test('recorded date changes enable options around the previous date', async () => {
  const source = await create({ date: new Date(Date.now() + 20 * 86400000), previousDate: new Date(Date.now() + 86400000), rescheduledAt: new Date() });
  const candidate = await create();
  const response = await request(app).get(`/api/event-planning/${source.id}/alternatives`);
  expect(response.body.data.map(row => row.id)).toEqual([candidate.id]);
  expect((await request(app).get(`/api/event-planning/${source.id}`)).body.data.alternativesAvailable).toBe(true);
});
