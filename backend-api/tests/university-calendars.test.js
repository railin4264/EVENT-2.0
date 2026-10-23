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
