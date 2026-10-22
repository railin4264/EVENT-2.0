const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const jwtService = require('../src/services/jwtService');
const { invalidateCache } = require('../src/middleware/cache');
const { activeEventTimeFilter } = require('../src/utils/eventListFilters');
const { app } = require('../src/server');

let owner, attendee, token;
const HOUR = 3600000;
const seed = (title, offset, overrides = {}) => Event.create({ title, description: 'Evento aislado para comprobar filtros antes de paginar', category: 'music',
  date: new Date(Date.now() + offset), createdBy: owner._id, status: 'published', price: { amount: 0, currency: 'DOP' },
  location: { type: 'Point', coordinates: [-70.669, -33.448], address: 'Lugar público de Santiago', city: 'Santiago', country: 'Chile', countryCode: 'CL' }, ...overrides });
const get = (query = {}, authenticated = false) => {
  const call = request(app).get('/api/events').query({ timeFilter: 'upcoming', ...query });
  return authenticated ? call.set('Authorization', `Bearer ${token}`) : call;
};

beforeAll(async () => {
  [owner, attendee] = await User.create(['owner', 'attendee'].map(name => ({ username: `pagination_${name}`, email: `pagination-${name}@example.com`,
    firstName: name, password: 'TestPassword1!', birthDate: new Date('1990-01-01') })));
  token = jwtService.generateTokenPair(attendee).accessToken;
  await Event.init();
});

beforeEach(async () => { await Event.deleteMany({}); await User.updateOne({ _id: attendee._id }, { $set: { favorites: [] } }); invalidateCache(); });

test('category, country, city, currency and budget filter before limit/count instead of filtering the first page', async () => {
  await seed('Otra categoría primero', HOUR, { category: 'art' });
  await seed('Caro primero', 2 * HOUR, { price: { amount: 500, currency: 'DOP' } });
  await seed('Otra moneda primero', 3 * HOUR, { price: { amount: 5, currency: 'EUR' } });
  const paid = await seed('Música dentro del presupuesto', 4 * HOUR, { price: { amount: 80, currency: 'DOP' } });
  const free = await seed('Gratis en otra moneda', 5 * HOUR, { price: { amount: 0, currency: 'USD' } });
  await seed('Otro país no pasa', HOUR, { location: { type: 'Point', coordinates: [-70.7, 19.4], address: 'Santiago Dominicana', city: 'Santiago', countryCode: 'DO' } });
  await seed('Privado no pasa', HOUR, { isPrivate: true });
  await seed('Adulto no pasa', HOUR, { ageRestriction: { minAge: 21, isAdultOnly: true } });
  const query = { categories: 'music,sports', countryCode: 'cl', city: 'sANTIago', currency: 'dop', priceMax: 100, limit: 1 };
  const first = await get(query);
  expect(first.status).toBe(200);
  expect(first.body.events.map(item => item._id)).toEqual([paid.id]);
  expect(first.body.pagination).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
  const second = await get({ ...query, page: 2 });
  expect(second.body.events.map(item => item._id)).toEqual([free.id]);
});

test('a bounded monetary interval preserves decimals, the chosen currency and the explicit free branch', async () => {
  const paid = await seed('Precio exacto', HOUR, { price: { amount: 25.99, currency: 'USD' } });
  const free = await seed('Gratis siempre compatible', 2 * HOUR, { price: { amount: 0, currency: 'EUR' } });
  await seed('Demasiado barato', HOUR, { price: { amount: 10, currency: 'USD' } });
  await seed('Moneda sin convertir', HOUR, { price: { amount: 25.99, currency: 'DOP' } });
  const response = await get({ currency: 'USD', priceMin: 25.99, priceMax: 25.99 });
  expect(response.status).toBe(200);
  expect(response.body.events.map(item => item._id)).toEqual([paid.id, free.id]);
  const legacy = await get({ priceMin: 25.99, priceMax: 25.99 });
  expect(legacy.body.events).toHaveLength(2);
  expect(legacy.body.events.every(item => item.price.amount === 25.99)).toBe(true);
});

test('freeOnly and secretOnly combine before pagination and never remove privacy rules', async () => {
  await seed('Gratis pero público sin secreto', HOUR);
  await seed('Secreto de pago', 2 * HOUR, { isSecretLocation: true, price: { amount: 10, currency: 'USD' } });
  await seed('Privado gratis secreto', HOUR, { isSecretLocation: true, isPrivate: true });
  const match = await seed('Gratis y secreto', 3 * HOUR, { isSecretLocation: true });
  const response = await get({ freeOnly: true, secretOnly: true, limit: 1 });
  expect(response.status).toBe(200);
  expect(response.body.events.map(item => item._id)).toEqual([match.id]);
  expect(response.body.pagination.total).toBe(1);
  expect(response.body.events[0].location.address).toMatch(/secreta/i);
  const noFlags = await get({ freeOnly: false, secretOnly: false });
  expect(noFlags.body.pagination.total).toBe(3);
});

test('hideAdultOnly remains an AND clause for authenticated adults even when a free currency branch matches', async () => {
  const publicEvent = await seed('Evento sin restricción', 2 * HOUR);
  await seed('Solo adultos por bandera', HOUR, { ageRestriction: { minAge: 0, isAdultOnly: true } });
  await seed('Solo adultos por edad', HOUR, { ageRestriction: { minAge: 18, isAdultOnly: false } });
  const response = await get({ currency: 'USD', priceMax: 10, hideAdultOnly: true, limit: 1 }, true);
  expect(response.status).toBe(200);
  expect(response.body.events.map(item => item._id)).toEqual([publicEvent.id]);
  expect(response.body.pagination.total).toBe(1);
  const visibleToAdult = await get({ hideAdultOnly: false }, true);
  expect(visibleToAdult.body.pagination.total).toBe(3);
  expect((await get({ hideAdultOnly: false })).body.pagination.total).toBe(1);
});

test('start intervals use explicit timezone instants with inclusive lower and exclusive upper limits before pagination', async () => {
  const from = new Date(Date.now() + 24 * HOUR), until = new Date(from.getTime() + 2 * HOUR);
  await seed('Antes del intervalo', HOUR, { date: new Date(from.getTime() - 1) });
  const first = await seed('Inicio inclusivo', HOUR, { date: from });
  const second = await seed('Dentro del intervalo', HOUR, { date: new Date(from.getTime() + HOUR) });
  await seed('Final excluido', HOUR, { date: until });
  const offsetUpper = new Date(until.getTime() - 4 * HOUR).toISOString().replace('Z', '-04:00');
  const query = { startsAfter: from.toISOString(), startsBefore: offsetUpper, limit: 1 };
  const response = await get(query);
  expect(response.status).toBe(200);
  expect(response.body.events.map(item => item._id)).toEqual([first.id]);
  expect(response.body.pagination).toMatchObject({ total: 2, pages: 2 });
  expect((await get({ ...query, page: 2 })).body.events.map(item => item._id)).toEqual([second.id]);
});

test('upcoming includes an estimated live duration without endDate and excludes explicit or estimated ends', async () => {
  const estimated = await seed('En curso con final estimado', -HOUR);
  const explicit = await seed('En curso con final explícito', -2 * HOUR, { endDate: new Date(Date.now() + HOUR) });
  const future = await seed('Empieza luego', HOUR);
  await seed('Final estimado agotado', -2 * HOUR);
  await seed('Final explícito agotado', -3 * HOUR, { endDate: new Date() });
  const response = await get();
  expect(response.status).toBe(200);
  expect(response.body.events.map(item => item._id)).toEqual([explicit.id, estimated.id, future.id]);
  const live = await get({ liveOnly: true, limit: 1 });
  expect(live.status).toBe(200);
  expect(live.body.events.map(item => item._id)).toEqual([explicit.id]);
  expect(live.body.pagination.total).toBe(2);
  expect((await get({ liveOnly: true, limit: 1, page: 2 })).body.events.map(item => item._id)).toEqual([estimated.id]);
});

test('the active-time predicate uses a strict end boundary while retaining an estimated two-hour start boundary', () => {
  const now = new Date('2026-10-18T12:00:00.000Z');
  expect(activeEventTimeFilter(now)).toEqual({ $or: [{ endDate: { $gt: now } }, { endDate: null, date: { $gt: new Date('2026-10-18T10:00:00.000Z') } }] });
});

test('listing attendance and ObjectId favorites remain true after real mutations, populated reads and a second request', async () => {
  const event = await seed('Asistencia persistente', 2 * HOUR);
  expect((await request(app).post(`/api/events/${event.id}/attend`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
  expect((await request(app).post(`/api/events/${event.id}/favorite`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
  for (let read = 0; read < 2; read++) {
    const response = await get({ limit: 1 }, true);
    expect(response.status).toBe(200);
    expect(response.body.events[0]).toMatchObject({ _id: event.id, isAttending: true, isFavorite: true });
  }
  await Event.updateOne({ _id: event._id, 'attendees.user': attendee._id }, { $set: { 'attendees.$.status': 'pending' } });
  expect((await get({}, true)).body.events[0].isAttending).toBe(false);
});

test('invalid ranges, non-finite prices, ambiguous dates, invalid flags and malformed currencies return 400', async () => {
  const invalidQueries = [
    { priceMax: 'NaN' }, { priceMax: 'Infinity' }, { priceMax: '1garbage' }, { priceMax: -1 }, { priceMax: '100000000.01' }, { priceMin: '' },
    { priceMin: 20, priceMax: 10 }, { currency: 'US' }, { currency: 'USD<script>' }, { freeOnly: 1 }, { secretOnly: 'yes' }, { hideAdultOnly: 'TRUE' }, { liveOnly: 'anything' },
    { startsAfter: '2026-10-18' }, { startsAfter: '2026-10-18T12:00:00' }, { startsAfter: '2026-02-30T12:00:00Z' }, { startsAfter: '2026-10-18T24:00:00Z' },
    { startsAfter: '2026-10-18T12:00:00+24:00' }, { startsAfter: '2026-10-19T12:00:00Z', startsBefore: '2026-10-18T12:00:00Z' },
    { startsAfter: '2026-10-18T12:00:00Z', startsBefore: '2026-10-18T12:00:00Z' }, { priceMax: { invalid: 'object' } }
  ];
  for (const query of invalidQueries) {
    const response = await get(query);
    expect({ query, status: response.status }).toEqual({ query, status: 400 });
    expect(response.body.success).toBe(false);
  }
});
