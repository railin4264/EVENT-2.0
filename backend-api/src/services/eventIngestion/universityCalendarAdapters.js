'use strict';

const { sourceError } = require('./safeSourceFetch');
const { extractJsonLdBlocks } = require('./schemaOrgExtractor');

// Calendar platforms that many universities publish without a key. A source stores
// only the calendar origin (https://events.example.edu); the adapter builds the
// documented read-only API paths from it.
const UNIVERSITY_ADAPTERS = {
  localist_calendar: { label: 'Localist', maxPages: 5 },
  livewhale_calendar: { label: 'LiveWhale', maxPages: 5 },
  // An events page that publishes schema.org Event data (JSON-LD); the source stores the page URL.
  schema_org_page: { label: 'Página con datos schema.org', maxPages: 1 }
};

const OFFSET_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const EVENT_TYPES = /event$|^festival$/i;
const EVENTS_LINK = /\/(eventos?|events?|agenda|calendari[oa]?|calendar|actividades|activities)(\/|$)/i;

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

function eventType(item) {
  return String(Array.isArray(item?.['@type']) ? item['@type'][0] : item?.['@type'] || '');
}

/**
 * schema.org Event rows with the same strict rule: exact start with a time zone, a venue
 * with coordinates and an explicit free offer. Anything missing is skipped, never filled in.
 */
function schemaOrgRows(blocks, { organizer, currency = 'USD', pageUrl } = {}) {
  const rows = [];
  for (const item of Array.isArray(blocks) ? blocks : []) {
    if (!EVENT_TYPES.test(eventType(item)) || !OFFSET_DATE.test(String(item.startDate || ''))) continue;
    if (/Cancelled|Postponed|Rescheduled/i.test(String(item.eventStatus || '')) || /Online/i.test(String(item.eventAttendanceMode || ''))) continue;
    const place = Array.isArray(item.location) ? item.location[0] : item.location;
    const lat = coordinate(place?.geo?.latitude, 90), lng = coordinate(place?.geo?.longitude, 180);
    if (lat === null || lng === null) continue;
    const offers = Array.isArray(item.offers) ? item.offers : item.offers ? [item.offers] : [];
    const free = item.isAccessibleForFree === true || String(item.isAccessibleForFree).toLowerCase() === 'true' ||
      (offers.length > 0 && offers.every(offer => offer && offer.price !== undefined && offer.price !== '' && Number(offer.price) === 0));
    if (!free) continue;
    const postal = place.address && typeof place.address === 'object' ? place.address : {};
    const address = typeof place.address === 'string' ? place.address
      : [postal.streetAddress, postal.addressLocality, postal.addressCountry].filter(value => typeof value === 'string').join(', ');
    const url = typeof item.url === 'string' && /^https:\/\//.test(item.url) ? item.url : pageUrl;
    const image = typeof item.image === 'string' ? item.image : Array.isArray(item.image) ? (typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url) : item.image?.url;
    rows.push({
      id: String(item['@id'] || `${url}#${item.startDate}#${clean(item.name, 80)}`),
      title: clean(item.name, 100), description: clean(item.description) || clean(item.name),
      date: item.startDate, endDate: OFFSET_DATE.test(String(item.endDate || '')) ? item.endDate : undefined,
      lat, lng, venue: clean(place.name, 100), address: clean(address, 200) || clean(place.name, 200),
      city: clean(postal.addressLocality, 100), country: clean(typeof postal.addressCountry === 'string' ? postal.addressCountry : '', 100),
      price: 0, currency, url, image: typeof image === 'string' && /^https:\/\//.test(image) ? image : undefined,
      category: 'education', organizer: organizer || 'Calendario universitario'
    });
  }
  return rows;
}

async function readUniversityCalendar(source, fetcher) {
  const adapter = UNIVERSITY_ADAPTERS[source.adapterType];
  if (!adapter) throw sourceError('Adaptador universitario no compatible');
  const organizer = source.name;
  const currency = source.eventDefaults?.currency || 'USD';
  if (source.adapterType === 'schema_org_page') {
    let page;
    try { page = new URL(source.accessConfig?.endpointUrl); } catch { throw sourceError('La fuente necesita la URL de su página de eventos'); }
    if (page.protocol !== 'https:' || page.username || page.password) throw sourceError('La página de eventos debe usar HTTPS');
    const response = await fetcher(page.href, { maxBytes: 4 * 1024 * 1024 });
    if (typeof response.data !== 'string') throw sourceError('La página de eventos no devolvió HTML');
    return { rows: schemaOrgRows(extractJsonLdBlocks(response.data), { organizer, currency, pageUrl: page.href }), incomplete: false };
  }
  const origin = calendarOrigin(source);
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

function sameSite(url, host) {
  return url.hostname === host || url.hostname.endsWith('.' + host);
}

/**
 * Looks at a university homepage for an ICS calendar it links to, or an events page that
 * publishes schema.org Event data. Only links on the university's own domain are followed.
 */
async function probeHomepageFeeds(website, fetcher) {
  let home;
  try { home = new URL(website); } catch { return null; }
  const host = home.hostname.replace(/^www\./, '');
  let html;
  try { html = (await fetcher(home.href, { maxBytes: 3 * 1024 * 1024 })).data; } catch { return null; }
  if (typeof html !== 'string') return null;
  const links = [...html.matchAll(/<(?:a|link)\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi)]
    .map(match => match[1].replace(/^webcal:/i, 'https:'))
    .map(href => { try { return new URL(href, home); } catch { return null; } })
    .filter(url => url && url.protocol === 'https:' && sameSite(url, host));
  const ics = links.find(url => /\.ics$/i.test(url.pathname) || /ical/i.test(url.pathname + url.search));
  if (ics) {
    try {
      const response = await fetcher(ics.href, { maxBytes: 4 * 1024 * 1024 });
      const count = typeof response.data === 'string' ? (response.data.match(/BEGIN:VEVENT/g) || []).length : 0;
      if (count) return { adapterType: 'ics_feed', origin: ics.origin, endpoint: ics.href, upcoming: count };
    } catch { /* Not a readable calendar; keep looking. */ }
  }
  const pages = [...new Set(links.filter(url => EVENTS_LINK.test(url.pathname)).map(url => url.origin + url.pathname))].slice(0, 3);
  for (const href of pages) {
    try {
      const response = await fetcher(href, { maxBytes: 4 * 1024 * 1024 });
      const events = typeof response.data === 'string' ? extractJsonLdBlocks(response.data).filter(item => EVENT_TYPES.test(eventType(item))) : [];
      if (events.length) return { adapterType: 'schema_org_page', origin: new URL(href).origin, endpoint: href, upcoming: events.length };
    } catch { /* Try the next events page. */ }
  }
  return null;
}

module.exports = { UNIVERSITY_ADAPTERS, schemaOrgRows, probeHomepageFeeds, localistRows, livewhaleRows, readUniversityCalendar, calendarCandidates, probeUniversityCalendar, calendarOrigin };
