const request = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';

let app;
let userToken, userId;

const future = (days) => new Date(Date.now() + days * 86400000);

async function register(email, username) {
  const res = await request(app).post('/api/auth/register').send({
    email, password: 'Test123456!', username, name: username
  });
  return { token: res.body.data.token, id: res.body.data.user._id };
}

async function createEvent(overrides = {}) {
  const Event = require('../src/models/Event');
  return Event.create({
    title: 'Evento Test',
    description: 'Descripción suficientemente larga para pasar la validación del evento',
    category: 'music',
    date: future(5),
    location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Santo Domingo, RD' },
    createdBy: userId,
    status: 'published',
    ...overrides
  });
}

const getTitles = (res) => (res.body.events || res.body.data || []).map(e => e.title);

describe('Content Restriction & Sensitivity Integration Tests', () => {
  beforeAll(async () => {
    const server = require('../src/server');
    app = server.app || server;
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) await collections[key].deleteMany({});
    ({ token: userToken, id: userId } = await register('testfilter@example.com', 'testfilteruser'));
  });

  test('GET /api/events returns all events including politics and religion by default', async () => {
    await createEvent({ title: 'Concierto Rock', category: 'music' });
    await createEvent({ title: 'Misa y Vigilia Ecuménica', category: 'religion' });
    await createEvent({ title: 'Debate Político Ciudadano', category: 'politics' });

    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    const titles = getTitles(res);
    expect(titles).toContain('Concierto Rock');
    expect(titles).toContain('Misa y Vigilia Ecuménica');
    expect(titles).toContain('Debate Político Ciudadano');
  });

  test('GET /api/events?hidePolitical=true filters out political events', async () => {
    await createEvent({ title: 'Concierto Rock', category: 'music' });
    await createEvent({ title: 'Misa y Vigilia Ecuménica', category: 'religion' });
    await createEvent({ title: 'Debate Político Ciudadano', category: 'politics' });

    const res = await request(app).get('/api/events?hidePolitical=true');
    expect(res.status).toBe(200);
    const titles = getTitles(res);
    expect(titles).toContain('Concierto Rock');
    expect(titles).toContain('Misa y Vigilia Ecuménica');
    expect(titles).not.toContain('Debate Político Ciudadano');
  });

  test('GET /api/events?hideReligious=true filters out religious events', async () => {
    await createEvent({ title: 'Concierto Rock', category: 'music' });
    await createEvent({ title: 'Misa y Vigilia Ecuménica', category: 'religion' });
    await createEvent({ title: 'Debate Político Ciudadano', category: 'politics' });

    const res = await request(app).get('/api/events?hideReligious=true');
    expect(res.status).toBe(200);
    const titles = getTitles(res);
    expect(titles).toContain('Concierto Rock');
    expect(titles).not.toContain('Misa y Vigilia Ecuménica');
    expect(titles).toContain('Debate Político Ciudadano');
  });

  test('GET /api/events?excludeCategories=politics,religion filters out both', async () => {
    await createEvent({ title: 'Concierto Rock', category: 'music' });
    await createEvent({ title: 'Misa y Vigilia Ecuménica', category: 'religion' });
    await createEvent({ title: 'Debate Político Ciudadano', category: 'politics' });

    const res = await request(app).get('/api/events?excludeCategories=politics,religion');
    expect(res.status).toBe(200);
    const titles = getTitles(res);
    expect(titles).toEqual(['Concierto Rock']);
  });

  test('User settings: persistent hidePolitical automatically filters events when authenticated', async () => {
    await createEvent({ title: 'Concierto Rock', category: 'music' });
    await createEvent({ title: 'Foro Presidencial', category: 'politics' });

    // Update settings
    const updateRes = await request(app)
      .put('/api/users/me/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        preferences: {
          hidePolitical: true
        }
      });
    expect(updateRes.status).toBe(200);

    // Call GET /api/events with auth token
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    const titles = getTitles(res);
    expect(titles).toContain('Concierto Rock');
    expect(titles).not.toContain('Foro Presidencial');
  });

  test('GET /api/events/search respects content restrictions', async () => {
    await createEvent({ title: 'Debate Ambiental', category: 'politics' });
    await createEvent({ title: 'Feria Ambiental', category: 'outdoors' });

    const res = await request(app).get('/api/events/search?search=Ambiental&hidePolitical=true');
    expect(res.status).toBe(200);
    const titles = getTitles(res);
    expect(titles).toContain('Feria Ambiental');
    expect(titles).not.toContain('Debate Ambiental');
  });
});
