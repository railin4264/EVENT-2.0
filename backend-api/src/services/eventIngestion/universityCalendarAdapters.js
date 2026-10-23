'use strict';

const { sourceError } = require('./safeSourceFetch');

// Calendar platforms that many universities publish without a key. A source stores
// only the calendar origin (https://events.example.edu); the adapter builds the
// documented read-only API paths from it.
const UNIVERSITY_ADAPTERS = {
  localist_calendar: { label: 'Localist', maxPages: 5 },
  livewhale_calendar: { label: 'LiveWhale', maxPages: 5 }
};

const FREE_COST = /^\s*(free|gratis|gratuit[oa]?|no cost|sin costo|free admission|free and open to the public)\b/i;
const DAYS_AHEAD = 60;

function clean(value, max = 2000) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function coordinate(value, limit) {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) && Math.abs(number) <= limit && number !== 0 ? number : null;
}

function calendarOrigin(source) {
  let url;
  try { url = new URL(source.accessConfig?.endpointUrl); } catch { throw sourceError('La fuente universitaria necesita la URL de su calendario'); }
  if (url.protocol !== 'https:' || (url.pathname !== '/' && url.pathname !== '') || url.search || url.username || url.password) {
    throw sourceError('Registra solo el origen HTTPS del calendario universitario');
  }
  return url.origin;
}

/**
 * Localist: one row per occurrence. Only free, timed occurrences at a mapped venue,
 * the same rule as the municipal agendas: no invented times, prices or places.
 */
function localistRows(events, { organizer, currency = 'USD' } = {}) {
  const rows = [];
  for (const wrapper of Array.isArray(events) ? events : []) {
    const event = wrapper?.event;
    if (!event || event.free !== true || event.private === true || /cancel/i.test(String(event.status || ''))) continue;
    const lat = coordinate(event.geo?.latitude, 90), lng = coordinate(event.geo?.longitude, 180);
    if (lat === null || lng === null) continue;
    const types = (event.filters?.event_types || []).map(type => type?.name).filter(Boolean);
    for (const wrapperInstance of event.event_instances || []) {
      const instance = wrapperInstance?.event_instance;
      if (!instance || instance.all_day) continue;
      rows.push({
        id: `${event.id}:${instance.id}`, title: clean(event.title, 100), description: clean(event.description_text || event.description) || clean(event.title),
        date: instance.start, endDate: instance.end || undefined,
        lat, lng, venue: clean(event.location_name, 100), address: clean(event.address, 200) || clean(event.location_name, 200),
        city: clean(event.geo?.city, 100), country: clean(event.geo?.country, 100),
        price: 0, currency, url: event.localist_url, image: event.photo_url || undefined,
        tags: [...(event.keywords || []), ...(event.tags || [])].slice(0, 10), category: types[0] || 'education',
        organizer: organizer || 'Calendario universitario'
      });
    }
  }
  return rows;
}

/** LiveWhale v2: rows already expand repeating events into occurrences. */
function livewhaleRows(items, { organizer, currency = 'USD' } = {}) {
  const rows = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || item.is_canceled || item.is_all_day || item.is_online || !FREE_COST.test(String(item.cost || ''))) continue;
    const lat = coordinate(item.location_latitude, 90), lng = coordinate(item.location_longitude, 180);
    if (lat === null || lng === null || !item.date_iso) continue;
    const types = Array.isArray(item.event_types) ? item.event_types.map(type => clean(type, 60)).filter(Boolean) : [];
    rows.push({
      id: String(item.id), title: clean(item.title, 100), description: clean(item.summary || item.description) || clean(item.title),
      date: item.date_iso, endDate: item.date2_iso || undefined, timeZone: item.timezone || undefined,
      lat, lng, venue: clean(item.location_title || item.location, 100), address: clean(item.location_title || item.location, 200),
      price: 0, currency, url: item.url, image: item.thumbnail || undefined,
      tags: (Array.isArray(item.tags) ? item.tags : []).slice(0, 10), category: types.find(type => !/open to the public/i.test(type)) || 'education',
      organizer: organizer || 'Calendario universitario'
    });
  }
  return rows;
}

async function readUniversityCalendar(source, fetcher) {
  const adapter = UNIVERSITY_ADAPTERS[source.adapterType];
  if (!adapter) throw sourceError('Adaptador universitario no compatible');
  const origin = calendarOrigin(source);
  const organizer = source.name;
  const currency = source.eventDefaults?.currency || 'USD';
  const rows = [];
  let incomplete = false;
  for (let page = 1; page <= adapter.maxPages; page++) {
    if (source.adapterType === 'localist_calendar') {
      const url = new URL('/api/2/events', origin);
      url.search = new URLSearchParams({ pp: '100', days: String(DAYS_AHEAD), page: String(page) }).toString();
      const response = await fetcher(url.href, { maxBytes: 8 * 1024 * 1024 });
      if (!Array.isArray(response.data?.events)) throw sourceError('El calendario Localist cambió de formato');
      rows.push(...localistRows(response.data.events, { organizer, currency }));
      const total = Number(response.data.page?.total) || page;
      if (page >= total) return { rows, incomplete: false };
      incomplete = true;
    } else {
      const url = new URL('/live/json/v2/events/response_fields/location,summary,image,event_types,tags', origin);
      url.search = new URLSearchParams({ page: String(page) }).toString();
      const response = await fetcher(url.href, { maxBytes: 8 * 1024 * 1024 });
      if (!Array.isArray(response.data?.data)) throw sourceError('El calendario LiveWhale cambió de formato');
      rows.push(...livewhaleRows(response.data.data, { organizer, currency }));
      const total = Number(response.data.meta?.total_pages) || page;
      if (page >= total) return { rows, incomplete: false };
      incomplete = true;
    }
  }
  return { rows, incomplete };
}

/** Candidate calendar origins for a university website, most common hostnames first. */
function calendarCandidates(website) {
  let host;
  try { host = new URL(website).hostname.replace(/^www\./, ''); } catch { return []; }
  const origins = [`https://events.${host}`, `https://calendar.${host}`, `https://eventos.${host}`, `https://agenda.${host}`, `https://www.${host}`, `https://${host}`];
  return origins.flatMap(origin => [
    { adapterType: 'localist_calendar', origin, probe: `${origin}/api/2/events?pp=1` },
    { adapterType: 'livewhale_calendar', origin, probe: `${origin}/live/json/v2/events?page=1` },
    // WordPress + The Events Calendar, common among Latin American and European universities.
    { adapterType: 'wp_events_calendar', origin, endpoint: `${origin}/wp-json/tribe/events/v1/events`, probe: `${origin}/wp-json/tribe/events/v1/events?per_page=1` }
  ]);
}

/** Returns the first candidate that answers with the platform's JSON shape, or null. */
async function probeUniversityCalendar(website, fetcher) {
  for (const candidate of calendarCandidates(website)) {
    try {
      const response = await fetcher(candidate.probe, { maxBytes: 2 * 1024 * 1024 });
      const data = response.data;
      if (candidate.adapterType === 'localist_calendar' && Array.isArray(data?.events) && data.page) {
        return { adapterType: candidate.adapterType, origin: candidate.origin, upcoming: Number(data.page.total_items) || data.events.length };
      }
      if (candidate.adapterType === 'wp_events_calendar' && Array.isArray(data?.events) && Number.isFinite(Number(data.total))) {
        return { adapterType: candidate.adapterType, origin: candidate.origin, endpoint: candidate.endpoint, upcoming: Number(data.total) };
      }
      if (candidate.adapterType === 'livewhale_calendar' && Array.isArray(data?.data) && data.meta?.type === 'events') {
        return { adapterType: candidate.adapterType, origin: candidate.origin, upcoming: Number(data.meta.total_results) || data.data.length };
      }
    } catch { /* Not this platform or host; try the next candidate. */ }
  }
  return null;
}

module.exports = { UNIVERSITY_ADAPTERS, localistRows, livewhaleRows, readUniversityCalendar, calendarCandidates, probeUniversityCalendar, calendarOrigin };
