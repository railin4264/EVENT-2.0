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

test('static catalogs with relative dates never write outside explicitly enabled development', async () => {
  const runs = [
    require('../src/services/eventIngestion/planetaryEventHarvester').seedPlanetaryEvents(),
    require('../src/services/eventIngestion/virtualEventHarvester').syncVirtualEvents(),
    require('../src/services/eventIngestion/clinicalTrialsHarvester').syncClinicalTrials(),
    require('../src/services/eventIngestion/rdTicketsHarvester').syncRDTickets(),
    require('../src/services/eventIngestion/universityAgendaHarvester').syncUniversityAgendas(),
    require('../src/services/eventIngestion/civicPoliticalAgendaHarvester').syncCivicPoliticalAgendas(),
    require('../src/services/eventIngestion/astronomyEventsHarvester').syncAstronomyEvents(),
    require('../src/services/eventIngestion/sciFiMysteryGreenHarvester').syncSpecializedGlobalEvents(),
    require('../src/services/eventIngestion/actionSportsAndCraftsHarvester').syncActionSportsAndCrafts(),
    require('../src/services/eventIngestion/fashionAndEditorialHarvester').syncAll(),
    require('../src/services/eventIngestion/globalMetropolisAndNichesHarvester').syncAll()
  ];
  for (const result of await Promise.all(runs)) expect(result).toMatchObject({ skipped: true });
  const { FABRICATED_CATALOG_FILTERS } = require('../src/services/eventIngestion/demoCatalogGuard');
  expect(await require('../src/models/Event').countDocuments({ $or: FABRICATED_CATALOG_FILTERS })).toBe(0);
});

test('ingestion zones come from configuration and reject invalid entries', () => {
  const { ingestionZones } = require('../src/services/eventAggregator');
  const previous = process.env.INGESTION_ZONES;
  process.env.INGESTION_ZONES = 'Madrid|40.4168|-3.7038|50;Roto|999|0|10;Bogotá|4.711|-74.0721|';
  try {
    const zones = ingestionZones();
    expect(zones.map(z => z.label)).toEqual(['Madrid', 'Bogotá']);
    expect(zones[1].radius).toBe(50);
    expect(zones.map(z => z.includeFeeds)).toEqual([true, false]);
  } finally {
    if (previous === undefined) delete process.env.INGESTION_ZONES; else process.env.INGESTION_ZONES = previous;
  }
});

test('Ticketmaster imports keep the venue country and never invent a time or a free price', async () => {
  const { fetchFromTicketmaster } = require('../src/services/eventAggregator');
  const previous = process.env.TICKETMASTER_API_KEY;
  process.env.TICKETMASTER_API_KEY = 'test-key';
  const venue = { name: 'Movistar Arena', city: { name: 'Bogotá' }, country: { name: 'Colombia', countryCode: 'CO' }, location: { latitude: '4.6486', longitude: '-74.0773' }, address: { line1: 'Dg. 61c #26-36' } };
  const event = (id, dates) => ({ id, name: 'Concierto ' + id, url: 'https://www.ticketmaster.co/event/' + id, dates, classifications: [{ segment: { name: 'Music' } }], _embedded: { venues: [venue] } });
  const mock = jest.spyOn(axios, 'get').mockResolvedValue({ data: { _embedded: { events: [
    event('ok', { start: { dateTime: '2027-03-05T01:00:00Z' }, timezone: 'America/Bogota', status: { code: 'onsale' } }),
    event('tba', { start: { localDate: '2027-03-05', timeTBA: true }, status: { code: 'onsale' } }),
    event('cancelled', { start: { dateTime: '2027-03-06T01:00:00Z' }, status: { code: 'cancelled' } })
  ] } } });
  try {
    const items = await fetchFromTicketmaster({ lat: 4.7, lng: -74.07, radius: 30 });
    expect(mock.mock.calls[0][1].params.unit).toBe('km');
    expect(items.map(i => i.sourceId)).toEqual(['ok']);
    expect(items[0].location).toMatchObject({ city: 'Bogotá', countryCode: 'CO' });
    const doc = toEventDoc(items[0]);
    expect(doc.paymentMode).toBe('external');
    expect(doc.ticketUrl).toBe('https://www.ticketmaster.co/event/ok');
    expect(doc.timeZone).toBe('America/Bogota');
    expect(doc.location.countryCode).toBe('CO');
  } finally {
    mock.mockRestore();
    if (previous === undefined) delete process.env.TICKETMASTER_API_KEY; else process.env.TICKETMASTER_API_KEY = previous;
  }
});

test('Ticketmaster pages through a zone and stops at the last page', async () => {
  const { fetchTicketmasterPages } = require('../src/services/eventAggregator');
  const previous = process.env.TICKETMASTER_API_KEY;
  process.env.TICKETMASTER_API_KEY = 'test-key';
  const venue = { name: 'Sala', city: { name: 'Madrid' }, country: { name: 'Spain', countryCode: 'ES' }, location: { latitude: '40.41', longitude: '-3.70' } };
  const page = (n) => ({ data: { page: { totalPages: 2 }, _embedded: { events: [{ id: 'p' + n, name: 'Evento ' + n, url: 'https://www.ticketmaster.es/p' + n, dates: { start: { dateTime: '2027-05-0' + (n + 1) + 'T20:00:00Z' } }, _embedded: { venues: [venue] } }] } } });
  const mock = jest.spyOn(axios, 'get').mockImplementation(async (_url, { params }) => page(params.page));
  try {
    const items = await fetchTicketmasterPages({ lat: 40.41, lng: -3.7, radius: 30, size: 100 });
    expect(items.map(i => i.sourceId)).toEqual(['p0', 'p1']);
    expect(mock).toHaveBeenCalledTimes(2);
  } finally {
    mock.mockRestore();
    if (previous === undefined) delete process.env.TICKETMASTER_API_KEY; else process.env.TICKETMASTER_API_KEY = previous;
  }
});
