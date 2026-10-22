const mongoose = require('mongoose');
const { assertLocalTarget, localDayTime, buildDemoEvents, ensureDemoAccount, seedDemoWorld,
  DEMO_ACCOUNT, ACCOUNT_MARKER, SEED_TAG } = require('../scripts/seed-demo-world');
const { CATEGORY_SLUGS } = require('../src/utils/categories');

let connection;
let User;
let Event;
const now = new Date('2026-10-16T20:00:00Z');

beforeAll(async () => {
  // The Jest setup owns this ephemeral mongod. Never use the live dev URI.
  const isolated = new URL(process.env.MONGODB_URI);
  isolated.pathname = '/eventnow_local';
  connection = await mongoose.createConnection(isolated.href).asPromise();
  User = connection.model('User', require('../src/models/User').schema);
  Event = connection.model('Event', require('../src/models/Event').schema);
});
afterEach(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({})]);
});
afterAll(async () => { await connection.close(); });

it('rejects production, remote hosts, other databases, credentials and URI overrides', () => {
  expect(assertLocalTarget('mongodb://127.0.0.1:27017/eventnow_local', 'development')).toBeTruthy();
  expect(assertLocalTarget('mongodb://localhost:27017/eventnow_local', 'test')).toBeTruthy();
  expect(assertLocalTarget('mongodb://[::1]:27017/eventnow_local', 'test')).toBeTruthy();
  expect(() => assertLocalTarget('mongodb://127.0.0.1/eventnow_local', 'PRODUCTION')).toThrow();
  for (const uri of [undefined, 'mongodb+srv://remote.example/eventnow_local', 'mongodb://remote.example/eventnow_local',
    'mongodb://127.0.0.1:27017/production', 'mongodb://127.0.0.1.evil.test/eventnow_local',
    'mongodb://user:password@localhost/eventnow_local', 'mongodb://localhost/eventnow_local?authSource=production',
    'mongodb://localhost/eventnow_local#override', 'mongodb://localhost,remote.example/eventnow_local']) {
    expect(() => assertLocalTarget(uri, 'test')).toThrow();
  }
});

it('provides 120 clearly fictional events across all categories, countries and display phases', async () => {
  const events = buildDemoEvents(new mongoose.Types.ObjectId(), now);
  expect(events).toHaveLength(120);
  expect(new Set(events.map(event => String(event._id))).size).toBe(120);
  expect(new Set(events.map(event => event.category))).toEqual(new Set(CATEGORY_SLUGS));
  expect(new Set(events.map(event => event.location.city)).size).toBeGreaterThanOrEqual(20);
  expect(new Set(events.map(event => event.location.countryCode)).size).toBeGreaterThanOrEqual(12);
  expect(events.filter(event => event.date > now).length).toBeGreaterThanOrEqual(100);
  expect(events.some(event => event.date < now && event.endDate > now)).toBe(true);
  expect(events.some(event => event.status === 'completed')).toBe(true);
  for (const mode of ['free', 'onsite']) expect(events.some(event => event.paymentMode === mode)).toBe(true);
  for (const flag of [true, false]) {
    expect(events.some(event => event.isUnofficial === flag)).toBe(true);
    expect(events.some(event => event.isVirtual === flag)).toBe(true);
  }
  for (const event of events) {
    expect(event.title).toMatch(/^\[DEMO\]/);
    expect(event.description).toContain('EVENTO FICTICIO');
    expect(event.description).toContain(event.timeZone);
    expect(event.location.countryCode).toMatch(/^[A-Z]{2}$/);
    expect(event.tags).toEqual(expect.arrayContaining(['demo', SEED_TAG]));
    expect(event.endDate.getTime()).toBeGreaterThan(event.date.getTime());
    expect(event.attendees).toEqual([]);
    expect(event.interestedCount).toBe(0);
    expect(event.imported).toBe(false);
    expect(event.source).toBeUndefined();
    expect(event.paymentMode).not.toBe('platform');
    await new Event(event).validate();
  }
});

it('keeps local wall times correct across DST and midnight', () => {
  expect(localDayTime(new Date('2026-10-24T12:00:00Z'), 'Europe/Madrid', 1, 18).toISOString()).toBe('2026-10-25T17:00:00.000Z');
  expect(localDayTime(new Date('2026-10-16T20:00:00Z'), 'Asia/Tokyo', 1, 18).toISOString()).toBe('2026-10-18T09:00:00.000Z');
  const nearMidnight = new Date('2026-10-17T03:59:59Z');
  const today = buildDemoEvents(new mongoose.Types.ObjectId(), nearMidnight)[1];
  expect(today.date > nearMidnight).toBe(true);
  expect(today.date < new Date('2026-10-17T04:00:00Z')).toBe(true);
});

it('creates a usable non-admin account and is idempotent without replacing event edits', async () => {
  const first = await seedDemoWorld({ connection, now });
  expect(first).toMatchObject({ accountCreated: true, created: 120, existing: 0, total: 120 });
  const account = await User.findById(first.accountId).select('+password');
  expect(account.bio).toBe(ACCOUNT_MARKER);
  expect(account.password).not.toBe(DEMO_ACCOUNT.password);
  expect(await account.matchPassword(DEMO_ACCOUNT.password)).toBe(true);
  expect(account.role).toBe('user');
  expect(account.isOrganizerVerified).toBe(false);
  expect(account.verified).toBe(false);
  expect(account.notificationSettings.emailEnabled).toBe(false);
  expect(account.notificationSettings.pushEnabled).toBe(false);
  await Event.updateOne({ _id: first.sampleEventIds[0] }, { $set: { title: '[DEMO] Edición manual conservada' } });
  const second = await seedDemoWorld({ connection, now: new Date(now.getTime() + 86400000) });
  expect(second).toMatchObject({ accountCreated: false, created: 0, existing: 120, total: 120 });
  expect(await Event.countDocuments()).toBe(120);
  expect((await Event.findById(first.sampleEventIds[0])).title).toBe('[DEMO] Edición manual conservada');
  // This is a 120-document fixture import plus an idempotency rerun, not an
  // endpoint latency benchmark. Allow instrumentation on slow CI/storage.
}, 120000);

it('detects even the last identifier collision before inserting earlier events', async () => {
  const { user } = await ensureDemoAccount(User);
  const payloads = buildDemoEvents(user._id, now);
  const collision = payloads[payloads.length - 1];
  collision.createdBy = new mongoose.Types.ObjectId();
  collision.title = 'Evento personal que no debe modificarse';
  await Event.create(collision);
  await expect(seedDemoWorld({ connection, now })).rejects.toThrow('Colisión');
  expect(await Event.countDocuments()).toBe(1);
  expect((await Event.findById(collision._id)).title).toBe(collision.title);
});

it('never resets or commandeers an existing account with the same identity', async () => {
  const existing = await User.create({ ...DEMO_ACCOUNT, password: 'OtherPassword!2026', bio: 'Mi cuenta personal' });
  await expect(ensureDemoAccount(User)).rejects.toThrow('marcador');
  const unchanged = await User.findById(existing._id).select('+password');
  expect(await unchanged.matchPassword('OtherPassword!2026')).toBe(true);
  expect(unchanged.bio).toBe('Mi cuenta personal');
  expect(await Event.countDocuments()).toBe(0);
});

it('refuses a seed-owned account whose password was changed rather than silently resetting it', async () => {
  const { user } = await ensureDemoAccount(User);
  user.password = 'ChangedPassword!2026';
  await user.save();
  await expect(ensureDemoAccount(User)).rejects.toThrow('no se restablece');
  const account = await User.findById(user._id).select('+password');
  expect(await account.matchPassword('ChangedPassword!2026')).toBe(true);
});

it('checks the actual active connection before creating data', async () => {
  await expect(seedDemoWorld({ connection: { name: 'production', host: '127.0.0.1' } })).rejects.toThrow();
  await expect(seedDemoWorld({ connection: { name: 'eventnow_local', host: 'remote.example' } })).rejects.toThrow();
  expect(await User.countDocuments()).toBe(0);
});
