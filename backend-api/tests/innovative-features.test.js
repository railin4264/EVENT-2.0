const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server');
const app = server.app || server;
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Order = require('../src/models/Order');
const SpontaneousCoro = require('../src/models/SpontaneousCoro');

describe('Innovative RD Features: Vibe Radar, Spontaneous Coro, Safety & Local Monetization', () => {
  let organizerToken;
  let userToken;
  let organizerId;
  let userId;
  let testEvent;

  beforeEach(async () => {
    // Crear organizador
    const orgRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Organizador',
        lastName: 'RD',
        username: 'org_rd_' + Math.random().toString(36).substring(7),
        email: 'organizer_' + Math.random().toString(36).substring(7) + '@example.com',
        password: 'Password123!'
      });
    organizerToken = orgRes.body.token || orgRes.body.data?.token;
    organizerId = orgRes.body.data?.user?._id || orgRes.body.data?.user?.id;

    // Crear usuario asistente
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Asistente',
        lastName: 'Local',
        username: 'user_rd_' + Math.random().toString(36).substring(7),
        email: 'user_' + Math.random().toString(36).substring(7) + '@example.com',
        password: 'Password123!'
      });
    userToken = userRes.body.token || userRes.body.data?.token;
    userId = userRes.body.data?.user?._id || userRes.body.data?.user?.id;

    // Crear evento de prueba
    testEvent = await Event.create({
      title: 'Concierto de Cuerdas al Atardecer',
      description: 'Música en vivo en la Zona Colonial',
      category: 'music',
      date: new Date(Date.now() - 1800000),
      endDate: new Date(Date.now() + 3600000),
      attendees: [{ user: userId, status: 'confirmed' }],
      createdBy: organizerId,
      status: 'published',
      location: {
        type: 'Point',
        coordinates: [-69.8837, 18.4733],
        address: 'Plaza España, Zona Colonial',
        city: 'Santo Domingo'
      },
      price: { amount: 500, currency: 'DOP' }
    });
  });

  describe('Termómetro de Vibra (Live Vibe Radar)', () => {
    it('allows attendees to report vibe and updates predominant currentVibe', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/vibe`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ vibe: 'lit', comment: '¡La acústica está brutal!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentVibe).toBe('lit');
      expect(res.body.data.counts.lit).toBe(1);

      // Consultar vibra
      const getRes = await request(app)
        .get(`/api/events/${testEvent._id}/vibe`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.currentVibe).toBe('lit');
      expect(getRes.body.data.reportsCount).toBe(1);
      // Individual ballots and comments stay private; only aggregates are public.
      expect(getRes.body.data).not.toHaveProperty('recentReports');
      expect(JSON.stringify(getRes.body)).not.toContain('La acústica está brutal');
    });

    it('rejects invalid vibe types', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/vibe`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ vibe: 'invalid_vibe' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Coro Seguro (Carpool & Retorno Acompañado)', () => {
    it('registers user in safe carpool zone for the event', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/safety/carpool`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ zone: 'Santo Domingo Este', contactPhone: '809-555-1234', role: 'passenger' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.zone).toBe('Santo Domingo Este');
      expect(res.body.data.totalInZone).toBe(1);

      // Consultar zonas de retorno
      const getRes = await request(app)
        .get(`/api/events/${testEvent._id}/safety/carpool`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.zones).toContain('Santo Domingo Este');
      expect(getRes.body.data.totalCarpoolers).toBe(1);
    });
  });

  describe('Event Boost / Patrocinio Local (Monetización en RD)', () => {
    it('allows event organizer to boost event with local DOP tiers', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/boost`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ tier: 'oro' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tier).toBe('oro');
      expect(res.body.data.paidAmountDOP).toBe(1500);

      const updated = await Event.findById(testEvent._id);
      expect(updated.isFeatured).toBe(true);
      expect(updated.featuredRank).toBe(10);
      expect(updated.boost.tier).toBe('oro');
    });

    it('denies boost from non-organizer unauthorized user', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/boost`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tier: 'plata' });

      expect(res.status).toBe(403);
    });
  });

  describe('Coro Espontáneo ("¿Quién se anima hoy?")', () => {
    it('creates a spontaneous daily micro-coro and allows other users to join', async () => {
      // Usuario crea faro de coro espontáneo
      const createRes = await request(app)
        .post('/api/plans/spontaneous')
        .set('Authorization', `Bearer ${userId ? userToken : organizerToken}`)
        .send({
          title: 'Tardecita de Café y Charlas en Zona Colonial',
          mood: 'cafe',
          city: 'Santo Domingo',
          meetingSpot: 'Cafetería El Conde',
          timeSlot: 'afternoon',
          maxMembers: 4
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      const coroId = createRes.body.data._id;

      // Organizador se une al micro-coro
      const joinRes = await request(app)
        .post(`/api/plans/spontaneous/${coroId}/join`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);
      expect(joinRes.body.data.members.length).toBe(2);

      // Listar coros activos
      const listRes = await request(app)
        .get('/api/plans/spontaneous?city=Santo Domingo');

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some(c => c._id.toString() === coroId.toString())).toBe(true);
    });
  });

  describe('Transferencias Bancarias Dominicanas (Monetización sin Stripe)', () => {
    it('submits bank voucher reference and allows organizer to verify/confirm order', async () => {
      const order = await Order.create({
        orderNumber: 'ORD-TEST-' + Date.now(),
        userId: userId,
        customerInfo: {
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@example.com'
        },
        eventId: testEvent._id,
        items: [{
          ticketId: new mongoose.Types.ObjectId(),
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500
        }],
        subtotal: 500,
        total: 500,
        currency: 'dop',
        status: 'draft',
        paymentMethod: 'bank_transfer_rd'
      });

      // Comprador sube referencia de Banco Popular
      const submitRes = await request(app)
        .post(`/api/payments/orders/${order._id}/bank-transfer`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bankName: 'Banco Popular Dominicano',
          referenceNumber: 'BPD-9988776655',
          voucherUrl: 'https://storage.eventnow.do/vouchers/receipt-123.jpg'
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.data.bankTransferProof.referenceNumber).toBe('BPD-9988776655');
      expect(submitRes.body.data.status).toBe('pending_payment');

      // Organizador consulta transferencias pendientes
      const pendingRes = await request(app)
        .get('/api/payments/organizer/pending-transfers')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.count).toBeGreaterThanOrEqual(1);

      // Organizador aprueba la transferencia
      const approveRes = await request(app)
        .post(`/api/payments/orders/${order._id}/verify-transfer`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ action: 'approve' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.status).toBe('confirmed');
      expect(approveRes.body.data.paymentStatus).toBe('succeeded');
      expect(approveRes.body.data.bankTransferProof.status).toBe('approved');
    });
  });
});
