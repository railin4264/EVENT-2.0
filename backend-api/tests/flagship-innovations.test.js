'use strict';

const express = require('express');
const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const EventBuddy = require('../src/models/EventBuddy');
const Carpool = require('../src/models/Carpool');
const jwt = require('../src/services/jwtService');
const { getEventStyleGuide } = require('../src/services/eventStyleGuideService');
const { generateWeekendItinerary } = require('../src/services/weekendItineraryService');

const app = express();
app.use(express.json());
app.use('/api/event-buddy', require('../src/routes/eventBuddy'));
app.use('/api/carpools', require('../src/routes/carpools'));
app.use('/api/itineraries', require('../src/routes/itineraries'));

describe('Flagship Global Innovations (Buddy, Style Guide, Weekend Planner, Carpools)', () => {
  let userA, userB, tokenA, tokenB, testEvent;

  beforeAll(async () => {
    await Promise.all([User.deleteMany({}), Event.deleteMany({}), EventBuddy.deleteMany({}), Carpool.deleteMany({})]);

    userA = await User.create({
      username: 'innovator_a',
      email: 'innovator_a@test.example',
      firstName: 'Ana',
      password: 'Password2026!',
      gender: 'female',
      interests: ['music', 'fashion', 'running']
    });

    userB = await User.create({
      username: 'innovator_b',
      email: 'innovator_b@test.example',
      firstName: 'Carlos',
      password: 'Password2026!',
      gender: 'male',
      interests: ['tech', 'gaming']
    });

    tokenA = jwt.generateAccessToken({ id: userA.id });
    tokenB = jwt.generateAccessToken({ id: userB.id });

    testEvent = await Event.create({
      title: 'Festival Musical & Pasarela Estelar 2027',
      description: 'Gran festival de música electrónica y moda al aire libre.',
      category: 'music',
      tags: ['musica', 'festival', 'moda'],
      date: new Date(Date.now() + 86400000 * 3),
      location: {
        type: 'Point',
        coordinates: [-69.9312, 18.4861],
        address: 'Parque Iberoamérica, Santo Domingo',
        city: 'Santo Domingo',
        country: 'República Dominicana'
      },
      price: { amount: 500, currency: 'DOP' },
      createdBy: userA.id
    });
  });

  afterAll(async () => {
    await Promise.all([User.deleteMany({}), Event.deleteMany({}), EventBuddy.deleteMany({}), Carpool.deleteMany({})]);
  });

  describe('1. Event Buddy & Matchmaker ("Ir Acompañado")', () => {
    test('Anonymous callers can view available buddies with safe profile data', async () => {
      const res = await request(app).get(`/api/event-buddy/${testEvent._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Authenticated user can activate buddy seeking mode', async () => {
      const res = await request(app)
        .post(`/api/event-buddy/${testEvent._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          bio: '¡Primera vez en el festival! Busco compañera para disfrutar de la música y pasarela.',
          seekingGender: 'female',
          interests: ['music', 'fashion']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.seekingGender).toBe('female');
      expect(res.body.data.bio).toContain('Primera vez en el festival');
    });

    test('Another user can view the listing and send a buddy connection request', async () => {
      const listRes = await request(app).get(`/api/event-buddy/${testEvent._id}`);
      expect(listRes.body.count).toBe(1);
      const buddyId = listRes.body.data[0]._id;

      const reqRes = await request(app)
        .post(`/api/event-buddy/${testEvent._id}/request/${buddyId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ message: '¡Hola Ana! También me encanta la música del festival, ¿hacemos coro?' });

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.success).toBe(true);
      expect(reqRes.body.message).toContain('Solicitud de conexión enviada');
    });
  });

  describe('2. Dress Code Inteligente & Lookbook ("EventNow Style")', () => {
    test('Infers style profile, dress code, tips and weather context', async () => {
      const guide = getEventStyleGuide(testEvent, { temperature: 27 });
      expect(guide.success).toBe(true);
      expect(guide.dressCode).toContain('Festival');
      expect(Array.isArray(guide.stylingTips)).toBe(true);
      expect(guide.stylingTips.length).toBeGreaterThan(0);
      expect(guide.colorPalette.length).toBeGreaterThanOrEqual(3);
      expect(guide.weatherContext).toContain('27°C');
    });

    test('Style guide route returns valid response for published event', async () => {
      const res = await request(app).get(`/api/itineraries/events/${testEvent._id}/style-guide`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.dressCode).toBeDefined();
      expect(res.body.colorPalette).toBeDefined();
    });
  });

  describe('3. Generador de Itinerarios de Fin de Semana 48h con IA ("Weekend Getaway")', () => {
    test('Generates cohesive 48h schedule with stops and cost estimation', async () => {
      const itinerary = await generateWeekendItinerary({
        city: 'Santo Domingo',
        country: 'República Dominicana',
        vibe: 'all'
      });

      expect(itinerary.success).toBe(true);
      expect(itinerary.destination.city).toBe('Santo Domingo');
      expect(itinerary.schedule.length).toBeGreaterThan(0);
      expect(itinerary.schedule[0].phaseTitle).toBeDefined();
      expect(itinerary.totalEstimatedCost).toBeDefined();
    });

    test('Route /api/itineraries/weekend-planner returns 200 with schedule', async () => {
      const res = await request(app).get('/api/itineraries/weekend-planner?city=Santo%20Domingo');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.itineraryTitle).toContain('Santo Domingo');
    });
  });

  describe('4. Carpooling Ecológico Comunitario ("Llega con tu Tribu")', () => {
    let carpoolId;

    test('Authenticated driver can offer a carpool ride', async () => {
      const res = await request(app)
        .post(`/api/carpools/${testEvent._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          departureLocation: 'Downtown Center, Bella Vista',
          departureTime: new Date(Date.now() + 86400000 * 3).toISOString(),
          totalSeats: 3,
          contributionAmount: 150,
          vehicleModel: 'Honda Civic Blanco',
          notes: 'Música chill y aire acondicionado.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSeats).toBe(3);
      expect(res.body.data.availableSeats).toBe(3);
      carpoolId = res.body.data._id;
    });

    test('Passenger can reserve a seat in the carpool', async () => {
      const joinRes = await request(app)
        .post(`/api/carpools/${testEvent._id}/join/${carpoolId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);
      expect(joinRes.body.availableSeats).toBe(2);
    });

    test('Listing shows updated available seats and passenger confirmation', async () => {
      const listRes = await request(app).get(`/api/carpools/${testEvent._id}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.count).toBe(1);
      expect(listRes.body.data[0].availableSeats).toBe(2);
      expect(listRes.body.data[0].vehicleModel).toBe('Honda Civic Blanco');
    });
  });
});
