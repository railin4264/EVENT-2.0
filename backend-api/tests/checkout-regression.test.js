const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../src/services/emailService', () => ({ sendPasswordReset: jest.fn().mockResolvedValue({ messageId: 'test' }) }));
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Ticket = require('../src/models/Ticket');
const Order = require('../src/models/Order');
const paymentService = require('../src/services/paymentService');
const jwtService = require('../src/services/jwtService');
const emailService = require('../src/services/emailService');
const { app } = require('../src/server');
let user, event, ticket, token;

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Ticket.deleteMany({}), Order.deleteMany({})]);
  user = await User.create({ username: 'checkout_user', email: 'checkout@example.com', password: 'StrongPass1!',
    firstName: 'Test', lastName: 'Buyer', birthDate: new Date('1990-01-01'), isEmailVerified: true });
  token = jwtService.generateTokenPair(user).accessToken;
  event = await Event.create({ title: 'Checkout regression', description: 'A real regression test event', category: 'music',
    date: new Date(Date.now() + 86400000), createdBy: user._id,
    location: { type: 'Point', coordinates: [-69.9, 18.4], address: 'Santo Domingo' }, maxAttendees: 20 });
  ticket = await Ticket.create({ eventId: event._id, name: 'General', price: 0, quantity: 10,
    saleStartDate: new Date(Date.now() - 60000), saleEndDate: new Date(Date.now() + 3600000) });
  paymentService.isConfigured = false;
  paymentService.stripe = null;
});

const order = (items = [{ ticketId: ticket._id, quantity: 1 }]) => paymentService.createOrder(user._id, event._id, items);

afterEach(() => jest.restoreAllMocks());

test('recovery resumes a cancellation interrupted between ticket types', async () => {
  const second = await Ticket.create({ eventId: event._id, name: 'Other admission', price: 0, quantity: 10,
    saleStartDate: new Date(Date.now() - 60000), saleEndDate: new Date(Date.now() + 3600000) });
  const items = [{ ticketId: ticket._id, quantity: 2 }, { ticketId: second._id, quantity: 1 }];
  const result = await order(items);
  await order([{ ticketId: ticket._id, quantity: 3 }]);
  const release = Ticket.releaseOrderTickets.bind(Ticket);
  const spy = jest.spyOn(Ticket, 'releaseOrderTickets').mockImplementation(async (...args) => {
    if (String(args[0]) === String(second._id)) throw new Error('interrupted release');
    return release(...args);
  });
  await expect(paymentService.cancelOrder(result.order._id)).rejects.toThrow('interrupted release');
  expect((await Ticket.findById(ticket._id)).sold).toBe(3);
  expect((await Ticket.findById(second._id)).sold).toBe(1);
  expect((await Order.findById(result.order._id)).inventoryReleasedAt).toBeUndefined();
  spy.mockRestore();
  const results = await Promise.all([paymentService.recoverInventoryReleases(), paymentService.recoverInventoryReleases()]);
  expect(results.every(result => result.failedCount === 0)).toBe(true);
  expect((await Ticket.findById(ticket._id)).sold).toBe(3);
  expect((await Ticket.findById(second._id)).sold).toBe(0);
  expect((await Order.findById(result.order._id)).inventoryReleasedAt).toBeTruthy();
  expect(await paymentService.recoverInventoryReleases()).toEqual({ recoveredCount: 0, failedCount: 0 });
});

test('a retry after stock release but before order acknowledgement cannot release other buyers stock', async () => {
  const result = await order([{ ticketId: ticket._id, quantity: 2 }]);
  await order([{ ticketId: ticket._id, quantity: 3 }]);
  const spy = jest.spyOn(Order, 'updateOne').mockRejectedValueOnce(new Error('order acknowledgement failed'));
  await expect(paymentService.cancelOrder(result.order._id)).rejects.toThrow('acknowledgement');
  expect((await Ticket.findById(ticket._id)).sold).toBe(3);
  spy.mockRestore();
  await paymentService.cancelOrder(result.order._id);
  const stock = await Ticket.findById(ticket._id);
  expect(stock.sold).toBe(3);
  expect(stock.available).toBe(7);
  expect(stock.toObject().releasedOrderIds).toBeUndefined();
  expect((await Order.findById(result.order._id)).inventoryReleasedAt).toBeTruthy();
});

test('a persisted refund resumes inventory without contacting Stripe again', async () => {
  const result = await order([{ ticketId: ticket._id, quantity: 2 }]);
  await order([{ ticketId: ticket._id, quantity: 3 }]);
  await Order.updateOne({ _id: result.order._id }, { total: 10, stripePaymentIntentId: 'pi_recovery' });
  paymentService.isConfigured = true;
  const create = jest.fn().mockResolvedValue({ id: 're_recovery', status: 'succeeded' });
  paymentService.stripe = { refunds: { create } };
  const spy = jest.spyOn(Ticket, 'releaseOrderTickets').mockRejectedValueOnce(new Error('stock unavailable'));
  await expect(paymentService.processRefund(result.order._id)).rejects.toThrow('stock unavailable');
  expect((await Order.findById(result.order._id)).status).toBe('refunded');
  spy.mockRestore();
  paymentService.isConfigured = false;
  const retried = await paymentService.processRefund(result.order._id);
  expect(retried.refund).toEqual({ id: 're_recovery', amount: 10, status: 'succeeded' });
  expect(create).toHaveBeenCalledTimes(1);
  expect((await Ticket.findById(ticket._id)).sold).toBe(3);
});

test('recovery excludes historical cancellations that lack a release request', async () => {
  const historical = await order();
  await paymentService.cancelOrder(historical.order._id);
  await Order.updateOne({ _id: historical.order._id }, { $unset: { inventoryReleaseRequestedAt: 1, inventoryReleasedAt: 1 } });
  await order([{ ticketId: ticket._id, quantity: 3 }]);
  expect(await paymentService.recoverInventoryReleases()).toEqual({ recoveredCount: 0, failedCount: 0 });
  expect((await Ticket.findById(ticket._id)).sold).toBe(3);
});

test('maintenance leaves an inconsistent release pending and continues with healthy orders', async () => {
  const broken = await order();
  const healthy = await order();
  await Order.updateMany({ _id: { $in: [broken.order._id, healthy.order._id] } }, {
    $set: { status: 'canceled', paymentStatus: 'canceled', inventoryReleaseRequestedAt: new Date() }
  });
  await Order.updateOne({ _id: broken.order._id }, { $set: { 'items.0.ticketId': new mongoose.Types.ObjectId() } });
  const CronService = require('../src/services/cronService');
  const result = await new CronService().triggerJob('orderInventoryRecovery');
  expect(result).toMatchObject({ recoveredCount: 1, failedCount: 1 });
  expect((await Order.findById(broken.order._id)).inventoryReleasedAt).toBeUndefined();
  expect((await Order.findById(healthy.order._id)).inventoryReleasedAt).toBeTruthy();
  expect((await Ticket.findById(ticket._id)).sold).toBe(1);
});

test('free purchases save an order number, charge no fees and issue an owned admission', async () => {
  const result = await order();
  expect(result.order.orderNumber).toMatch(/^EC-/);
  expect(result.order.total).toBe(0);
  expect(result.order.status).toBe('confirmed');
  const response = await request(app).get('/api/tickets/my-tickets').set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(200);
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0].qrCode).toMatch(/^EC:/);
  const detail = await request(app).get(`/api/tickets/owned/${response.body.data[0].id}`).set('Authorization', `Bearer ${token}`);
  expect(detail.status).toBe(200);
});

test('rejects another event ticket and leaves stock untouched', async () => {
  ticket.eventId = new mongoose.Types.ObjectId();
  await ticket.save();
  await expect(order()).rejects.toThrow('does not belong');
  expect((await Ticket.findById(ticket._id)).sold).toBe(0);
});

test('organizer check-in accepts a signed group once under concurrent scans', async () => {
  await order([{ ticketId: ticket._id, quantity: 2 }]);
  const owned = await request(app).get('/api/tickets/my-tickets').set('Authorization', `Bearer ${token}`);
  const qrCode = owned.body.data[0].qrCode;
  const scan = () => request(app).post('/api/tickets/validate-qr').set('Authorization', `Bearer ${token}`).send({ eventId: event._id, qrCode });
  const responses = await Promise.all([scan(), scan()]);
  expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
  expect(responses.find(response => response.status === 200).body.data.quantity).toBe(2);
  const updated = await request(app).get('/api/tickets/my-tickets').set('Authorization', `Bearer ${token}`);
  expect(updated.body.data[0].status).toBe('used');
  expect(updated.body.data[0].usedAt).toBeTruthy();
});

test('check-in rejects forged codes, other organizers and canceled orders', async () => {
  const result = await order();
  const owned = await request(app).get('/api/tickets/my-tickets').set('Authorization', `Bearer ${token}`);
  const qrCode = owned.body.data[0].qrCode;
  const scan = code => request(app).post('/api/tickets/validate-qr').set('Authorization', `Bearer ${token}`).send({ eventId: event._id, qrCode: code });
  const forged = qrCode.slice(0, -1) + (qrCode.endsWith('0') ? '1' : '0');
  expect((await scan(forged)).status).toBe(400);
  await Event.updateOne({ _id: event._id }, { createdBy: new mongoose.Types.ObjectId() });
  expect((await scan(qrCode)).status).toBe(403);
  await Event.updateOne({ _id: event._id }, { createdBy: user._id });
  await paymentService.cancelOrder(result.order._id);
  expect((await scan(qrCode)).status).toBe(409);
});

test('rolls back all reservations when a later item fails', async () => {
  await expect(order([{ ticketId: ticket._id, quantity: 2 }, { ticketId: new mongoose.Types.ObjectId(), quantity: 1 }])).rejects.toThrow('Ticket not found');
  expect((await Ticket.findById(ticket._id)).sold).toBe(0);
});

test('combines duplicate ticket items before enforcing purchase maximum', async () => {
  await expect(order([{ ticketId: ticket._id, quantity: 6 }, { ticketId: ticket._id, quantity: 6 }])).rejects.toThrow('Cannot purchase');
  expect((await Ticket.findById(ticket._id)).sold).toBe(0);
});

test('concurrent reservations cannot oversell', async () => {
  ticket.quantity = 1;
  await ticket.save();
  const results = await Promise.allSettled([order(), order()]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect((await Ticket.findById(ticket._id)).sold).toBe(1);
});

test('paid purchases fail explicitly without Stripe and reserve no stock', async () => {
  ticket.price = 10;
  await ticket.save();
  await expect(order()).rejects.toMatchObject({ statusCode: 503 });
  expect((await Ticket.findById(ticket._id)).sold).toBe(0);
});

test('canceling a free order releases stock once under concurrent requests', async () => {
  const result = await order();
  await Promise.allSettled([paymentService.cancelOrder(result.order._id), paymentService.cancelOrder(result.order._id)]);
  expect((await Ticket.findById(ticket._id)).sold).toBe(0);
  expect((await Order.findById(result.order._id)).status).toBe('canceled');
});

test('hosted checkout charges server totals and webhook issues tickets idempotently', async () => {
  ticket.price = 10;
  await ticket.save();
  paymentService.isConfigured = true;
  const expires = Math.floor(Date.now() / 1000) + 1800;
  paymentService.stripe = {
    paymentIntents: { create: jest.fn().mockResolvedValue({ id: 'pi_embedded', client_secret: 'client-secret' }), cancel: jest.fn().mockResolvedValue({}) },
    checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_hosted', url: 'https://checkout.stripe.com/test', expires_at: expires }) } }
  };
  const result = await order();
  const response = await request(app).post(`/api/payments/orders/${result.order._id}/checkout`).set('Authorization', `Bearer ${token}`).send({ amount: 1 });
  expect(response.status).toBe(200);
  expect(response.body.data.url).toBe('https://checkout.stripe.com/test');
  const call = paymentService.stripe.checkout.sessions.create.mock.calls[0][0];
  expect(call.line_items[0].price_data.unit_amount).toBe(Math.round(result.order.total * 100));
  const session = { id: 'cs_hosted', payment_status: 'paid', amount_total: Math.round(result.order.total * 100),
    currency: 'usd', metadata: { orderId: String(result.order._id) }, payment_intent: 'pi_hosted' };
  await paymentService.confirmCheckout(session);
  await paymentService.confirmCheckout(session);
  expect((await Order.findById(result.order._id)).status).toBe('confirmed');
  expect((await Ticket.findById(ticket._id)).sold).toBe(1);
  await expect(paymentService.cancelOrder(result.order._id)).rejects.toThrow('cannot be canceled');
});

test('Stripe signature receives original bytes on both API versions', async () => {
  paymentService.isConfigured = true;
  process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
  paymentService.stripe = { webhooks: { constructEvent: jest.fn().mockReturnValue({ type: 'ignored', data: {} }) } };
  const payload = '{ "type": "ignored" }';
  for (const path of ['/api/payments/webhook', '/api/v1/payments/webhook']) {
    const response = await request(app).post(path).set('Content-Type', 'application/json').set('stripe-signature', 'signature').send(payload);
    expect(response.status).toBe(200);
    expect(paymentService.stripe.webhooks.constructEvent.mock.calls.at(-1)[0].toString()).toBe(payload);
  }
});

test('checkout retries keep Stripe parameters and cancellation idempotency stable', async () => {
  ticket.price = 10;
  await ticket.save();
  paymentService.isConfigured = true;
  const create = jest.fn().mockRejectedValueOnce(new Error('temporary checkout failure'))
    .mockResolvedValue({ id: 'cs_retry', url: 'https://checkout.stripe.com/retry', expires_at: Math.floor(Date.now() / 1000) + 86400 });
  const cancel = jest.fn().mockResolvedValue({ status: 'canceled' });
  paymentService.stripe = {
    paymentIntents: { create: jest.fn().mockResolvedValue({ id: 'pi_retry', client_secret: 'secret' }), cancel },
    checkout: { sessions: { create } }
  };
  const result = await order();
  await expect(paymentService.createCheckoutSession(result.order._id, user._id)).rejects.toThrow('temporary');
  await expect(paymentService.createCheckoutSession(result.order._id, user._id)).resolves.toMatchObject({ sessionId: 'cs_retry' });
  expect(cancel.mock.calls[0]).toEqual(cancel.mock.calls[1]);
  expect(cancel.mock.calls[0][2].idempotencyKey).toBeTruthy();
  expect(create.mock.calls[0]).toEqual(create.mock.calls[1]);
});

test('concurrent refunds release only their own reservation once', async () => {
  const result = await order([{ ticketId: ticket._id, quantity: 2 }]);
  await order([{ ticketId: ticket._id, quantity: 3 }]);
  result.order.total = 10;
  result.order.stripePaymentIntentId = 'pi_refund';
  await result.order.save();
  let calls = 0;
  let release;
  const bothRefunds = new Promise(resolve => { release = resolve; });
  paymentService.isConfigured = true;
  paymentService.stripe = { refunds: { create: jest.fn(async () => {
    if (++calls === 2) release();
    await bothRefunds;
    return { id: 're_once', status: 'succeeded' };
  }) } };
  await Promise.all([
    paymentService.processRefund(result.order._id, null, 'first request'),
    paymentService.processRefund(result.order._id, null, 'retry request')
  ]);
  expect((await Ticket.findById(ticket._id)).sold).toBe(3);
  expect((await Order.findById(result.order._id)).status).toBe('refunded');
  const refundCalls = paymentService.stripe.refunds.create.mock.calls;
  expect(refundCalls[0]).toEqual(refundCalls[1]);
});

test('password recovery stores only a hash and hides unknown accounts', async () => {
  const known = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
  const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'unknown@example.com' });
  expect(known.status).toBe(200);
  expect(known.body).toEqual(unknown.body);
  const rawToken = emailService.sendPasswordReset.mock.calls[0][2];
  expect((await User.findById(user._id)).resetPasswordToken).toBe(crypto.createHash('sha256').update(rawToken).digest('hex'));
  const reset = await request(app).post('/api/auth/reset-password').send({ token: rawToken, password: 'NewPassword1!' });
  expect(reset.status).toBe(200);
  expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  expect((await request(app).post('/api/auth/reset-password').send({ token: rawToken, password: 'OtherPassword1!' })).status).toBe(400);
  expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'NewPassword1!' })).status).toBe(200);
});

test('logout-all invalidates every device access token', async () => {
  const otherToken = jwtService.generateTokenPair(user).accessToken;
  expect((await request(app).post('/api/auth/logout-all').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${otherToken}`)).status).toBe(401);
});

test('two-factor login requires the challenge before issuing usable credentials', async () => {
  user.twoFactor = { isEnabled: true, secret: 'TEST_SECRET_FOR_LOGIN' };
  await user.save();
  const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'StrongPass1!' });
  expect(login.body.requiresTwoFactor).toBe(true);
  expect(login.body.accessToken).toBeUndefined();
  require('speakeasy').totp.verify.mockReturnValueOnce(false);
  const invalid = await request(app).post('/api/auth/verify-2fa').send({ tempToken: login.body.tempToken, code: '123456' });
  expect(invalid.status).toBe(400);
  const verified = await request(app).post('/api/auth/verify-2fa').send({ tempToken: login.body.tempToken, code: '123456' });
  expect(verified.status).toBe(200);
  expect(verified.body.accessToken).toBeTruthy();
  expect(verified.body.user.twoFactor).toBeUndefined();
});
