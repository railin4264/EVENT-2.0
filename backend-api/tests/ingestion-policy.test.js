const { toEventDoc, aggregateAndStore } = require('../src/services/eventAggregator');
const { harvestAllEvents } = require('../src/services/eventIngestion/GlobalEventHarvester');
const RDEventSeeder = require('../src/services/rdEventSeeder');
const { parseIcsDate, parseIcs, fetchJsonFeeds } = require('../src/services/feedImporter');
const axios = require('axios');
const item = () => ({ source: 'json', sourceId: 'source-123', title: 'Festival cultural', description: 'Un evento de la agenda de su organizador.', date: new Date(Date.now() + 86400000), location: { coordinates: [-3.7, 40.4], address: 'Calle Mayor 15', city: 'Madrid', country: 'España' }, price: { amount: 0, currency: 'EUR' } });

test('real imports keep provenance and location, and require moderation', () => {
  const doc = toEventDoc(item());
  expect(doc.status).toBe('pending_review');
  expect(doc.sourceId).toBe('source-123');
  expect(doc.location.city).toBe('Madrid');
  expect(doc.location.country).toBe('España');
});
test('rejects missing provenance, impossible coordinates and absent destinations', () => {
  expect(toEventDoc({ ...item(), sourceId: undefined })).toBeNull();
  expect(toEventDoc({ ...item(), location: { coordinates: [200, 100] } })).toBeNull();
  expect(toEventDoc({ ...item(), location: { coordinates: [0, 0] } })).toBeNull();
});
test('demo ingestion cannot write outside explicitly enabled development', async () => {
  expect(await harvestAllEvents()).toMatchObject({ skipped: true });
  expect(await RDEventSeeder.seedAllRDEvents(true)).toMatchObject({ skipped: true });
  expect(await RDEventSeeder.ensureMinimumEvents()).toMatchObject({ skipped: true });
  expect(await RDEventSeeder.ensureOrganizers()).toEqual({});
});

test('calendar times use their source zone and reject missing or ambiguous zones', () => {
  expect(parseIcsDate('20270102T180000Z').toISOString()).toBe('2027-01-02T18:00:00.000Z');
  expect(parseIcsDate('20270102T180000', 'America/New_York').toISOString()).toBe('2027-01-02T23:00:00.000Z');
  expect(parseIcsDate('20271107T013000', 'America/New_York')).toBeNull();
  expect(parseIcsDate('20270102T180000')).toBeNull();
  expect(parseIcsDate('20270230T180000Z')).toBeNull();
  expect(parseIcs('BEGIN:VEVENT\nDTSTART;TZID=Europe/Madrid:20270102T180000\nEND:VEVENT')[0].start.toISOString()).toBe('2027-01-02T17:00:00.000Z');
});

test('JSON source identifiers survive rescheduling and unknown coordinates are not fabricated', async () => {
  const previous = process.env.JSON_EVENT_FEEDS;
  process.env.JSON_EVENT_FEEDS = 'https://agenda.example.org/events.json';
  const fixture = { id: 'stable-1', title: 'Evento', date: '2027-01-02T18:00:00Z', city: 'Madrid', country: 'España', lat: 40.4, lng: -3.7, address: 'Calle Mayor 15' };
  const mock = jest.spyOn(axios, 'get').mockResolvedValue({ data: [fixture, { title: 'Sin coordenadas', date: fixture.date }] });
  try {
    const first = await fetchJsonFeeds();
    mock.mockResolvedValue({ data: [{ ...fixture, date: '2027-01-03T18:00:00Z' }] });
    const second = await fetchJsonFeeds();
    expect(first).toHaveLength(1);
    expect(first[0].sourceId).toBe(second[0].sourceId);
    expect(first[0].location.city).toBe('Madrid');
  } finally {
    mock.mockRestore();
    if (previous === undefined) delete process.env.JSON_EVENT_FEEDS; else process.env.JSON_EVENT_FEEDS = previous;
  }
});

test('synchronizing an existing import preserves its moderation status and ownership', async () => {
  const User = require('../src/models/User');
  const Event = require('../src/models/Event');
  const previous = process.env.JSON_EVENT_FEEDS;
  process.env.JSON_EVENT_FEEDS = 'https://agenda.example.org/events.json';
  const owner = await User.create({ username: 'importowner', email: 'system@eventconnect.app', password: 'TestPassword2026!', firstName: 'Agenda', lastName: 'Importada', role: 'system' });
  const doc = toEventDoc({ ...item(), sourceId: 'agenda.example.org:stable-1' });
  const existing = await Event.create({ ...doc, status: 'cancelled', createdBy: owner._id });
  const mock = jest.spyOn(axios, 'get').mockResolvedValue({ data: [{ id: 'stable-1', title: doc.title, date: doc.date.toISOString(), endDate: new Date(doc.date.getTime() + 3600000).toISOString(), address: 'Calle Mayor 15', city: 'Madrid', country: 'España', lat: 40.4, lng: -3.7 }] });
  try {
    const result = await aggregateAndStore();
    const saved = await Event.findById(existing._id);
    expect(result.updated).toBe(1);
    expect(saved.status).toBe('cancelled');
    expect(String(saved.createdBy)).toBe(String(owner._id));
    expect(await Event.countDocuments({ source: 'json', sourceId: doc.sourceId })).toBe(1);
  } finally {
    mock.mockRestore();
    if (previous === undefined) delete process.env.JSON_EVENT_FEEDS; else process.env.JSON_EVENT_FEEDS = previous;
  }
});
