'use strict';

const { sourceError } = require('./safeSourceFetch');

// OpenAgenda (https://developers.openagenda.com): free API, one platform key in
// OPENAGENDA_API_KEY sent as the `key` header. Each registered source is one agenda,
// stored as https://api.openagenda.com/v2/agendas/{uid}.
const API = 'https://api.openagenda.com/v2/agendas/';
const MAX_PAGES = 5;
const PAGE_SIZE = 300;
const OCCURRENCES_PER_EVENT = 3;
// "Gratuit", "Entrée libre", "Free", "Gratis", "Entrada libre", "Ingresso libero", "Eintritt frei"...
const FREE = /\b(gratuit|gratuite|entr[ée]e libre|acc[eè]s libre|free|gratis|entrada libre|ingresso libero|eintritt frei|kostenlos)\b/i;
const SKIPPED_STATUS = new Set([3, 4, 6]); // moved online, postponed, cancelled

function text(value, max = 2000) {
  const raw = typeof value === 'string' ? value : value && typeof value === 'object' ? value.es || value.en || value.fr || Object.values(value).find(v => typeof v === 'string') : '';
  return typeof raw === 'string' ? raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// "2026-02-23T17:00:00+0200" -> "2026-02-23T17:00:00+02:00" (the shared connector needs an explicit offset).
function isoOffset(value) {
  const match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})$/);
  if (!match) return null;
  const zone = match[2] === 'Z' ? 'Z' : match[2].replace(/^([+-]\d{2}):?(\d{2})$/, '$1:$2');
  return match[1] + zone;
}

function agendaUid(source) {
  const match = String(source.accessConfig?.endpointUrl || '').match(/^https:\/\/api\.openagenda\.com\/v2\/agendas\/(\d+)\/?$/);
  if (!match) throw sourceError('Registra la agenda como https://api.openagenda.com/v2/agendas/{uid}');
  return match[1];
}

/** Rows for free, in-person, published occurrences at a located venue; nothing is filled in. */
function openAgendaRows(events, { organizer, currency = 'EUR', now = Date.now() } = {}) {
  const rows = [];
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || (event.state !== undefined && event.state !== 2) || SKIPPED_STATUS.has(Number(event.status)) || Number(event.attendanceMode || 1) === 2) continue;
    if (!FREE.test(text(event.conditions, 255))) continue;
    const place = event.location || {};
    const lat = Number(place.latitude), lng = Number(place.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) continue;
    const image = event.image?.base && event.image?.filename ? event.image.base + event.image.filename : undefined;
    const upcoming = (event.timings || [])
      .map(timing => ({ begin: isoOffset(timing?.begin), end: isoOffset(timing?.end) }))
      .filter(timing => timing.begin && new Date(timing.begin).getTime() >= now - 3600000)
      .sort((a, b) => new Date(a.begin) - new Date(b.begin))
      .slice(0, OCCURRENCES_PER_EVENT);
    for (const timing of upcoming) {
      rows.push({
        id: `${event.uid}:${timing.begin}`,
        title: text(event.title, 100), description: text(event.longDescription) || text(event.description) || text(event.title),
        date: timing.begin, endDate: timing.end || undefined, timeZone: event.timezone || place.timezone,
        lat, lng, venue: text(place.name, 100), address: text(place.address, 200) || text(place.name, 200),
        city: text(place.city, 100), country: text(place.countryCode, 10),
        price: 0, currency, url: typeof event.canonicalUrl === 'string' && /^https:\/\//.test(event.canonicalUrl) ? event.canonicalUrl : undefined,
        image: typeof image === 'string' && /^https:\/\//.test(image) ? image : undefined,
        tags: (Array.isArray(event.keywords) ? event.keywords : event.keywords?.es || event.keywords?.en || event.keywords?.fr || []).slice(0, 10),
        category: 'culture', organizer: organizer || 'OpenAgenda'
      });
    }
  }
  return rows;
}

async function readOpenAgenda(source, fetcher, { key = process.env.OPENAGENDA_API_KEY } = {}) {
  if (!key) throw sourceError('Falta OPENAGENDA_API_KEY: crea una cuenta gratuita en openagenda.com y copia tu clave', 422);
  const uid = agendaUid(source);
  const rows = [];
  let after = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${API}${uid}/events`);
    url.searchParams.append('relative[]', 'upcoming');
    url.searchParams.set('size', String(PAGE_SIZE));
    url.searchParams.set('detailed', '1');
    for (const value of after) url.searchParams.append('after[]', String(value));
    const response = await fetcher(url.href, { maxBytes: 8 * 1024 * 1024, headers: { key } });
    if (!Array.isArray(response.data?.events)) throw sourceError('OpenAgenda cambió de formato');
    rows.push(...openAgendaRows(response.data.events, { organizer: source.name, currency: source.eventDefaults?.currency || 'EUR' }));
    if (!Array.isArray(response.data.after) || !response.data.after.length) return { rows, incomplete: false };
    after = response.data.after;
  }
  return { rows, incomplete: true };
}

module.exports = { readOpenAgenda, openAgendaRows, isoOffset, agendaUid };
