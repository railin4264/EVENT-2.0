const { analyticsInput } = require('../src/utils/analyticsInput');
const { sendPush } = require('../src/services/pushTransport');
const { withJobLease } = require('../src/services/jobLease');
const request = require('supertest');
const { app } = require('../src/server');

test('client analytics cannot impersonate a user or store authentication links and personal coordinates', () => {
  const [result] = analyticsInput([{ name: 'page_view', userId: 'spoofed', properties: {
    email: 'private@example.test', coordinates: [12, 34], url: 'https://example.test/reset?token=secret#hidden', nested: { password: 'secret', category: 'music' }
  } }], 'authenticated');
  expect(result.userId).toBe('authenticated');
  expect(result.url).toBe('/reset');
  expect(result.properties).toMatchObject({ serverVerified: false, nested: { category: 'music' } });
  expect(JSON.stringify(result)).not.toMatch(/private@example|secret|coordinates/);
  expect(() => analyticsInput(Array(51).fill({ name: 'view' }))).toThrow();
  expect(() => analyticsInput([{ name: 'view', timestamp: 'invalid' }])).toThrow();
});
test('Expo tokens use Expo while FCM receives only string data; acceptance is recorded separately', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ status: 'ok', id: 'expo-ticket' }] }) });
  const firebaseService = { sendToDevices: jest.fn().mockResolvedValue({ successCount: 1, tokensToRemove: [] }) };
  const result = await sendPush(['ExpoPushToken[abc123]', 'fcm-device'], { title: 'Aviso', body: 'Texto', data: { eventId: '123', enabled: false, nested: { x: 1 } } }, { fetchImpl, firebaseService });
  expect(firebaseService.sendToDevices).toHaveBeenCalledWith(['fcm-device'], expect.anything(), { eventId: '123', enabled: 'false', nested: '{"x":1}' });
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)[0].to).toBe('ExpoPushToken[abc123]');
  expect(result.successCount).toBe(2);
  expect(result.receipts).toEqual([{ ticketId: 'expo-ticket', token: 'ExpoPushToken[abc123]' }]);
});
test('invalid Expo devices are removed without claiming push success', async () => {
  const result = await sendPush(['ExponentPushToken[expired]'], { title: 'Aviso', body: 'Texto' }, {
    fetchImpl: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }) })
  });
  expect(result.success).toBe(false);
  expect(result.tokensToRemove).toEqual(['ExponentPushToken[expired]']);
});
test('two schedulers cannot overlap the same job and a failed job releases its lease', async () => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  const first = withJobLease('audit-shared-job', async () => { entered(); await pending; });
  await started;
  const second = jest.fn();
  expect(await withJobLease('audit-shared-job', second)).toBe(false);
  expect(second).not.toHaveBeenCalled();
  release(); await first;
  await expect(withJobLease('audit-shared-job', async () => { throw new Error('failure'); })).rejects.toThrow('failure');
  expect(await withJobLease('audit-shared-job', async () => {})).toBe(true);
});
test('readiness checks the required cache separately from liveness', async () => {
  const previous = process.env.REDIS_REQUIRED;
  process.env.REDIS_REQUIRED = 'true';
  try {
    expect((await request(app).get('/health')).status).toBe(200);
    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body.checks).toEqual({ database: true, redis: false });
  } finally { if (previous === undefined) delete process.env.REDIS_REQUIRED; else process.env.REDIS_REQUIRED = previous; }
});
test('a completed scheduled slot cannot run twice sequentially on another replica', async () => {
  const run = jest.fn();
  expect(await withJobLease('audit-scheduled-slot', run, { slot: '2026-10-20T21:00' })).toBe(true);
  expect(await withJobLease('audit-scheduled-slot', run, { slot: '2026-10-20T21:00' })).toBe(false);
  expect(run).toHaveBeenCalledTimes(1);
  expect(await withJobLease('audit-scheduled-slot', run, { slot: '2026-10-20T21:01' })).toBe(true);
  expect(run).toHaveBeenCalledTimes(2);
});
test('canonical notification toggles remain effective alongside legacy channel preferences', () => {
  const Service = require('../src/services/notificationService');
  const service = new Service(null);
  expect(service.shouldSendBasedOnSettings({ type: 'event_reminder' }, { pushEnabled: true }, { push: true, eventReminders: false })).toBe(false);
  expect(service.shouldSendBasedOnSettings({ type: 'message' }, { pushEnabled: true }, { push: true, newMessages: false })).toBe(false);
  const { inAppNotificationFilter } = require('../src/utils/notificationPreferences');
  expect(inAppNotificationFilter({ settings: { notifications: { eventReminders: false } } }, ['event_reminder', 'event_invite'])).toEqual({ type: { $nin: ['event_reminder'] } });
});
test('signed accounts behind one NAT have independent rate budgets and forged tokens do not', () => {
  const jwt = require('../src/services/jwtService');
  const { rateLimitIdentity, authRateLimitIdentity } = require('../src/utils/rateLimitIdentity');
  const tokenA = jwt.generateAccessToken({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
  const tokenB = jwt.generateAccessToken({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb' });
  const requestFor = token => ({ ip: '127.0.0.1', headers: { authorization: `Bearer ${token}` } });
  expect(rateLimitIdentity(requestFor(tokenA))).not.toBe(rateLimitIdentity(requestFor(tokenB)));
  expect(rateLimitIdentity(requestFor('forged'))).toBe('ip:127.0.0.1');
  expect(authRateLimitIdentity({ ip: '127.0.0.1', body: { email: 'private@example.test' } })).not.toContain('private@example.test');
  expect(authRateLimitIdentity({ ip: '127.0.0.1', body: { email: 'a@example.test' } })).not.toBe(authRateLimitIdentity({ ip: '127.0.0.1', body: { email: 'b@example.test' } }));
});
test('scheduled retention archives old events without destroying their identity or reference target', async () => {
  const User = require('../src/models/User'), Event = require('../src/models/Event');
  const owner = await User.create({ username: 'archive_owner', firstName: 'Archive', email: 'archive@example.test', password: 'ArchiveOnly!2026' });
  const event = await Event.create({ title: 'Historical activity', description: 'Keep the historical activity reference', category: 'music', createdBy: owner._id, status: 'expired', date: new Date('2025-01-01'), location: { type: 'Point', coordinates: [-69, 18], address: 'Public venue' } });
  await Event.collection.updateOne({ _id: event._id }, { $set: { updatedAt: new Date('2025-01-02') } });
  const CronService = require('../src/services/cronService'), scheduler = new CronService();
  scheduler.initialize();
  try {
    await scheduler.jobs.dailyEventCleanup.execute();
    const retained = await Event.findById(event._id);
    expect(retained).not.toBeNull();
    expect(retained.title).toBe('Historical activity');
    expect(retained.archivedAt).toBeInstanceOf(Date);
  } finally { await Promise.all(Object.values(scheduler.jobs).map(job => job.destroy())); }
});
test('scale inspection reports actual BSON and query work without exporting private event content', async () => {
  const collection = require('mongoose').connection.db.collection('audit_scale');
  await collection.insertOne({ title: 'PRIVATE_TITLE', location: { address: 'PRIVATE_ADDRESS' }, status: 'published', date: new Date(Date.now() + 86400000), attendees: [{ user: 'private-user' }], views: [], tags: ['demo'], maxAttendees: 1000000 });
  const report = await require('../src/services/eventScaleInspection').inspectEventScale(collection);
  expect(report.eventCount).toBe(1);
  expect(report.largestDocuments[0]).toMatchObject({ attendees: 1, views: 0, isDemo: true });
  expect(report.largestDocuments[0].bytes).toBeGreaterThan(100);
  expect(report.query.returned).toBe(1);
  expect(report.declaredCapacityNeedsValidation).toBe(true);
  expect(report.capacityCertified).toBe(false);
  expect(JSON.stringify(report)).not.toMatch(/PRIVATE_TITLE|PRIVATE_ADDRESS|private-user/);
});
