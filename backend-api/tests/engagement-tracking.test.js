const express = require('express');
const request = require('supertest');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const jwt = require('../src/services/jwtService');
const app = express(); app.use(express.json()); app.use('/api/events', require('../src/routes/events'));
let owner, person, token;
const seed = extra => Event.create({ title: 'Concierto en el parque', description: 'Descripción del concierto en el parque.', category: 'music',
  createdBy: owner._id, status: 'published', date: new Date(Date.now() + 86400000),
  location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Parque Mirador Sur' }, ...extra });

beforeAll(async () => {
  [owner, person] = await User.create(['engageowner', 'engageperson'].map(username => ({ username, email: `${username}@example.test`, password: 'Password2026!', firstName: username, birthDate: new Date('1990-01-01') })));
  token = jwt.generateTokenPair(person).accessToken;
});

test('anonymous calls cannot inflate views or shares, and a person counts once', async () => {
  const event = await seed({});
  for (let i = 0; i < 5; i++) {
    expect((await request(app).post(`/api/events/${event.id}/view`)).body.data.viewsCount).toBe(0);
    await request(app).post(`/api/events/${event.id}/share`).send({ platform: 'whatsapp' });
  }
  for (let i = 0; i < 3; i++) {
    await request(app).post(`/api/events/${event.id}/view`).set('Authorization', `Bearer ${token}`);
    await request(app).post(`/api/events/${event.id}/share`).set('Authorization', `Bearer ${token}`).send({ platform: 'x'.repeat(500) });
  }
  const saved = await Event.findById(event.id);
  expect(saved.views).toHaveLength(1);
  expect(saved.shares).toHaveLength(1);
  expect(saved.shares[0].platform.length).toBeLessThanOrEqual(30);
});

test('private and unpublished events reveal nothing and record nothing', async () => {
  for (const extra of [{ isPrivate: true }, { status: 'draft' }]) {
    const event = await seed(extra);
    const response = await request(app).post(`/api/events/${event.id}/view`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect((await Event.findById(event.id)).views).toHaveLength(0);
  }
  expect((await request(app).post('/api/events/not-an-id/share')).status).toBe(400);
});
