const request = require('supertest');
const mongoose = require('mongoose');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const Event = require('../src/models/Event');
const { app } = require('../src/server');

const seed = extra => Event.create({
  title: 'Evento de prueba seguridad',
  description: 'Datos de prueba en MongoDB temporal',
  category: 'music',
  date: new Date(Date.now() + 86400000),
  createdBy: new mongoose.Types.ObjectId(),
  location: {
    type: 'Point',
    coordinates: [-69.934567, 18.486789],
    address: 'Dirección secreta confidencial'
  },
  ...extra
});

describe('Security & Privacy Fixes Validation', () => {
  beforeEach(async () => {
    await Event.deleteMany({});
  });

  afterAll(async () => {
    await Event.deleteMany({});
  });

  test('featured and trending do NOT leak age-restricted/adult events to unauthenticated users', async () => {
    const event = await seed({
      ageRestriction: { minAge: 21, isAdultOnly: true },
      isFeatured: true,
      featuredUntil: new Date(Date.now() + 86400000)
    });

    // Direct detail without auth must be blocked
    const detail = await request(app).get(`/api/events/${event._id}`);
    expect(detail.status).toBe(403);

    // Public discovery feeds must filter it out
    for (const route of ['featured', 'trending']) {
      const response = await request(app).get(`/api/events/${route}`);
      expect(response.status).toBe(200);
      const items = response.body.data || [];
      const found = items.some(card => String(card._id) === String(event._id));
      expect(found).toBe(false);
    }
  });

  test('secret locations are masked in public listing and event details for unauthorized users', async () => {
    const event = await seed({ isSecretLocation: true });

    // 1. Check GET /api/events/:id
    const detailRes = await request(app).get(`/api/events/${event._id}`);
    expect(detailRes.status).toBe(200);
    const detailEvent = detailRes.body.event;
    expect(detailEvent.location.address).toBe('Ubicación secreta · se revela al confirmar');
    expect(detailEvent.location.address).not.toContain('Dirección secreta confidencial');
    expect(detailEvent.location.coordinates[0]).not.toBe(-69.934567);

    // 2. Check GET /api/events
    const listRes = await request(app).get('/api/events');
    expect(listRes.status).toBe(200);
    const listEvent = listRes.body.events.find(e => String(e._id) === String(event._id));
    expect(listEvent).toBeDefined();
    expect(listEvent.location.address).toBe('Ubicación secreta · se revela al confirmar');
    expect(listEvent.location.address).not.toContain('Dirección secreta confidencial');
    expect(listEvent.location.coordinates[0]).not.toBe(-69.934567);
  });
});
