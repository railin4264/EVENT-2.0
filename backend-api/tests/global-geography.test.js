const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');
const jwtService = require('../src/services/jwtService');
const { invalidateCache } = require('../src/middleware/cache');
const { app } = require('../src/server');

let adult, minor, tokens, fixtures;
const location = (city, country, countryCode, coordinates) => ({ type: 'Point', coordinates, address: `${city} lugar público`, city, country, countryCode });
const seed = (title, place, extra = {}) => Event.create({ title, description: 'Evento público de prueba geográfica aislada', category: 'music',
  date: new Date(Date.now() + 5 * 86400000), createdBy: adult._id, location: place, timeZone: 'UTC',
  // One real interest signal: /trending lists only events with interaction.
  interestedCount: 1, ...extra });
const get = (path, token) => token ? request(app).get(path).set('Authorization', `Bearer ${token}`) : request(app).get(path);
const items = response => response.body.events || response.body.data;
const routes = ['/api/events', '/api/events/featured', '/api/events/trending', '/api/events/for-you'];

beforeAll(async () => {
  [adult, minor] = await User.create([
    { username: 'geo_adult', email: 'geo-adult@example.com', firstName: 'Adult', password: 'TestPassword1!', birthDate: new Date('1990-01-01'), location: { type: 'Point', coordinates: [-69.93, 18.48] } },
    { username: 'geo_minor', email: 'geo-minor@example.com', firstName: 'Minor', password: 'TestPassword1!', birthDate: new Date('2012-01-01') }
  ]);
  tokens = [adult, minor].map(user => jwtService.generateTokenPair(user).accessToken);
  await Event.init();
});

beforeEach(async () => {
  await Event.deleteMany({});
  await Ticket.deleteMany({});
  invalidateCache();
  fixtures = await Promise.all([
    seed('Santiago Dominicana', location('Santiago', 'República Dominicana', 'do', [-70.697, 19.4517]), { isFeatured: true }),
    seed('Capital Dominicana', location('Santo Domingo', 'República Dominicana', 'DO', [-69.93, 18.48])),
    seed('Santiago Chile', location('Santiago', 'Chile', 'CL', [-70.669, -33.448]), { isFeatured: true }),
    seed('Nueva York público', location('Nueva York', 'Estados Unidos', 'US', [-74, 40.7])),
    seed('Legacy cerca Santiago', { type: 'Point', coordinates: [-70.7, 19.45], address: 'Dirección antigua sin país' }),
    seed('Evento privado oculto', location('Ciudad Privada', 'País Privado', 'ZZ', [-70.697, 19.4517]), { isPrivate: true, isFeatured: true }),
    seed('Evento adulto oculto', location('Ciudad Adultos', 'País Adultos', 'YY', [-70.697, 19.4517]), { ageRestriction: { minAge: 21, isAdultOnly: true }, isFeatured: true })
  ]);
});

test('model keeps legacy metadata optional and validates country-code and IANA timezone inputs', async () => {
  expect(fixtures[0].location.countryCode).toBe('DO');
  expect(fixtures[4].location.countryCode).toBeUndefined();
  expect(fixtures[4].location.city).toBeUndefined();
  await expect(seed('Invalid country code', location('City', 'Country', 'DOM', [0, 0]))).rejects.toThrow(/countryCode/);
  await expect(seed('Invalid timezone', location('City', 'Country', 'DO', [0, 0]), { timeZone: 'Mars/Olympus' })).rejects.toThrow(/IANA/);
  const tokyo = await seed('Zona Tokyo', location('Tokyo', 'Japan', 'JP', [139.69, 35.68]), { timeZone: 'Asia/Tokyo' });
  expect(tokyo.timeZone).toBe('Asia/Tokyo');
});

test('virtual creation persists with real geospatial indexes and no invented physical coordinates', async () => {
  const virtual = await seed('Encuentro virtual mundial', undefined, { isVirtual: true, virtualLink: 'https://example.test/demo-room' });
  const saved = await Event.findById(virtual._id).lean();
  expect(saved.isVirtual).toBe(true);
  expect(saved.location?.coordinates).toBeUndefined();
  const physical = await seed('Physical at zero coordinates', location('Zero City', 'Country', 'ZZ', [0, 0]));
  expect(physical.location.coordinates).toEqual([0, 0]);
  await expect(seed('Physical missing location', undefined)).rejects.toThrow();
});

test('country scope is exact in listing, featured primary and fillers, trending and personalized feeds', async () => {
  for (const route of routes) {
    const response = await get(`${route}?countryCode=do&limit=12`, route.endsWith('for-you') ? tokens[1] : undefined);
    expect(response.status).toBe(200);
    expect(items(response).map(item => item.title).sort()).toEqual(['Capital Dominicana', 'Santiago Dominicana']);
    expect(items(response).every(item => item.location.countryCode === 'DO')).toBe(true);
    expect(items(response).every(item => item.timeZone === 'UTC')).toBe(true);
  }
});

test('same-named cities are disambiguated by country and case-insensitive exact matching', async () => {
  for (const route of routes) {
    const response = await get(`${route}?countryCode=CL&city=%20sANTIago%20`, route.endsWith('for-you') ? tokens[0] : undefined);
    expect(response.status).toBe(200);
    expect(items(response).map(item => item.title)).toEqual(['Santiago Chile']);
    const literal = await get(`${route}?countryCode=DO&city=Santiago.*`, route.endsWith('for-you') ? tokens[0] : undefined);
    expect(literal.status).toBe(200);
    expect(items(literal)).toEqual([]);
  }
});

test('world scope includes legacy events and does not silently use the authenticated profile coordinates', async () => {
  for (const route of routes) {
    const response = await get(`${route}?limit=30`, route.endsWith('for-you') ? tokens[1] : undefined);
    expect(response.status).toBe(200);
    const titles = items(response).map(item => item.title);
    expect(titles).toEqual(expect.arrayContaining(['Santiago Chile', 'Nueva York público', 'Legacy cerca Santiago']));
    expect(titles).not.toContain('Evento privado oculto');
    expect(titles).not.toContain('Evento adulto oculto');
  }
  const response = await get('/api/events/for-you?countryCode=CL', tokens[0]);
  expect(items(response).map(item => item.title)).toEqual(['Santiago Chile']);
  expect(response.body.meta.usedLocation).toBe(false);
});

test('coordinates accept zero values and geographic scope also retains legacy records', async () => {
  await seed('En el punto cero', location('Punto Cero', 'Ghana', 'GH', [0, 0]), { isFeatured: true });
  for (const route of routes) {
    const response = await get(`${route}?lat=0&lng=0&radius=50`, route.endsWith('for-you') ? tokens[0] : undefined);
    expect(response.status).toBe(200);
    expect(items(response).map(item => item.title)).toEqual(['En el punto cero']);
  }
  const response = await get('/api/events?lat=19.4517&lng=-70.697&radiusKm=50');
  expect(items(response).map(item => item.title)).toEqual(expect.arrayContaining(['Santiago Dominicana', 'Legacy cerca Santiago']));
});

test('invalid country, city and coordinate queries fail with 400 while personalized auth remains required', async () => {
  for (const route of routes) {
    const token = route.endsWith('for-you') ? tokens[0] : undefined;
    for (const query of ['countryCode=DOM', 'countryCode=1A', 'city=Santiago', 'countryCode=DO&city=', 'lat=91&lng=0', 'lat=0', 'lat=0oops&lng=0', 'lat=0&lng=0&radius=-1']) {
      expect((await get(`${route}?${query}`, token)).status).toBe(400);
    }
  }
  expect((await get('/api/events/for-you?countryCode=DO')).status).toBe(401);
});

test('listing clamps pagination to safe values and limits result size to 100', async () => {
  const response = await get('/api/events?limit=100000&page=-2');
  expect(response.status).toBe(200);
  expect(response.body.pagination.limit).toBe(100);
  expect(response.body.pagination.page).toBe(1);
  expect((await get('/api/events?limit=0')).body.pagination.limit).toBe(1);
  expect((await get('/api/events?limit=ten')).status).toBe(400);
  expect((await get('/api/events?page=1.2')).status).toBe(400);
});

test('discovery preserves age and private rules in every geographical scope', async () => {
  for (const route of routes) {
    const token = route.endsWith('for-you') ? tokens[1] : undefined;
    const hidden = await get(`${route}?countryCode=YY`, token);
    expect(hidden.status).toBe(200);
    expect(items(hidden)).toEqual([]);
    const adultVisible = await get(`${route}?countryCode=YY`, tokens[0]);
    expect(adultVisible.status).toBe(200);
    expect(items(adultVisible).map(item => item.title)).toEqual(['Evento adulto oculto']);
    expect(items(await get(`${route}?countryCode=ZZ`, tokens[0]))).toEqual([]);
  }
});

test('destinations contain real countries and disambiguated cities without private, adult or legacy guesses', async () => {
  const response = await get('/api/events/destinations');
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'country', countryCode: 'DO', country: 'República Dominicana', label: 'República Dominicana', eventsCount: 2 }),
    expect.objectContaining({ kind: 'city', countryCode: 'CL', city: 'Santiago', label: 'Santiago, Chile', lat: -33.448, lng: -70.669, eventsCount: 1 })
  ]));
  expect(response.body.data.some(item => ['ZZ', 'YY'].includes(item.countryCode))).toBe(false);
  expect(response.body.data.every(item => item.countryCode)).toBe(true);
  const cities = (await get('/api/events/destinations?q=Santiago')).body.data;
  expect(cities.map(item => `${item.kind}:${item.countryCode}`).sort()).toEqual(['city:CL', 'city:DO']);
  const allowed = await get('/api/events/destinations?q=Adultos', tokens[0]);
  expect(allowed.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ countryCode: 'YY' })]));
});

test('destination search escapes metacharacters, limits output, validates query length and avoids secret coordinate disclosure', async () => {
  expect((await get('/api/events/destinations?q=.*')).body.data).toEqual([]);
  expect((await get('/api/events/destinations?q=a')).status).toBe(400);
  expect((await get(`/api/events/destinations?q=${'x'.repeat(81)}`)).status).toBe(400);
  await Promise.all(Array.from({ length: 14 }, (_, index) => seed(`Ciudad prueba ${index}`, location(`City ${index}`, 'España', 'ES', [-3.7 + index * 0.01, 40.4]))));
  expect((await get('/api/events/destinations')).body.data).toHaveLength(12);
  await seed('Secreto geográfico', location('Secret City', 'México', 'MX', [-99.123456, 19.123456]), { isSecretLocation: true });
  const secret = (await get('/api/events/destinations?q=Secret')).body.data[0];
  expect(secret.lat).toBe(19.12);
  expect(secret.lng).toBe(-99.12);
});

test('event create and edit preserve timezone and structured location metadata with validation errors as 400', async () => {
  const body = { title: 'Nuevo evento global', description: 'Evento creado para probar el contrato geográfico', category: 'music', date: new Date(Date.now() + 86400000),
    location: location('Barcelona', 'España', 'es', [2.17, 41.38]), timeZone: 'Europe/Madrid' };
  const create = await request(app).post('/api/events').set('Authorization', `Bearer ${tokens[0]}`).send(body);
  expect(create.status).toBe(201);
  expect(create.body.event.location.countryCode).toBe('ES');
  expect(create.body.event.timeZone).toBe('Europe/Madrid');
  const edit = await request(app).put(`/api/events/${create.body.event._id}`).set('Authorization', `Bearer ${tokens[0]}`).send({ timeZone: 'Asia/Tokyo', location: { city: 'Tokyo', country: 'Japan', countryCode: 'jp' } });
  expect(edit.status).toBe(200);
  expect(edit.body.event.timeZone).toBe('Asia/Tokyo');
  expect(edit.body.event.location.countryCode).toBe('JP');
  const invalid = await request(app).post('/api/events').set('Authorization', `Bearer ${tokens[0]}`).send({ ...body, timeZone: 'Moon/Crater' });
  expect(invalid.status).toBe(400);
});
