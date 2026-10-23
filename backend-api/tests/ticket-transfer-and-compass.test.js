'use strict';

const express = require('express');
const request = require('supertest');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Order = require('../src/models/Order');
const Ticket = require('../src/models/Ticket');
const jwt = require('../src/services/jwtService');
const { getOfflineFestivalPack, calculateDistanceAndBearing } = require('../src/services/venueCompassService');

const app = express();
app.use(express.json());
app.use('/api/ticket-transfers', require('../src/routes/ticketTransfer'));
app.use('/api/venue-compass', require('../src/routes/venueCompass'));

describe('Real-World Innovations: Anti-Fraud Ticket Transfer & Offline Festival Compass', () => {
  let sender, recipient, senderToken, recipientToken, event, ticket, order;

  beforeAll(async () => {
    await Promise.all([User.deleteMany({}), Event.deleteMany({}), Order.deleteMany({}), Ticket.deleteMany({})]);

    sender = await User.create({
      username: 'ticketsender',
      email: 'ticketsender@test.example',
      firstName: 'Marcos',
      password: 'Password2026!'
    });

    recipient = await User.create({
      username: 'ticketrecipient',
      email: 'ticketrecipient@test.example',
      firstName: 'Elena',
      password: 'Password2026!'
    });

    senderToken = jwt.generateAccessToken({ id: sender.id });
    recipientToken = jwt.generateAccessToken({ id: recipient.id });

    event = await Event.create({
      title: 'Gran Festival del Caribe 2027',
      description: 'Festival masivo en el estadio con música en vivo y gastronomía.',
      category: 'music',
      date: new Date(Date.now() + 86400000 * 5),
      location: {
        type: 'Point',
        coordinates: [-69.9312, 18.4861],
        venue: 'Estadio Quisqueya Juan Marichal',
        address: 'Ensanche La Fe, Santo Domingo',
        city: 'Santo Domingo',
        country: 'República Dominicana'
      },
      price: { amount: 1500, currency: 'DOP' },
      createdBy: sender.id
    });

    ticket = await Ticket.create({
      eventId: event.id,
      name: 'Entrada General VIP',
      price: 1500,
      currency: 'dop',
      quantity: 100,
      sold: 1,
      saleStartDate: new Date(Date.now() - 86400000),
      saleEndDate: new Date(Date.now() + 86400000 * 4)
    });

    order = await Order.create({
      orderNumber: 'ORD-TEST-12345',
      userId: sender.id,
      eventId: event.id,
      customerInfo: {
        firstName: 'Marcos',
        lastName: 'Sender',
        email: sender.email
      },
      items: [{
        ticketId: ticket.id,
        quantity: 1,
        unitPrice: 1500,
        totalPrice: 1500
      }],
      subtotal: 1500,
      total: 1500,
      currency: 'DOP',
      status: 'completed'
    });
  });

  afterAll(async () => {
    await Promise.all([User.deleteMany({}), Event.deleteMany({}), Order.deleteMany({}), Ticket.deleteMany({})]);
  });

  describe('1. Anti-Fraud P2P Ticket Transfer', () => {
    test('Rejects transfer if recipient does not exist', async () => {
      const res = await request(app)
        .post('/api/ticket-transfers/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          orderId: order._id,
          toIdentifier: 'nonexistent_user_99@test.com',
          note: 'Te la paso'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No se encontró ningún usuario');
    });

    test('Transfers ticket successfully, invalidates sender pass, mints new QR for recipient', async () => {
      const res = await request(app)
        .post('/api/ticket-transfers/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          orderId: order._id,
          toIdentifier: recipient.username,
          note: 'Disfruta el concierto Elena!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.transferRecord.newPasscode).toMatch(/^EN-[A-F0-9]{16}$/);

      // Verify recipient now has the order
      const recipientOrders = await Order.find({ userId: recipient._id });
      expect(recipientOrders.length).toBe(1);
      expect(recipientOrders[0].items[0].transferPasscode).toBe(res.body.transferRecord.newPasscode);

      // Verify sender ticket item is marked as transferred
      const updatedSenderOrder = await Order.findById(order._id);
      expect(updatedSenderOrder.items[0].transferredTo.toString()).toBe(recipient._id.toString());
      expect(updatedSenderOrder.items[0].invalidatedPass).toBe(true);
    });

    test('Prevents double-spending: cannot transfer an already-transferred ticket', async () => {
      const res = await request(app)
        .post('/api/ticket-transfers/transfer')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          orderId: order._id,
          toIdentifier: recipient.username
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('ya ha sido transferida');
    });
  });

  describe('2. Offline Festival & Stadium Compass', () => {
    test('Calculates distance and bearing accurately between coordinates', () => {
      // 1km north roughly
      const calc = calculateDistanceAndBearing(18.4861, -69.9312, 18.4951, -69.9312);
      expect(calc.distanceMeters).toBeGreaterThan(900);
      expect(calc.distanceMeters).toBeLessThan(1100);
      expect(calc.bearingDegrees).toBe(0); // Directly north
    });

    test('Generates complete offline pack for festival venue with landmarks', async () => {
      const pack = await getOfflineFestivalPack(event._id, 18.4860, -69.9310);
      expect(pack.success).toBe(true);
      expect(pack.venueName).toContain('Estadio Quisqueya');
      expect(pack.landmarks.length).toBeGreaterThanOrEqual(5);
      expect(pack.rendezvousSpot.name).toBeDefined();

      const medical = pack.landmarks.find(l => l.type === 'medical');
      expect(medical).toBeDefined();
      expect(typeof medical.distanceMeters).toBe('number');
      expect(typeof medical.compassBearing).toBe('number');
    });

    test('Route /api/venue-compass/:eventId/offline-pack returns 200 with cacheable json', async () => {
      const res = await request(app).get(`/api/venue-compass/${event._id}/offline-pack?lat=18.4861&lng=-69.9312`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.eventTitle).toContain('Gran Festival del Caribe');
    });
  });
});
