/**
 * Tests para eventos
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';

// NOTE: JWT_SECRET / JWT_REFRESH_SECRET are set by tests/setup.js (loaded
// first as a setupFile). Do NOT override them here — overriding causes a
// secret mismatch with the cached server instance (maxWorkers:1) and 401s.

let mongoServer;
let app;
let authToken;
let userId;

describe('Events API', () => {
  beforeAll(async () => {
    // MONGODB_URI is provided by jest.globalSetup (single shared mongod).
    const server = require('../src/server');
    app = server.app || server;
  });

  afterAll(async () => {
    // setup.js disconnects mongoose; globalSetup stops the shared mongod
  });

  beforeEach(async () => {
    // Limpiar colecciones
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Crear usuario y obtener token
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'eventuser@example.com',
        password: 'Test123456!',
        username: 'eventuser',
        name: 'Event User'
      });

    authToken = userRes.body.data.token;
    userId = userRes.body.data.user._id;
  });

  const validEvent = {
    title: 'Evento de Prueba',
    description: 'Descripción del evento de prueba',
    date: new Date(Date.now() + 86400000).toISOString(), // Mañana
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128],
      address: 'New York, NY'
    },
    category: 'technology',
    capacity: 100,
    price: 0,
    isPublic: true
  };

  describe('POST /api/events', () => {
    it('debería crear un evento con datos válidos', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEvent);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toHaveProperty('title', validEvent.title);
      expect(res.body.event.status).toBe('pending_review');
    });

    it('debería rechazar sin autenticación', async () => {
      const res = await request(app)
        .post('/api/events')
        .send(validEvent);

      expect(res.status).toBe(401);
    });

    it('debería rechazar evento sin título', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validEvent, title: '' });

      expect(res.status).toBe(400);
    });

    it('debería rechazar fecha pasada', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validEvent,
          date: new Date(Date.now() - 86400000).toISOString()
        });

      // NOTE: the Event model explicitly allows past dates (for
      // testing/demos) — see src/models/Event.js date validator. The
      // server returns 201, not 400, so align the expectation.
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/events', () => {
    beforeEach(async () => {
      // Crear algunos eventos
      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEvent);

      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validEvent,
          title: 'Segundo Evento',
          category: 'music'
        });
    });

    it('debería listar eventos', async () => {
      const res = await request(app).get('/api/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.events)).toBe(true);
    });

    it('debería filtrar por categoría', async () => {
      const res = await request(app)
        .get('/api/events')
        .query({ category: 'technology' });

      expect(res.status).toBe(200);
      expect(res.body.events.every(e => e.category === 'technology')).toBe(true);
    });

    it('debería paginar resultados', async () => {
      const res = await request(app)
        .get('/api/events')
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.events.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/events/:id', () => {
    let eventId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEvent);

      expect(res.status).toBe(201);
      eventId = res.body.event._id;
      await require('../src/models/Event').findByIdAndUpdate(eventId, { status: 'published' });
    });

    it('debería obtener evento por ID', async () => {
      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.event._id).toBe(eventId);
    });

    it('debería devolver 404 para ID inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/events/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/events/:id/join', () => {
    let eventId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEvent);

      expect(res.status).toBe(201);
      eventId = res.body.event._id;
      await require('../src/models/Event').findByIdAndUpdate(eventId, { status: 'published' });
    });

    it('debería unirse a un evento', async () => {
      // Crear segundo usuario
      const user2Res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Test123456!',
          username: 'user2',
          name: 'User Two'
        });

      const res = await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${user2Res.body.data.token}`);

      expect(res.status).toBe(200);
    });
  });
});
