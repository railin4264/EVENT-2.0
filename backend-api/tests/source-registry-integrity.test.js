const express = require('express');
const request = require('supertest');
const axios = require('axios');
const dns = require('dns').promises;
const User = require('../src/models/User');
const Source = require('../src/models/Source');
const Event = require('../src/models/Event');
const jwt = require('../src/services/jwtService');
const { sourceBlockers } = require('../src/services/eventIngestion/sourcePolicy');
const { fetchSource, publicAddress } = require('../src/services/eventIngestion/safeSourceFetch');
const { syncAgenda, normalizeAgendaRow } = require('../src/services/eventIngestion/agendaConnector');
const { runGlobalIngestionCycle } = require('../src/services/eventIngestion/GlobalPipelineOrchestrator');
const { seedSourceRegistry } = require('../src/services/eventIngestion/sourceRegistrySeeder');
const { toEventDoc, hasAnySourceConfigured, fetchFromEventbrite, fetchFromBandsintown, fetchFromMeetup } = require('../src/services/eventAggregator');
const { publishFriendPlan } = require('../src/services/eventIngestion/friendPlanDraftService');

const app = express(); app.use(express.json()); app.use('/sources', require('../src/routes/sources'));
app.use('/events', require('../src/routes/events'));
let admin, other, adminToken, otherToken;
beforeAll(async () => {
  admin = await User.create({ username: 'sourceadmin', email: 'sourceadmin@test.example', password: 'Password2026!', firstName: 'Source', role: 'admin' });
  other = await User.create({ username: 'sourceother', email: 'sourceother@test.example', password: 'Password2026!', firstName: 'Other' });
  adminToken = jwt.generateAccessToken({ id: admin.id });
  otherToken = jwt.generateAccessToken({ id: other.id });
});
beforeEach(async () => { await Promise.all([Source.deleteMany({}), Event.deleteMany({})]); });
afterEach(() => jest.restoreAllMocks());

function approved(patch = {}) {
  return { sourceId: 'test-agenda', name: 'Agenda de prueba', status: 'approved', classification: 'O', adapterType: 'json_feed',
    accessConfig: { endpointUrl: 'https://agenda.example.org/events.json', termsUrl: 'https://agenda.example.org/terms' },
    license: { commercialAllowed: true, displayAllowed: true, reviewedAt: new Date(), reviewedBy: admin._id },
    responsibleOrganizer: admin._id, eventDefaults: { freeAdmissionConfirmed: false, currency: 'JPY' }, ...patch };
}
function row(patch = {}) {
  return { id: 'stable-event', title: '東京の音楽イベント', description: 'Un concierto con horario y ubicación confirmados.',
    date: new Date(Date.now() + 86400000).toISOString(), timeZone: 'Asia/Tokyo', lat: 35.68, lng: 139.76,
    address: 'Chiyoda Tokyo Japan', city: 'Tokyo', country: 'Japan', price: 2500, currency: 'JPY', ...patch };
}
function mockFeed(rows = [row()]) {
  jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  return jest.spyOn(axios, 'get').mockResolvedValue({ data: rows, headers: { 'content-type': 'application/json' } });
}

test.each(['get', 'post'])('source registry requires authentication for %s', async method => {
  const response = await request(app)[method]('/sources');
  expect(response.status).toBe(401);
});
test.each(['/sources/seed', '/sources/connect-agenda'])('anonymous callers cannot trigger %s even in development', async path => {
  const response = await request(app).post(path).send({ agendaUrl: 'https://example.org/agenda.ics' });
  expect(response.status).toBe(401);
});
test('the global harvest endpoint requires an administrator in every environment', async () => {
  expect((await request(app).post('/events/pipeline/harvest')).status).toBe(401);
  expect((await request(app).post('/events/pipeline/harvest').set('Authorization', `Bearer ${otherToken}`)).status).toBe(403);
});
test('ordinary accounts cannot list source configuration or seed the registry', async () => {
  expect((await request(app).get('/sources').set('Authorization', `Bearer ${otherToken}`)).status).toBe(403);
  expect((await request(app).post('/sources/seed').set('Authorization', `Bearer ${otherToken}`)).status).toBe(403);
});
test('organizers can select only their own eligible agendas; pending integrations stay hidden', async () => {
  await Source.create(approved());
  await Source.create(approved({ sourceId: 'my-agenda', responsibleOrganizer: other.id }));
  await Source.create(approved({ sourceId: 'pending-adapter', responsibleOrganizer: other.id, adapterType: 'openagenda' }));
  const response = await request(app).get('/sources/my-agendas').set('Authorization', `Bearer ${otherToken}`);
  expect(response.status).toBe(200); expect(response.body.data.map(source => source.sourceId)).toEqual(['my-agenda']);
  expect(response.headers['cache-control']).toBe('private, no-store');
});
test('configuration edits preserve identity and invalidate previous approval', async () => {
  const source = await Source.create(approved({ status: 'active' }));
  const response = await request(app).patch(`/sources/${source.sourceId}/config`).set('Authorization', `Bearer ${adminToken}`).send({
    name: 'Agenda actualizada', endpointUrl: 'https://agenda.example.org/new.json', adapterType: 'json_feed', classification: 'O', country: 'JP', frequencyHours: 12
  });
  expect(response.status).toBe(200); expect(response.body.source.status).toBe('evaluating');
  expect(response.body.source.license.displayAllowed).toBe(false);
  expect(response.body.source.license.reviewedAt).toBeUndefined();
  expect(response.body.source.sourceId).toBe(source.sourceId);
});
test('registering a source saves the selected country and interval without activating it', async () => {
  const response = await request(app).post('/sources').set('Authorization', `Bearer ${adminToken}`).send({
    sourceId: 'new-agenda', name: 'Agenda local', endpointUrl: 'https://agenda.example.org/new.json', adapterType: 'json_feed', classification: 'O', country: 'ES', frequencyHours: 12
  });
  expect(response.status).toBe(201); expect(response.body.source.coverage.country).toBe('ES');
  expect(response.body.source.syncSchedule.frequencyHours).toBe(12); expect(response.body.source.status).toBe('evaluating');
});
test('required credits cannot be omitted from a permission review', async () => {
  const source = await Source.create(approved());
  const response = await request(app).patch(`/sources/${source.sourceId}/review`).set('Authorization', `Bearer ${adminToken}`).send({
    commercialAllowed: true, displayAllowed: true, termsUrl: 'https://agenda.example.org/terms', attributionRequired: true
  });
  expect(response.status).toBe(400);
});
test('flyer-only and oversized requests do not masquerade as text extraction', async () => {
  expect((await request(app).post('/sources/friend-draft').send({ flyerUrl: 'https://example.org/flyer.jpg' })).status).toBe(400);
  expect((await request(app).post('/sources/friend-draft').send({ text: 'x'.repeat(10001) })).status).toBe(400);
});
test('new sources do not imply permission, country coverage or readiness', () => {
  const source = new Source({ sourceId: 'unreviewed', name: 'Unknown' });
  expect(source.license.commercialAllowed).toBe(false);
  expect(source.license.displayAllowed).toBe(false);
  expect(source.coverage.country).toBeUndefined();
  expect(sourceBlockers(source)).toContain('source_not_approved');
});
test('seeding adds candidates and preserves suspensions and previous reviews', async () => {
  await seedSourceRegistry();
  expect(await Source.countDocuments({ status: 'active' })).toBe(0);
  await Source.updateOne({ sourceId: 'ticketmaster-discovery' }, { $set: { status: 'suspended', 'license.licenseType': 'Manual review' } });
  await seedSourceRegistry();
  const saved = await Source.findOne({ sourceId: 'ticketmaster-discovery' });
  expect(saved.status).toBe('suspended'); expect(saved.license.licenseType).toBe('Manual review');
});
test('admin activation needs an explicit review and a supported adapter', async () => {
  const source = await Source.create(approved({ status: 'evaluating', license: { commercialAllowed: false, displayAllowed: false } }));
  const denied = await request(app).patch(`/sources/${source.sourceId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'active' });
  expect(denied.status).toBe(409);
  const review = await request(app).patch(`/sources/${source.sourceId}/review`).set('Authorization', `Bearer ${adminToken}`).send({
    commercialAllowed: true, displayAllowed: true, termsUrl: 'https://agenda.example.org/terms', currency: 'JPY'
  });
  expect(review.status).toBe(200);
  const activated = await request(app).patch(`/sources/${source.sourceId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'active' });
  expect(activated.status).toBe(200);
  expect(activated.body.source.license.reviewedBy).toBe(admin.id);
});
test('disabling display permission suspends an active source', async () => {
  const source = await Source.create(approved({ status: 'active' }));
  const response = await request(app).patch(`/sources/${source.sourceId}/review`).set('Authorization', `Bearer ${adminToken}`).send({
    commercialAllowed: true, displayAllowed: false, termsUrl: 'https://agenda.example.org/terms'
  });
  expect(response.status).toBe(200); expect(response.body.source.status).toBe('suspended');
});
test('unknown or foreign agendas are not fetched by an organizer', async () => {
  const fetch = mockFeed();
  await Source.create(approved());
  const response = await request(app).post('/sources/connect-agenda').set('Authorization', `Bearer ${otherToken}`).send({ agendaUrl: approved().accessConfig.endpointUrl });
  expect(response.status).toBe(403); expect(fetch).not.toHaveBeenCalled();
});
test('no approved sources means no network requests or reported imports', async () => {
  const fetch = mockFeed();
  await Source.create(approved({ status: 'evaluating' }));
  const result = await runGlobalIngestionCycle();
  expect(result.stats.canonicalSaved).toBe(0); expect(result.stats.eligibleSources).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
});
test('a legacy active flag without reviewed permission cannot trigger a harvest', async () => {
  const fetch = mockFeed();
  await Source.create(approved({ status: 'active', license: { commercialAllowed: true } }));
  const result = await runGlobalIngestionCycle();
  expect(result.stats.blockedSources).toBe(1); expect(fetch).not.toHaveBeenCalled();
});
test('dry run previews valid records without storing events or changing metrics', async () => {
  mockFeed(); const source = await Source.create(approved()); const before = source.toObject();
  const result = await runGlobalIngestionCycle({ dryRun: true });
  expect(result.stats.previewCount).toBe(1); expect(result.stats.canonicalSaved).toBe(0);
  expect(await Event.countDocuments()).toBe(0);
  expect((await Source.findById(source.id)).toObject()).toEqual(before);
});
test('imports keep Japanese text and currency, require review and count real creates', async () => {
  mockFeed(); await Source.create(approved());
  const result = await runGlobalIngestionCycle();
  const saved = await Event.findOne();
  expect(result.stats.created).toBe(1); expect(result.stats.canonicalSaved).toBe(1);
  expect(saved.title).toBe(row().title); expect(saved.price.currency).toBe('JPY');
  expect(saved.status).toBe('pending_review'); expect(saved.isOfficial).toBe(false);
});
test('rescheduling keeps identity, moderation, organizer and a single stored record', async () => {
  const fetch = mockFeed(); const source = await Source.create(approved());
  await syncAgenda(source.accessConfig.endpointUrl, admin.id, { type: 'json', source });
  const first = await Event.findOne(); first.status = 'cancelled'; await first.save();
  fetch.mockResolvedValue({ data: [row({ date: new Date(Date.now() + 172800000).toISOString() })], headers: {} });
  const result = await syncAgenda(source.accessConfig.endpointUrl, admin.id, { type: 'json', source });
  expect(result.created).toBe(0); expect(result.updated).toBe(1); expect(await Event.countDocuments()).toBe(1);
  const saved = await Event.findById(first.id);
  expect(saved.status).toBe('cancelled'); expect(String(saved.createdBy)).toBe(admin.id);
});
test('one invalid document does not abort subsequent records or inflate saved counters', async () => {
  mockFeed([row({ id: 'too-expensive', price: 1000001 }), row({ id: 'valid' })]);
  const source = await Source.create(approved());
  const result = await syncAgenda(source.accessConfig.endpointUrl, admin.id, { type: 'json', source });
  expect(result.failedWrites).toBe(1); expect(result.created).toBe(1); expect(result.syncedCount).toBe(1);
  expect(await Event.countDocuments()).toBe(1);
});
test('records without a stable id, timezone, coordinates or declared price stay out of the catalog', () => {
  for (const patch of [{ id: null }, { date: '2027-01-05T19:00:00' }, { lat: undefined }, { price: undefined }, { address: '', city: '', country: '' }]) {
    expect(normalizeAgendaRow(row(patch), approved().accessConfig.endpointUrl, approved())).toBeNull();
  }
});
test('unknown currency is rejected instead of relabelled USD', () => {
  expect(normalizeAgendaRow(row({ currency: 'NOT-A-CURRENCY' }), approved().accessConfig.endpointUrl, approved())).toBeNull();
  expect(toEventDoc({ ...row(), source: 'test', sourceId: '123', location: { coordinates: [139, 35], address: 'Tokyo Japan' }, price: { amount: 20, currency: 'CNY' } }).price.currency).toBe('CNY');
});
test('private calendar access tokens do not enter the public event document', () => {
  const document = normalizeAgendaRow(row(), 'https://agenda.example.org/private-secret/events.json?token=secret-access', approved());
  expect(JSON.stringify(document)).not.toContain('secret-access');
  expect(JSON.stringify(document)).not.toContain('private-secret');
});
test('ICS uses DTSTART and GEO and requires source-confirmed free admission', async () => {
  const feed = mockFeed(); feed.mockResolvedValue({ data: 'BEGIN:VEVENT\nUID:calendar-1\nSUMMARY:Open Concert\nDTSTART:20270105T180000Z\nGEO:35.68;139.76\nLOCATION:Tokyo Public Park\nEND:VEVENT', headers: {} });
  const source = approved({ adapterType: 'ics_feed', eventDefaults: { freeAdmissionConfirmed: true, currency: 'JPY' } });
  const result = await syncAgenda('https://agenda.example.org/calendar.ics', admin.id, { type: 'ics', source, dryRun: true });
  expect(result.previewCount).toBe(1); expect(result.events[0].date.toISOString()).toBe('2027-01-05T18:00:00.000Z');
  expect(result.events[0].location.coordinates).toEqual([139.76, 35.68]);
});
test('scheduled runs respect next due time', async () => {
  const fetch = mockFeed(); await Source.create(approved({ status: 'active', syncSchedule: { nextSyncDue: new Date(Date.now() + 86400000) } }));
  const result = await runGlobalIngestionCycle({ dueOnly: true });
  expect(result.stats.eligibleSources).toBe(0); expect(fetch).not.toHaveBeenCalled();
});
test.each(['127.0.0.1', '10.0.0.2', '169.254.169.254', '192.168.1.1', '100.64.0.1', '::1', '::ffff:127.0.0.1', 'fe80::1', '2001:db8::1'])('does not fetch internal/reserved destination %s', async ip => {
  jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: ip, family: ip.includes(':') ? 6 : 4 }]);
  const fetch = jest.spyOn(axios, 'get');
  await expect(fetchSource('https://agenda.example.org/events.json')).rejects.toThrow('públicas');
  expect(fetch).not.toHaveBeenCalled(); expect(publicAddress(ip)).toBe(false);
});
test('approved HTTPS requests pin DNS, bound payloads and never follow redirects', async () => {
  const fetch = mockFeed(); await fetchSource('https://agenda.example.org/events.json');
  const config = fetch.mock.calls[0][1];
  expect(config.maxRedirects).toBe(0); expect(config.proxy).toBe(false); expect(config.maxContentLength).toBe(2097152);
  const lookup = config.httpsAgent.options.lookup;
  const callback = jest.fn(); lookup('agenda.example.org', {}, callback);
  expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
});
test('old provider credentials alone do not activate retired or unsupported discovery endpoints', async () => {
  const get = jest.spyOn(axios, 'get');
  expect(await fetchFromEventbrite()).toEqual([]); expect(await fetchFromBandsintown()).toEqual([]); expect(await fetchFromMeetup()).toEqual([]);
  expect(get).not.toHaveBeenCalled(); expect(typeof hasAnySourceConfigured()).toBe('boolean');
});
test('group plans stay private and public submissions require moderation', async () => {
  const plan = { title: 'Plan de lectura', description: 'Una reunión para conversar sobre libros.', date: new Date(Date.now() + 86400000).toISOString(),
    address: 'Biblioteca de la ciudad', location: { coordinates: [-3.7, 40.4] }, price: { amount: 0, currency: 'EUR' }, visibility: 'group' };
  const group = await publishFriendPlan(plan, admin.id);
  expect(group.isPrivate).toBe(true); expect(group.isSecretLocation).toBe(true);
  const publicPlan = await publishFriendPlan({ ...plan, visibility: 'public' }, admin.id);
  expect(publicPlan.status).toBe('pending_review');
});


test('a disabled demo seeder returns a conflict rather than false import success', async () => {
  const seeder = require('../src/services/rdEventSeeder');
  jest.spyOn(seeder, 'seedAllRDEvents').mockResolvedValue({ skipped: true });
  const response = await request(app).post('/events/admin/seed-now').set('Authorization', `Bearer ${adminToken}`);
  expect(response.status).toBe(409); expect(response.body.success).toBe(false);
  expect(await Event.countDocuments()).toBe(0);
});

test('approval alone does not start scheduled synchronization', async () => {
  const fetch = mockFeed(); await Source.create(approved());
  const result = await runGlobalIngestionCycle({ dueOnly: true });
  expect(result.stats.eligibleSources).toBe(0); expect(fetch).not.toHaveBeenCalled();
});


test('friend publication rejects unknown price and preserves a confirmed foreign currency', async () => {
  const plan = { title: 'Club de lectura', description: 'Conversamos sobre libros en Tokio.', date: new Date(Date.now() + 86400000).toISOString(),
    timeZone: 'Asia/Tokyo', address: 'Biblioteca de Tokio', location: { coordinates: [139.76, 35.68] }, visibility: 'public' };
  await expect(publishFriendPlan(plan, admin.id)).rejects.toThrow('precio');
  expect(await Event.countDocuments()).toBe(0);
  const saved = await publishFriendPlan({ ...plan, price: { amount: 2500, currency: 'JPY' } }, admin.id);
  expect(saved.price.amount).toBe(2500); expect(saved.price.currency).toBe('JPY'); expect(saved.timeZone).toBe('Asia/Tokyo');
});

test('every public open-data adapter can be registered for administrator review', async () => {
  const { OPEN_DATA_SOURCES, seedSourceRegistry } = require('../src/services/eventIngestion/sourceRegistrySeeder');
  const { PUBLIC_AGENDAS } = require('../src/services/eventIngestion/publicAgendaAdapters');
  expect(OPEN_DATA_SOURCES.map(s => s.adapterType).sort()).toEqual(Object.keys(PUBLIC_AGENDAS).sort());
  await seedSourceRegistry();
  for (const seed of OPEN_DATA_SOURCES) {
    const saved = await Source.findOne({ sourceId: seed.sourceId });
    expect(saved).not.toBeNull();
    await expect(saved.validate()).resolves.toBeUndefined();
    expect(saved.status).toBe('evaluating');
    expect(saved.license.commercialAllowed).toBe(false);
  }
});
