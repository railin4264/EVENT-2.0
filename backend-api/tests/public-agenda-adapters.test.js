'use strict';

const axios = require('axios');
const dns = require('dns').promises;
const { madridRow, helsinkiRow, nycParksRow, readPublicAgenda, PUBLIC_AGENDAS } = require('../src/services/eventIngestion/publicAgendaAdapters');
const { sourceBlockers } = require('../src/services/eventIngestion/sourcePolicy');
const { syncAgenda } = require('../src/services/eventIngestion/agendaConnector');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

const madrid = (patch = {}) => ({ id: 'madrid-1', title: 'Concierto municipal', free: 1, time: '18:00',
  dtstart: '2027-03-28 00:00:00.0', dtend: '2027-03-28 23:59:00.0',
  location: { latitude: 40.41, longitude: -3.7 }, address: { area: { 'street-address': 'CALLE MAYOR 15' } },
  'event-location': 'Centro cultural', link: 'https://www.madrid.es/actividad', ...patch });
const helsinki = (patch = {}) => ({ id: 'helsinki-1', name: { fi: 'Konsertti', en: 'Public concert' },
  description: { en: 'A public community concert.' }, start_time: '2027-03-28T13:00:00Z', end_time: '2027-03-28T14:00:00Z',
  offers: [{ is_free: true }], event_status: 'EventScheduled',
  location: { name: { en: 'Library' }, address_locality: { en: 'Helsinki' }, street_address: { en: 'Unioninkatu 36' }, position: { coordinates: [24.95, 60.17] } },
  '@id': 'https://api.hel.fi/linkedevents/v1/event/helsinki-1/', ...patch });

afterEach(() => jest.restoreAllMocks());

test('Madrid converts local summer time without treating catalogue end-of-day as a finishing time', () => {
  const row = madridRow(madrid());
  expect(row.date.toISOString()).toBe('2027-03-28T16:00:00.000Z');
  expect(row.endDate).toBeUndefined();
  expect(row.category).toBe('art');
  expect(madridRow(madrid({ '@type': 'https://datos.madrid.es/egob/kos/actividades/Talleres' })).category).toBe('education');
});

test.each([{ time: '' }, { free: 0 }, { recurrence: { frequency: 'WEEKLY' } }, { dtstart: '2027-03-28 00:00:00.0', time: '02:30' }])('Madrid excludes records requiring date/price/session clarification: %j', patch => {
  expect(madridRow(madrid(patch))).toBeNull();
});

test('Helsinki preserves language, exact coordinates, source ID and explicit admission', () => {
  const row = helsinkiRow(helsinki());
  expect(row).toMatchObject({ id: 'helsinki-1', title: 'Public concert', city: 'Helsinki', country: 'Finlandia', lng: 24.95, lat: 60.17, price: 0, currency: 'EUR', language: 'en' });
  expect(helsinkiRow(helsinki({ offers: [] }))).toBeNull();
  expect(helsinkiRow(helsinki({ deleted: true }))).toBeNull();
  expect(helsinkiRow(helsinki({ sub_events: [{}] }))).toBeNull();
});

test('adapter endpoints must match the reviewed official URL', async () => {
  const fetcher = jest.fn();
  await expect(readPublicAgenda({ adapterType: 'madrid_open_data', accessConfig: { endpointUrl: 'https://other.example/feed' } }, fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  expect(sourceBlockers({ adapterType: 'madrid_open_data', accessConfig: { endpointUrl: 'https://other.example/feed' } })).toContain('invalid_endpoint');
});

test('Helsinki pagination cannot follow another domain and reports bounded incomplete results', async () => {
  const source = { adapterType: 'helsinki_linked_events', accessConfig: { endpointUrl: PUBLIC_AGENDAS.helsinki_linked_events.endpoint } };
  await expect(readPublicAgenda(source, jest.fn().mockResolvedValue({ data: { data: [], meta: { next: 'https://other.example/feed' } } }))).rejects.toThrow('Paginación');
  const fetcher = jest.fn().mockResolvedValue({ data: { data: [helsinki()], meta: { next: source.accessConfig.endpointUrl + '?page=2' } } });
  const result = await readPublicAgenda(source, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(result.incomplete).toBe(true);
});

test('real persistence keeps stable identity and moderation, records credits and propagates explicit cancellation', async () => {
  const owner = await User.create({ username: 'publicagendaowner', email: 'publicagenda@test.example', firstName: 'Internal', password: 'TestPassword2026!' });
  const source = { sourceId: 'helsinki-test', adapterType: 'helsinki_linked_events', accessConfig: { endpointUrl: PUBLIC_AGENDAS.helsinki_linked_events.endpoint } };
  jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  const feed = jest.spyOn(axios, 'get').mockResolvedValue({ data: { data: [helsinki()], meta: {} } });
  const preview = await syncAgenda(source.accessConfig.endpointUrl, owner.id, { source, dryRun: true });
  expect(preview.previewCount).toBe(1);
  expect(await Event.countDocuments({ sourceId: 'helsinki-test:helsinki-1' })).toBe(0);
  expect((await syncAgenda(source.accessConfig.endpointUrl, owner.id, { source })).created).toBe(1);
  const event = await Event.findOne({ sourceId: 'helsinki-test:helsinki-1' });
  expect(event.status).toBe('pending_review');
  expect(event.publicSource.license).toBe('CC BY 4.0');
  expect(event.location.countryCode).toBe('FI');
  expect(event.description).toContain('Origen de los datos: City of Helsinki');
  event.status = 'published'; await event.save();
  expect((await syncAgenda(source.accessConfig.endpointUrl, owner.id, { source })).unchanged).toBe(1);
  feed.mockResolvedValue({ data: { data: [helsinki({ start_time: '2027-04-02T13:00:00Z', end_time: '2027-04-02T14:00:00Z' })], meta: {} } });
  expect((await syncAgenda(source.accessConfig.endpointUrl, owner.id, { source })).updated).toBe(1);
  expect((await Event.findById(event.id)).status).toBe('published');
  feed.mockResolvedValue({ data: { data: [helsinki({ event_status: 'EventCancelled' })], meta: {} } });
  await syncAgenda(source.accessConfig.endpointUrl, owner.id, { source });
  expect((await Event.findById(event.id)).status).toBe('cancelled');
  expect(await Event.countDocuments({ sourceId: event.sourceId })).toBe(1);
});


test('NYC uses Eastern time, original location and explicit free admission, without copying images', () => {
  const input = { guid: '123', title: 'D&#237;a de parques &amp; juegos', description: 'Join this free program.',
    starttime: '2027-03-28T10:00:00.000', endtime: '2027-03-28T12:00:00.000',
    coordinates: '40.75, -73.98', location: 'Playground', categories: 'Best for Kids', link: { url: 'https://www.nycgovparks.org/events/test' } };
  expect(nycParksRow(input)).toMatchObject({ id: '123', title: 'Día de parques & juegos', city: 'New York', country: 'Estados Unidos', currency: 'USD', price: 0 });
  expect(nycParksRow(input).date.toISOString()).toBe('2027-03-28T14:00:00.000Z');
  expect(nycParksRow(input)).not.toHaveProperty('image');
  expect(nycParksRow({ ...input, description: 'Free parking. Tickets required.' })).toBeNull();
  expect(nycParksRow({ ...input, starttime: '' })).toBeNull();
  expect(nycParksRow({ ...input, title: 'Open call for artists' })).toBeNull();
  expect(nycParksRow({ ...input, coordinates: '18.48, -69.93' })).toBeNull();
});
