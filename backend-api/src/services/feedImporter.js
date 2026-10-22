/**
 * Importador de feeds iCalendar (.ics) y JSON propios.
 *
 * Es la vía más realista para poblar eventos LOCALES (RD) sin APIs de pago:
 * muchas instituciones culturales, universidades, cámaras de comercio, comunidades de
 * Meetup/Google Calendar y organizadores publican un enlace .ics público.
 *
 * Configuración (variables de entorno):
 *   ICS_FEEDS=https://.../agenda.ics,https://.../otro.ics
 *   JSON_EVENT_FEEDS=https://.../events.json      (array o { events: [] })
 *   FEED_DEFAULT_COORDS=-69.9312,18.4861          (lng,lat para eventos sin coordenadas)
 */
const axios = require('axios');
const logger = require('../utils/logger');


function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '');
}

function unescapeText(v = '') {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

function parseIcsDate(value = '', zone = '') {
  const m = String(value).trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m;
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  if (new Date(utc).toISOString().slice(0, 10) !== `${y}-${mo}-${d}` || +h > 23 || +mi > 59 || +s > 59) return null;
  if (z) return new Date(utc);
  // Date-only and floating times need a separate precision model before import.
  if (!m[4]) return null;
  const effectiveZone = zone || process.env.FEED_DEFAULT_TIMEZONE;
  if (!effectiveZone) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: effectiveZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const matches = [];
    for (let offset = -840; offset <= 840; offset += 15) {
      const candidate = new Date(utc - offset * 60000);
      const parts = Object.fromEntries(formatter.formatToParts(candidate).map(p => [p.type, p.value]));
      if (`${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}` === `${y}${mo}${d}T${h}${mi}${s}`) matches.push(candidate);
    }
    return matches.length === 1 ? matches[0] : null;
  } catch { return null; }
}

function parseIcs(text) {
  const events = [];
  const lines = unfold(String(text)).split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) { current = {}; continue; }
    if (line.startsWith('END:VEVENT')) { if (current) events.push(current); current = null; continue; }
    if (!current) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const name = line.slice(0, idx).split(';')[0].toUpperCase();
    const zone = line.slice(0, idx).match(/;TZID="?([^;"\r\n]+)/i)?.[1] || '';
    const value = line.slice(idx + 1);
    switch (name) {
    case 'UID': current.uid = value.trim(); break;
    case 'SUMMARY': current.summary = unescapeText(value); break;
    case 'DESCRIPTION': current.description = unescapeText(value); break;
    case 'LOCATION': current.location = unescapeText(value); break;
    case 'URL': current.url = value.trim(); break;
    case 'CATEGORIES': current.categories = unescapeText(value); break;
    case 'DTSTART': current.start = parseIcsDate(value, zone); current.timeZone = zone || (value.endsWith('Z') ? 'UTC' : undefined); break;
    case 'DTEND': current.end = parseIcsDate(value, zone); break;
    case 'GEO': {
      const [lat, lng] = value.split(';').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) current.geo = { lat, lng };
      break;
    }
    case 'RRULE': case 'RECURRENCE-ID': current.recurrence = true; break;
    default: break;
    }
  }
  return events;
}

const geocodeCache = new Map();
async function geocode(query) {
  if (!query) return null;
  if (geocodeCache.has(query)) return geocodeCache.get(query);
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { format: 'json', q: query, limit: 1 },
      headers: { 'User-Agent': 'EventNow/1.0 (ingestion)' },
      timeout: 8000
    });
    const hit = data && data[0];
    const out = hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
    geocodeCache.set(query, out);
    await new Promise(r => setTimeout(r, 1100)); // respeta el límite de 1 req/s de Nominatim
    return out;
  } catch (e) {
    geocodeCache.set(query, null);
    return null;
  }
}

function defaultCoords() {
  const raw = process.env.FEED_DEFAULT_COORDS || '-69.9312,18.4861';
  const [lng, lat] = raw.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: 18.4861, lng: -69.9312 };
}

function listConfigured(envName) {
  return String(process.env[envName] || '').split(',').map(s => s.trim()).filter(u => /^https?:\/\//i.test(u));
}

async function fetchIcsFeeds({ maxGeocodes = 15 } = {}) {
  const feeds = listConfigured('ICS_FEEDS');
  const out = [];
  let geocodes = 0;
  for (const url of feeds) {
    try {
      const { data } = await axios.get(url, { timeout: 20000, responseType: 'text', maxContentLength: 5 * 1024 * 1024 });
      const parsed = parseIcs(data);
      for (const ev of parsed) {
        if (!ev.summary || !ev.start) continue;
        let coords = ev.geo || null;
        if (!coords && ev.location && geocodes < maxGeocodes) {
          geocodes += 1;
          coords = await geocode(ev.location);
        }
        if (!coords) continue;
        out.push({
          source: 'ics',
          sourceId: `${new URL(url).host}:${ev.uid || `${ev.summary}-${ev.start.toISOString()}`}`.slice(0, 200),
          title: ev.summary,
          description: ev.description || ev.summary,
          category: ev.categories || '',
          tags: [],
          location: { type: 'Point', coordinates: [coords.lng, coords.lat], address: ev.location || '' },
          venue: (ev.location || '').split(',')[0],
          date: ev.start,
          endDate: ev.end || undefined,
          timeZone: ev.timeZone,
          price: { amount: 0, currency: 'DOP' },
          images: [],
          externalUrl: ev.url,
          imported: true,
          importedAt: new Date()
        });
      }
      logger.info(`ICS feed ${url}: ${parsed.length} eventos leídos`);
    } catch (err) {
      logger.error(`ICS feed failed (${url}): ${err.message}`);
    }
  }
  return out;
}

async function fetchJsonFeeds() {
  const feeds = listConfigured('JSON_EVENT_FEEDS');
  const out = [];
  for (const url of feeds) {
    try {
      const { data } = await axios.get(url, { timeout: 20000, maxContentLength: 5 * 1024 * 1024 });
      const list = Array.isArray(data) ? data : (data.events || []);
      for (const ev of list) {
        const lat = parseFloat(ev.lat ?? ev.latitude ?? ev.location?.lat);
        const lng = parseFloat(ev.lng ?? ev.longitude ?? ev.location?.lng);
        const coords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
        const start = new Date(ev.date || ev.start || ev.startDate);
        if (!ev.title || Number.isNaN(start.getTime()) || !coords) continue;
        out.push({
          source: 'json',
          sourceId: `${new URL(url).host}:${ev.id || `${ev.title}-${start.toISOString()}`}`.slice(0, 200),
          title: ev.title,
          description: ev.description || ev.title,
          category: ev.category || '',
          tags: Array.isArray(ev.tags) ? ev.tags : [],
          location: { type: 'Point', coordinates: [coords.lng, coords.lat], address: ev.address || ev.location?.address || '', city: ev.city || ev.location?.city, country: ev.country || ev.location?.country },
          venue: ev.venue || '',
          date: start,
          endDate: ev.endDate || ev.end,
          timeZone: ev.timeZone,
          price: { amount: Number(ev.price) || 0, currency: ev.currency || 'DOP' },
          images: ev.image ? [{ url: ev.image }] : [],
          externalUrl: ev.url,
          ticketUrl: ev.ticketUrl,
          imported: true,
          importedAt: new Date()
        });
      }
    } catch (err) {
      logger.error(`JSON feed failed (${url}): ${err.message}`);
    }
  }
  return out;
}

module.exports = { parseIcs, parseIcsDate, fetchIcsFeeds, fetchJsonFeeds, listConfigured, defaultCoords };
