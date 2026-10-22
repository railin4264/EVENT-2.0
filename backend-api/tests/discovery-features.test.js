/**
 * Tests de descubrimiento: destacados, tendencias, "Para ti", ideas de actividades,
 * modo informativo de pagos e ingesta de feeds.
 */
const request = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';

let app;
let ownerToken, ownerId, fanToken, fanId;

const future = (days) => new Date(Date.now() + days * 86400000);

async function register(email, username) {
  const res = await request(app).post('/api/auth/register').send({
    email, password: 'Test123456!', username, name: username
  });
  return { token: res.body.data.token, id: res.body.data.user._id };
}

async function makeEvent(overrides = {}) {
  const Event = require('../src/models/Event');
  return Event.create({
    title: 'Evento Descubrimiento',
    description: 'Descripción suficientemente larga para validar',
    category: 'music',
    date: future(5),
    location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Santo Domingo, RD' },
    createdBy: ownerId,
    ...overrides
  });
}

describe('Descubrimiento, ideas y modo informativo', () => {
  beforeAll(async () => {
    const server = require('../src/server');
    app = server.app || server;
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) await collections[key].deleteMany({});
    delete process.env.PAYMENTS_ENABLED;
    ({ token: ownerToken, id: ownerId } = await register('owner@example.com', 'owneruser'));
    ({ token: fanToken, id: fanId } = await register('fan@example.com', 'fanuser'));
  });

  afterEach(() => { delete process.env.PAYMENTS_ENABLED; });

  describe('Configuración pública / pagos', () => {
    test('sin Stripe la app opera en modo informativo', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.data.paymentsEnabled).toBe(false);
      expect(res.body.data.mode).toBe('informational');
    });

    test('evento de pago permite reservar lugar cuando los pagos están desactivados', async () => {
      const ev = await makeEvent({ price: { amount: 500, currency: 'DOP' }, ticketUrl: 'https://tickets.example.com/x' });
      expect(ev.paymentMode).toBe('external');
      const res = await request(app).post(`/api/events/${ev._id}/attend`).set('Authorization', `Bearer ${fanToken}`);
      expect(res.status).toBe(200);
    });

    test('con pagos activados un evento de pago exige checkout (402)', async () => {
      const previousKey = process.env.STRIPE_SECRET_KEY;
      process.env.PAYMENTS_ENABLED = 'true';
      process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_no_network';
      const ev = await makeEvent({ price: { amount: 500, currency: 'DOP' } });
      const res = await request(app).post(`/api/events/${ev._id}/attend`).set('Authorization', `Bearer ${fanToken}`);
      try { expect(res.status).toBe(402); }
      finally { if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previousKey; }
    });

    test('ticketUrl rechaza javascript: y credenciales embebidas', async () => {
      await expect(makeEvent({ ticketUrl: 'javascript:alert(1)' })).rejects.toThrow();
      await expect(makeEvent({ ticketUrl: 'https://user:pass@evil.example.com' })).rejects.toThrow();
    });
  });

  describe('Destacados y tendencias', () => {
    test('una agenda recién importada no inventa tendencias; el banner usa próximos eventos', async () => {
      await makeEvent({ title: 'Agenda sin interacciones', imported: true });
      const trends = await request(app).get('/api/events/trending');
      expect(trends.body.data).toHaveLength(0);
      const banner = await request(app).get('/api/events/featured');
      expect(banner.body.data).toHaveLength(1);
      expect(banner.body.data[0].badge).toBe('upcoming');
      expect(banner.body.data[0].isOrganizerVerified).toBe(false);
    });
    test('/featured devuelve los destacados activos primero', async () => {
      await makeEvent({ title: 'Evento Normal', category: 'sports' });
      await makeEvent({ title: 'Evento Destacado', isFeatured: true, featuredRank: 5, featuredUntil: future(3) });
      const res = await request(app).get('/api/events/featured?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('Evento Destacado');
      expect(res.body.data[0].badge).toBe('featured');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2); // completa con tendencias
    });

    test('un destacado vencido no aparece como destacado', async () => {
      await makeEvent({ title: 'Caducado', isFeatured: true, featuredUntil: new Date(Date.now() - 1000) });
      const res = await request(app).get('/api/events/featured');
      const found = res.body.data.find(e => e.title === 'Caducado');
      expect(found && found.badge).not.toBe('featured');
    });

    test('/trending ordena por interacción', async () => {
      const quiet = await makeEvent({ title: 'Tranquilo' });
      const hot = await makeEvent({ title: 'Popular' });
      await require('../src/models/Event').updateOne({ _id: hot._id }, {
        $set: { attendees: [{ user: ownerId, status: 'confirmed' }, { user: fanId, status: 'confirmed' }], interestedCount: 20 }
      });
      const res = await request(app).get('/api/events/trending');
      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('Popular');
      expect(res.body.data.map(e => e.title)).not.toContain(quiet.title);
    });

    test('las ubicaciones secretas no exponen la dirección exacta', async () => {
      await makeEvent({ title: 'Secreto', isSecretLocation: true, isFeatured: true, featuredUntil: future(2) });
      const res = await request(app).get('/api/events/featured');
      const card = res.body.data.find(e => e.title === 'Secreto');
      expect(card.location.address).toMatch(/secreta/i);
      expect(card.location.coordinates).toEqual([-69.93, 18.48]);
    });

    test('solo un admin puede destacar o ingestar', async () => {
      const ev = await makeEvent();
      const feature = await request(app).post(`/api/events/${ev._id}/feature`).set('Authorization', `Bearer ${fanToken}`).send({ days: 3 });
      expect([401, 403]).toContain(feature.status);
      const ingest = await request(app).post('/api/events/admin/ingest').set('Authorization', `Bearer ${fanToken}`);
      expect([401, 403]).toContain(ingest.status);
    });

    test('el organizador puede pedir promoción, otros no', async () => {
      const ev = await makeEvent();
      const ok = await request(app).post(`/api/events/${ev._id}/promotion-request`).set('Authorization', `Bearer ${ownerToken}`).send({ note: 'Quiero salir en el banner' });
      expect(ok.status).toBe(200);
      const no = await request(app).post(`/api/events/${ev._id}/promotion-request`).set('Authorization', `Bearer ${fanToken}`);
      expect(no.status).toBe(403);
    });
  });

  describe('Para ti', () => {
    test('prioriza por intereses y explica el motivo', async () => {
      await makeEvent({ title: 'Noche de Jazz', category: 'music' });
      await makeEvent({ title: 'Torneo de Ajedrez', category: 'gaming', tags: ['ajedrez'] });
      await require('../src/models/User').updateOne({ _id: fanId }, { $set: { interests: ['música'] } });
      const res = await request(app).get('/api/events/for-you').set('Authorization', `Bearer ${fanToken}`);
      expect(res.status).toBe(200);
      expect(res.body.meta.personalized).toBe(true);
      expect(res.body.data[0].title).toBe('Noche de Jazz');
      expect(res.body.data[0].matchReasons.length).toBeGreaterThan(0);
    });

    test('requiere autenticación', async () => {
      const res = await request(app).get('/api/events/for-you');
      expect(res.status).toBe(401);
    });
  });

  describe('Ideas de actividades', () => {
    const payload = {
      title: 'Violín en el parque', description: 'Músicos en vivo', category: 'music',
      activityType: 'violín en el parque', emoji: '🎻',
      zone: { name: 'Parque Mirador Sur', city: 'Santo Domingo', coordinates: [-69.9577, 18.456] }
    };

    test('crear, apoyar (toggle) y listar con estado de apoyo', async () => {
      const created = await request(app).post('/api/ideas').set('Authorization', `Bearer ${ownerToken}`).send(payload);
      expect(created.status).toBe(201);
      const id = created.body.data._id;
      expect(created.body.data.supportersCount).toBe(1);
      expect(created.body.data.supporters).toBeUndefined();

      const on = await request(app).post(`/api/ideas/${id}/support`).set('Authorization', `Bearer ${fanToken}`);
      expect(on.body.data).toEqual({ supported: true, supportersCount: 2,
        quorumTarget: 25, quorumReached: false, justReachedQuorum: false });
      const off = await request(app).post(`/api/ideas/${id}/support`).set('Authorization', `Bearer ${fanToken}`);
      expect(off.body.data).toEqual({ supported: false, supportersCount: 1,
        quorumTarget: 25, quorumReached: false, justReachedQuorum: false });
      await request(app).post(`/api/ideas/${id}/support`).set('Authorization', `Bearer ${fanToken}`);

      const list = await request(app).get('/api/ideas').set('Authorization', `Bearer ${fanToken}`);
      expect(list.body.data[0].supported).toBe(true);
      expect(list.body.data[0].supportersCount).toBe(2);
    });

    test('valida título y requiere sesión', async () => {
      const bad = await request(app).post('/api/ideas').set('Authorization', `Bearer ${ownerToken}`).send({ title: 'ab' });
      expect(bad.status).toBe(400);
      const anon = await request(app).post('/api/ideas').send(payload);
      expect(anon.status).toBe(401);
    });

    test('limita a 5 ideas por usuario al día', async () => {
      for (let i = 0; i < 5; i++) {
        const r = await request(app).post('/api/ideas').set('Authorization', `Bearer ${ownerToken}`).send({ ...payload, title: `Idea número ${i}` });
        expect(r.status).toBe(201);
      }
      const sixth = await request(app).post('/api/ideas').set('Authorization', `Bearer ${ownerToken}`).send({ ...payload, title: 'Idea de más' });
      expect(sixth.status).toBe(429);
    });

    test('mapa de demanda cruza ideas con la oferta de eventos', async () => {
      const a = await request(app).post('/api/ideas').set('Authorization', `Bearer ${ownerToken}`).send(payload);
      await request(app).post(`/api/ideas/${a.body.data._id}/support`).set('Authorization', `Bearer ${fanToken}`);
      await makeEvent({ category: 'sports' });
      const res = await request(app).get('/api/ideas/demand?lat=18.46&lng=-69.95&radiusKm=30');
      expect(res.status).toBe(200);
      const music = res.body.data.opportunities.find(o => o.category === 'music');
      expect(music.demand).toBe(2);
      expect(music.upcomingEvents).toBe(0);
      expect(music.gapScore).toBeGreaterThan(0);
    });

    test('lanzar una idea como evento notifica a quienes la apoyaron y exige ser organizador', async () => {
      const a = await request(app).post('/api/ideas').set('Authorization', `Bearer ${ownerToken}`).send(payload);
      const id = a.body.data._id;
      await request(app).post(`/api/ideas/${id}/support`).set('Authorization', `Bearer ${fanToken}`);
      const ev = await makeEvent({ title: 'Violín en el Parque Mirador' });

      const forbidden = await request(app).post(`/api/ideas/${id}/launch`).set('Authorization', `Bearer ${fanToken}`).send({ eventId: ev._id });
      expect(forbidden.status).toBe(403);

      const ok = await request(app).post(`/api/ideas/${id}/launch`).set('Authorization', `Bearer ${ownerToken}`).send({ eventId: ev._id });
      expect(ok.status).toBe(200);
      expect(ok.body.data.notified).toBe(1);

      const again = await request(app).post(`/api/ideas/${id}/launch`).set('Authorization', `Bearer ${ownerToken}`).send({ eventId: ev._id });
      expect(again.status).toBe(409);
    });

    test('solo el autor (o admin) elimina una idea', async () => {
      const a = await request(app).post('/api/ideas').set('Authorization', `Bearer ${ownerToken}`).send(payload);
      const no = await request(app).delete(`/api/ideas/${a.body.data._id}`).set('Authorization', `Bearer ${fanToken}`);
      expect(no.status).toBe(403);
      const yes = await request(app).delete(`/api/ideas/${a.body.data._id}`).set('Authorization', `Bearer ${ownerToken}`);
      expect(yes.status).toBe(200);
    });
  });

  describe('Ingesta de feeds', () => {
    const { parseIcs, parseIcsDate } = require('../src/services/feedImporter');
    const { toEventDoc, normalizeCategory } = require('../src/services/eventAggregator');

    test('parsea ICS con GEO, fechas locales y texto escapado', () => {
      const ics = [
        'BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:abc-1',
        'SUMMARY:Pintar en el parque\\, domingo', 'DESCRIPTION:Trae tus pinceles\\nTodos los niveles',
        'DTSTART;TZID=America/Santo_Domingo:20261120T180000', 'GEO:18.45;-69.95', 'LOCATION:Parque Mirador Sur', 'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      const [ev] = parseIcs(ics);
      expect(ev.summary).toBe('Pintar en el parque, domingo');
      expect(ev.description).toContain('\n');
      expect(ev.geo).toEqual({ lat: 18.45, lng: -69.95 });
      expect(ev.start.toISOString()).toBe('2026-11-20T22:00:00.000Z'); // UTC-4
    });

    test('parseIcsDate acepta UTC y rechaza fechas sin hora o sin zona declarada', () => {
      expect(parseIcsDate('20261120T180000Z').toISOString()).toBe('2026-11-20T18:00:00.000Z');
      expect(parseIcsDate('20261120')).toBeNull();
      expect(parseIcsDate('20261120T180000')).toBeNull();
      expect(parseIcsDate('basura')).toBeNull();
    });

    test('normalizeCategory mapea sinónimos a la taxonomía', () => {
      expect(normalizeCategory('Música en vivo')).toBe('music');
      expect(normalizeCategory('Yoga')).toBe('wellness');
      expect(normalizeCategory('Cine')).toBe('film');
      expect(normalizeCategory('???')).toBe('other');
    });

    test('toEventDoc sanea y rechaza datos inservibles', () => {
      const base = {
        source: 'ics', sourceId: '1', title: '  Taller <b>de</b> cerámica 🏺 ', description: 'corta', category: 'taller',
        date: future(10), location: { coordinates: [-69.9, 18.4], address: 'Plaza de la Cultura' }, price: { amount: 300, currency: 'DOP' }, externalUrl: 'https://x.example.com'
      };
      const doc = toEventDoc(base);
      expect(doc.title).toContain('🏺');
      expect(doc.title).not.toMatch(/<b>/);
      expect(doc.description.length).toBeGreaterThanOrEqual(10);
      expect(doc.location.address.length).toBeGreaterThanOrEqual(5);
      expect(doc.category).toBe('workshop');
      expect(doc.paymentMode).toBe('external');
      expect(toEventDoc({ ...base, date: new Date('2020-01-01') })).toBeNull();
      expect(toEventDoc({ ...base, location: { coordinates: [NaN, 1], address: 'abcde' } })).toBeNull();
      expect(toEventDoc({ ...base, location: { coordinates: [-69.9, 18.4], address: 'x' } })).toBeNull();
      expect(toEventDoc({ ...base, title: '' })).toBeNull();
    });

    test('un evento importado válido se puede guardar', async () => {
      const Event = require('../src/models/Event');
      const doc = toEventDoc({
        source: 'ics', sourceId: 'host:1', title: 'Cine al aire libre', description: 'Película bajo las estrellas en la plaza',
        category: 'cine', date: future(7), location: { coordinates: [-69.9, 18.4], address: 'Plaza de la Cultura' }, price: { amount: 0 }
      });
      const saved = await Event.create({ ...doc, createdBy: ownerId });
      expect(saved.category).toBe('film');
      expect(saved.imported).toBe(true);
      await expect(Event.create({ ...doc, createdBy: ownerId })).rejects.toThrow(); // índice único source+sourceId
    });
  });
});
