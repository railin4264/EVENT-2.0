const express = require('express');
const request = require('supertest');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const jwt = require('../src/services/jwtService');
const { extractEventFromText, extractPrice, extractDay } = require('../src/services/flyerAiExtractor');
const app = express(); app.use(express.json()); app.use('/api/events', require('../src/routes/events'));
let token;
beforeAll(async () => {
  const promoter = await User.create({ username: 'flyerpromoter', email: 'flyer@example.test', password: 'Password2026!', firstName: 'Flyer', birthDate: new Date('1990-01-01') });
  token = jwt.generateTokenPair(promoter).accessToken;
});

describe('flyer text extraction', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  test('reads what the announcement states', () => {
    const fields = extractEventFromText('Noche de salsa\nSábado 15 de noviembre 9:30 PM\nCasa de Teatro\nEntrada RD$500', { now });
    expect(fields).toMatchObject({ title: 'Noche de salsa', date: '2026-11-15', time: '21:30', venue: 'Casa de Teatro', price: { amount: 500, currency: 'DOP' }, missing: [] });
  });

  test('leaves missing facts empty instead of inventing them', () => {
    const fields = extractEventFromText('Fiesta en Santiago con DJ invitado', { now });
    expect(fields).toMatchObject({ date: null, time: null, venue: null, coordinates: null, price: null, city: null }); // "Santiago" alone could be Chile
    expect(fields.missing).toEqual(expect.arrayContaining(['date', 'time', 'venue', 'price']));
  });

  test('does not guess currencies or impossible days', () => {
    expect(extractPrice('Cover $300')).toEqual({ amount: 300, currency: null, isFree: false });
    expect(extractPrice('Entrada libre')).toEqual({ amount: 0, currency: null, isFree: true });
    expect(extractPrice('Ven con tus amigos')).toBeNull();
    expect(extractDay('31/02', now)).toBeNull();
    expect(extractDay('5 de enero', now)).toBe('2027-01-05');
  });
});

describe('POST /ingest/flyer', () => {
  test('creates a pending event only when the announcement is complete', async () => {
    const complete = await request(app).post('/api/events/ingest/flyer').set('Authorization', `Bearer ${token}`)
      .send({ text: 'Jazz en el parque\n15 de noviembre 2027 a las 19:00\nParque Mirador Sur\nEntrada libre' });
    expect(complete.status).toBe(201);
    const saved = await Event.findById(complete.body.data._id);
    expect(saved).toMatchObject({ status: 'pending_review', timeZone: 'America/Santo_Domingo', price: { amount: 0, currency: 'DOP' } });
    expect(saved.date.toISOString()).toBe('2027-11-15T23:00:00.000Z');
  });

  test('reports missing data instead of creating an event with invented facts', async () => {
    const before = await Event.countDocuments();
    const partial = await request(app).post('/api/events/ingest/flyer').set('Authorization', `Bearer ${token}`).send({ text: 'Fiesta en Santiago este sábado' });
    expect(partial.status).toBe(422);
    expect(partial.body.message).toMatch(/faltan datos/i);
    expect(await Event.countDocuments()).toBe(before);
  });
});

test('autofill asks for the announcement text when only an image name is available', async () => {
  const response = await request(app).post('/api/events/ai-extract-flyer').set('Authorization', `Bearer ${token}`).send({ imageUrl: 'https://cdn.example.com/flyer_final_2.jpg' });
  expect(response.status).toBe(422);
  expect(JSON.stringify(response.body)).not.toMatch(/flyer final 2/);
});

describe('flyer image reading', () => {
  const { fieldsFromVision, printedDay, readFlyerImage } = require('../src/services/flyerVisionExtractor');
  const now = new Date('2026-10-22T12:00:00Z');
  test('keeps only printed facts and never invents a map point or currency', () => {
    const fields = fieldsFromVision({ title: 'Salsa Night', description: null, day: 15, month: 11, year: null, time: '21:30', venue: 'Casa de Teatro',
      address: 'Calle Arzobispo Meriño 110', city: 'Santo Domingo', country_code: 'DO', price_amount: 500, price_currency: null, is_free: false }, now);
    expect(fields).toMatchObject({ date: '2026-11-15', time: '21:30', coordinates: null, price: { amount: 500, currency: null } });
    expect(fieldsFromVision({ day: null, month: null, year: null, time: '9pm', is_free: null, price_amount: null }, now)).toMatchObject({ date: null, time: null, price: null });
  });
  test('a printed day without year is its next occurrence', () => {
    expect(printedDay({ day: 5, month: 1, year: null }, now)).toBe('2027-01-05');
    expect(printedDay({ day: 31, month: 2, year: 2027 }, now)).toBeNull();
  });
  test('is off without an API key', async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try { expect(await readFlyerImage({ path: __filename, mimetype: 'image/png' })).toBeNull(); }
    finally { if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous; }
  });
});
