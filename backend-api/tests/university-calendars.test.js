const { localistRows, livewhaleRows, readUniversityCalendar, probeUniversityCalendar, calendarOrigin } = require('../src/services/eventIngestion/universityCalendarAdapters');
const { normalizeAgendaRow } = require('../src/services/eventIngestion/agendaConnector');
const { sourceBlockers } = require('../src/services/eventIngestion/sourcePolicy');

const localist = (over = {}, instance = {}) => ({ event: {
  id: 7, title: 'Concierto de la orquesta', description_text: 'Programa de otoño.', free: true, status: 'live',
  geo: { latitude: '37.4275', longitude: '-122.1697', city: 'Stanford', country: 'US' }, location_name: 'Bing Concert Hall',
  localist_url: 'https://events.example.edu/event/orquesta', photo_url: 'https://img.example.edu/o.jpg', keywords: ['music'], tags: [],
  filters: { event_types: [{ name: 'Music' }] },
  event_instances: [{ event_instance: { id: 70, start: '2027-03-02T19:30:00-08:00', end: '2027-03-02T21:00:00-08:00', all_day: false, ...instance } }],
  ...over } });

const livewhale = (over = {}) => ({ id: 9, title: 'Charla abierta', cost: 'Free', date_iso: '2027-03-03T18:00:00-05:00', date2_iso: '2027-03-03T19:00:00-05:00',
  timezone: 'America/New_York', location_title: 'Granoff Center', location_latitude: 41.828, location_longitude: -71.401, url: 'https://events.example.edu/live/events/9', ...over });

describe('university calendar rows', () => {
  test('Localist keeps free, timed occurrences at a mapped venue', () => {
    const rows = localistRows([localist()], { organizer: 'Universidad', currency: 'USD' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: '7:70', lat: 37.4275, lng: -122.1697, price: 0, currency: 'USD', category: 'Music' });
  });

  test('Localist never invents a price, a time or a place', () => {
    expect(localistRows([localist({ free: false, ticket_url: 'https://tickets.example.edu' })])).toHaveLength(0);
    expect(localistRows([localist({}, { all_day: true })])).toHaveLength(0);
    expect(localistRows([localist({ geo: { latitude: null, longitude: null } })])).toHaveLength(0);
    expect(localistRows([localist({ status: 'cancelled' })])).toHaveLength(0);
  });

  test('LiveWhale keeps only free, in-person, timed events with coordinates', () => {
    expect(livewhaleRows([livewhale()])).toHaveLength(1);
    expect(livewhaleRows([livewhale({ cost: '$15' }), livewhale({ is_online: 1 }), livewhale({ is_all_day: 1 }),
      livewhale({ is_canceled: 1 }), livewhale({ location_latitude: null })])).toHaveLength(0);
  });
});

describe('university calendar sources', () => {
  test('a source stores only an HTTPS calendar origin', () => {
    expect(calendarOrigin({ accessConfig: { endpointUrl: 'https://events.example.edu' } })).toBe('https://events.example.edu');
    expect(() => calendarOrigin({ accessConfig: { endpointUrl: 'http://events.example.edu' } })).toThrow();
    expect(() => calendarOrigin({ accessConfig: { endpointUrl: 'https://events.example.edu/api/2/events?key=secret' } })).toThrow();
  });

  test('reading pages through the documented API and stops at the last page', async () => {
    const calls = [];
    const fetcher = async url => {
      calls.push(url);
      const page = Number(new URL(url).searchParams.get('page'));
      return { data: { events: [localist({ id: page })], page: { current: page, total: 2 } } };
    };
    const result = await readUniversityCalendar({ adapterType: 'localist_calendar', name: 'Universidad', accessConfig: { endpointUrl: 'https://events.example.edu' } }, fetcher);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatch(/^https:\/\/events\.example\.edu\/api\/2\/events\?pp=100&days=60&page=1$/);
    expect(result).toMatchObject({ incomplete: false });
    expect(result.rows.map(row => row.id)).toEqual(['1:70', '2:70']);
  });

  test('discovery recognises a platform only by its JSON shape', async () => {
    const fetcher = async url => {
      if (url === 'https://calendar.example.edu/live/json/v2/events?page=1') return { data: { meta: { type: 'events', total_results: 40 }, data: [] } };
      if (url.startsWith('https://events.example.edu')) return { data: '<html>Not a calendar</html>' };
      throw new Error('unreachable');
    };
    expect(await probeUniversityCalendar('https://www.example.edu/', fetcher))
      .toEqual({ adapterType: 'livewhale_calendar', origin: 'https://calendar.example.edu', upcoming: 40 });
    expect(await probeUniversityCalendar('not a url', fetcher)).toBeNull();
  });

  test('imported university events credit the institution and keep its country', () => {
    const source = { sourceId: 'univ-events-example-edu', name: 'Universidad de Ejemplo', adapterType: 'livewhale_calendar',
      coverage: { country: 'US' }, accessConfig: { endpointUrl: 'https://events.example.edu', termsUrl: 'https://example.edu/terms' },
      license: { licenseType: 'Calendario institucional público' } };
    const doc = normalizeAgendaRow(livewhaleRows([livewhale()], { currency: 'USD' })[0], 'https://events.example.edu', source);
    expect(doc).toMatchObject({ status: 'pending_review', location: { countryCode: 'US' }, publicSource: { name: 'Universidad de Ejemplo', datasetUrl: 'https://events.example.edu' } });
  });

  test('a discovered calendar stays blocked until an administrator reviews its terms', () => {
    const blockers = sourceBlockers({ status: 'evaluating', classification: 'O', adapterType: 'localist_calendar',
      accessConfig: { endpointUrl: 'https://events.example.edu' }, license: { commercialAllowed: false, displayAllowed: false } });
    expect(blockers).toEqual(expect.arrayContaining(['source_not_approved', 'permission_not_reviewed', 'terms_missing']));
    expect(blockers).not.toContain('adapter_not_ready');
  });
});

describe('schema.org pages and homepage feeds', () => {
  const { schemaOrgRows, probeHomepageFeeds } = require('../src/services/eventIngestion/universityCalendarAdapters');
  const event = (over = {}) => ({ '@type': 'Event', '@id': 'https://uni.example.edu/eventos/1', name: 'Conferencia abierta',
    startDate: '2027-04-10T18:00:00-04:00', isAccessibleForFree: true,
    location: { '@type': 'Place', name: 'Aula Magna', geo: { latitude: 18.46, longitude: -69.91 }, address: { addressLocality: 'Santo Domingo', addressCountry: 'DO' } }, ...over });

  test('keeps exact, free, located events and fills nothing in', () => {
    expect(schemaOrgRows([event()], { currency: 'DOP' })[0]).toMatchObject({ lat: 18.46, lng: -69.91, price: 0, currency: 'DOP', city: 'Santo Domingo' });
    expect(schemaOrgRows([
      event({ startDate: '2027-04-10' }),
      event({ startDate: '2027-04-10T18:00:00' }),
      event({ location: { name: 'Aula Magna' } }),
      event({ isAccessibleForFree: undefined, offers: { price: '500', priceCurrency: 'DOP' } }),
      event({ isAccessibleForFree: undefined }),
      event({ eventStatus: 'https://schema.org/EventCancelled' }),
      event({ eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode' }),
      { '@type': 'Organization', name: 'Universidad' }
    ])).toHaveLength(0);
  });

  test('finds an ICS calendar or an events page on the university domain only', async () => {
    const pages = {
      'https://www.uni.example.edu/': '<a href="https://evil.example.com/cal.ics">x</a><a href="/eventos/">Eventos</a>',
      'https://www.uni.example.edu/eventos/': `<script type="application/ld+json">${JSON.stringify([event()])}</script>`
    };
    const fetcher = async url => { if (!(url in pages)) throw new Error('not found ' + url); return { data: pages[url] }; };
    expect(await probeHomepageFeeds('https://www.uni.example.edu/', fetcher))
      .toEqual({ adapterType: 'schema_org_page', origin: 'https://www.uni.example.edu', endpoint: 'https://www.uni.example.edu/eventos/', upcoming: 1 });
    pages['https://www.uni.example.edu/'] = '<link rel="alternate" type="text/calendar" href="webcal://www.uni.example.edu/calendario.ics">';
    pages['https://www.uni.example.edu/calendario.ics'] = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR';
    expect(await probeHomepageFeeds('https://www.uni.example.edu/', fetcher)).toMatchObject({ adapterType: 'ics_feed', endpoint: 'https://www.uni.example.edu/calendario.ics', upcoming: 1 });
  });

  test('a schema.org page source reads through the shared connector with credit', async () => {
    const { readUniversityCalendar } = require('../src/services/eventIngestion/universityCalendarAdapters');
    const html = `<script type="application/ld+json">${JSON.stringify({ '@graph': [event()] })}</script>`;
    const result = await readUniversityCalendar({ adapterType: 'schema_org_page', name: 'Universidad', accessConfig: { endpointUrl: 'https://uni.example.edu/eventos/' } }, async () => ({ data: html }));
    expect(result.rows).toHaveLength(1);
    await expect(readUniversityCalendar({ adapterType: 'schema_org_page', accessConfig: { endpointUrl: 'http://uni.example.edu/eventos/' } }, async () => ({ data: html }))).rejects.toThrow();
  });
});

test('the generic schema.org normalizer leaves missing dates, places and currencies missing', () => {
  const { normalizeSchemaOrgEvent } = require('../src/services/eventIngestion/schemaOrgExtractor');
  const base = { '@type': 'MusicEvent', name: 'Concierto sin datos completos' };
  expect(normalizeSchemaOrgEvent(base, 'https://venue.example.com')).toBeNull();
  expect(normalizeSchemaOrgEvent({ ...base, startDate: '2027-05-01T20:00:00Z' }, 'https://venue.example.com')).toBeNull();
  expect(normalizeSchemaOrgEvent({ ...base, startDate: '2027-05-01T20:00:00Z', location: { geo: { latitude: 40.4, longitude: -3.7 } }, offers: { price: '20' } }, 'https://venue.example.com')).toBeNull();
  const located = normalizeSchemaOrgEvent({ ...base, startDate: '2027-05-01T20:00:00Z', location: { name: 'Sala', geo: { latitude: 40.4, longitude: -3.7 } } }, 'https://venue.example.com');
  expect(located.location.coordinates).toEqual([-3.7, 40.4]);
  expect(located.endDate).toBeUndefined();
  expect(JSON.stringify(located)).not.toMatch(/República Dominicana|-69\.9312|DOP/);
});

describe('OpenAgenda', () => {
  const { openAgendaRows, isoOffset, readOpenAgenda } = require('../src/services/eventIngestion/openAgendaAdapter');
  const now = Date.parse('2027-01-01T00:00:00Z');
  const event = (over = {}) => ({ uid: 42, state: 2, status: 1, attendanceMode: 1, title: { fr: 'Concert au parc', es: 'Concierto en el parque' },
    conditions: { fr: 'Entrée libre' }, timezone: 'Europe/Paris', canonicalUrl: 'https://agenda.example.fr/concert',
    location: { name: 'Parc', address: '1 rue du Parc', city: 'Lyon', countryCode: 'FR', latitude: 45.76, longitude: 4.83 },
    timings: [{ begin: '2027-02-01T20:00:00+0100', end: '2027-02-01T22:00:00+0100' }, { begin: '2026-12-01T20:00:00+0100', end: '2026-12-01T22:00:00+0100' }],
    ...over });

  test('normalizes compact offsets for the shared connector', () => {
    expect(isoOffset('2027-02-01T20:00:00+0100')).toBe('2027-02-01T20:00:00+01:00');
    expect(isoOffset('2027-02-01T20:00:00')).toBeNull();
  });

  test('keeps free, in-person, published, upcoming occurrences at a located venue', () => {
    const rows = openAgendaRows([event()], { now });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Concierto en el parque', date: '2027-02-01T20:00:00+01:00', lat: 45.76, city: 'Lyon', price: 0 });
  });

  test('never imports cancelled, online, paid or unlocated events', () => {
    expect(openAgendaRows([event({ status: 6 }), event({ attendanceMode: 2 }), event({ conditions: { fr: 'Tarif : 12 €' } }),
      event({ location: { name: 'Parc' } }), event({ state: 0 })], { now })).toHaveLength(0);
  });

  test('reads with the key header, follows the cursor and needs the platform key', async () => {
    const calls = [];
    const fetcher = async (url, options) => {
      calls.push({ url, key: options.headers.key });
      return { data: calls.length === 1 ? { events: [event()], after: [0, 123] } : { events: [], after: null } };
    };
    const source = { name: 'Agenda Lyon', accessConfig: { endpointUrl: 'https://api.openagenda.com/v2/agendas/123' } };
    const result = await readOpenAgenda(source, fetcher, { key: 'secret-key' });
    expect(calls).toHaveLength(2);
    expect(calls[0].key).toBe('secret-key');
    expect(calls[1].url).toContain('after%5B%5D=0&after%5B%5D=123');
    expect(result.incomplete).toBe(false);
    await expect(readOpenAgenda(source, fetcher, { key: '' })).rejects.toThrow(/OPENAGENDA_API_KEY/);
  });
});
