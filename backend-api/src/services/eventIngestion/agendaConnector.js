'use strict';

const crypto = require('crypto');
const Event = require('../../models/Event');
const { parseIcs } = require('../feedImporter');
const { toEventDoc } = require('../eventAggregator');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { fetchSource, sourceError } = require('./safeSourceFetch');
const { PUBLIC_AGENDAS, readPublicAgenda } = require('./publicAgendaAdapters');
const { UNIVERSITY_ADAPTERS, readUniversityCalendar } = require('./universityCalendarAdapters');
const { readOpenAgenda } = require('./openAgendaAdapter');

function detectAgendaType(url = '', contentType = '') {
  const u = String(url).toLowerCase(), ct = String(contentType).toLowerCase();
  if (u.includes('/wp-json/tribe/events/v1')) return 'wp_the_events_calendar';
  if (u.includes('api.openagenda.com')) return 'openagenda';
  if (/\.ics(?:$|[?#])/.test(u) || u.includes('ical') || ct.includes('calendar')) return 'ics';
  if (/\.json(?:$|[?#])/.test(u) || ct.includes('json')) return 'json';
  return 'unknown';
}

function absoluteDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (!parts || new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3])).toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function rowsFromFeed(data, type) {
  if (type === 'ics') {
    if (typeof data !== 'string') throw sourceError('El calendario no contiene texto iCalendar');
    return parseIcs(data).filter(row => !row.recurrence).map(row => ({
      id: row.uid, title: row.summary, description: row.description, date: row.start, endDate: row.end,
      timeZone: row.timeZone, category: row.categories, address: row.location,
      lat: row.geo?.lat, lng: row.geo?.lng, url: row.url
    }));
  }
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { throw sourceError('La fuente no contiene JSON válido'); }
  }
  const rows = Array.isArray(data) ? data : data?.events;
  if (!Array.isArray(rows)) throw sourceError('La fuente necesita una lista de eventos');
  if (type !== 'wp_the_events_calendar') return rows;
  return rows.map(row => ({
    id: row.id, title: row.title, description: row.description,
    date: row.start_date_utc ? row.start_date_utc.replace(' ', 'T') + 'Z' : null,
    endDate: row.end_date_utc ? row.end_date_utc.replace(' ', 'T') + 'Z' : undefined,
    timeZone: row.timezone, lat: row.venue?.geo_lat, lng: row.venue?.geo_lng,
    venue: row.venue?.venue, address: [row.venue?.address, row.venue?.city, row.venue?.country].filter(Boolean).join(', '),
    city: row.venue?.city, country: row.venue?.country, url: row.url,
    image: row.image?.url,
    // Formatted cost strings cannot establish an exact price or currency.
    price: row.price, currency: row.currency
  }));
}

function normalizeAgendaRow(row, url, source) {
  if (!row || typeof row !== 'object' || !['string', 'number'].includes(typeof row.id) || !String(row.id).trim()) return null;
  const date = absoluteDate(row.date || row.start || row.startDate);
  const endDate = row.endDate || row.end;
  if (!date || (endDate && (!absoluteDate(endDate) || absoluteDate(endDate) < date))) return null;
  const number = value => value == null || value === '' || typeof value === 'boolean' ? NaN : Number(value);
  const coords = row.location?.coordinates;
  const lat = number(row.lat ?? row.latitude ?? row.location?.lat ?? coords?.[1]);
  const lng = number(row.lng ?? row.longitude ?? row.location?.lng ?? coords?.[0]);
  const amount = number(typeof row.price === 'object' ? row.price?.amount : row.price);
  const free = source.eventDefaults?.freeAdmissionConfirmed === true;
  const currency = row.price?.currency || row.currency || source.eventDefaults?.currency;
  if ((!Number.isFinite(amount) && !free) || (Number.isFinite(amount) && amount < 0) || !currency) return null;
  const namespace = source.sourceId || crypto.createHash('sha256').update(url).digest('hex');
  const doc = toEventDoc({
    source: 'registered_agenda', sourceId: namespace + ':' + String(row.id).trim(),
    title: row.title, description: row.description || row.title, date,
    endDate: endDate ? absoluteDate(endDate) : undefined, timeZone: row.timeZone,
    category: row.category || 'community', tags: Array.isArray(row.tags) ? row.tags : [],
    location: { coordinates: [lng, lat], address: row.address || row.location?.address,
      venue: row.venue || row.location?.venue, city: row.city || row.location?.city,
      country: row.country || row.location?.country },
    price: { amount: Number.isFinite(amount) ? amount : 0, currency },
    images: row.image ? [{ url: row.image }] : [{ url: require('../../utils/imageFallbacks').getCategoryFallbackImage({ category: row.category, tags: row.tags, title: row.title }) }], externalUrl: row.url,
    ticketUrl: row.ticketUrl,
    organizer: row.organizer
  });
  if (!doc) return null;
  doc.h3 = computeH3Hierarchy(lat, lng);
  // Feed URLs can contain private calendar tokens; keep them in the admin registry.
  doc.pipelineMeta = { rawSchemaType: source.adapterType || 'agenda', ingestedAt: new Date() };
  if (PUBLIC_AGENDAS[source.adapterType]) {
    const config = PUBLIC_AGENDAS[source.adapterType];
    doc.location.countryCode = config.country;
    const checkedAt = new Date();
    doc.publicSource = { name: config.name, datasetUrl: config.dataset, license: config.license || 'CC BY 4.0',
      licenseUrl: config.licenseUrl || 'https://creativecommons.org/licenses/by/4.0/', checkedAt,
      updatedAt: row.sourceUpdatedAt ? absoluteDate(row.sourceUpdatedAt) || undefined : undefined,
      providerStatus: row.providerStatus || 'EventScheduled' };
    doc.pipelineMeta.language = row.language || 'es';
    const credit = `\n\nOrigen de los datos: ${config.name}. ${doc.publicSource.license} (${doc.publicSource.licenseUrl}). Consulta: ${checkedAt.toISOString().slice(0, 10)}. Adaptación de formato por EventNow; sin afiliación ni patrocinio de la fuente. Consulta inscripción y cambios: ${row.url || config.dataset}`;
    doc.description = doc.description.slice(0, Math.max(10, 2000 - credit.length)) + credit;
  } else if (UNIVERSITY_ADAPTERS[source.adapterType] || source.adapterType === 'openagenda') {
    // The institution is the publisher: credit it and link back to its own listing.
    if (/^[A-Z]{2}$/.test(source.coverage?.country || '')) doc.location.countryCode = source.coverage.country;
    doc.publicSource = { name: source.name, datasetUrl: source.accessConfig?.endpointUrl, license: source.license?.licenseType || 'Publicación institucional',
      licenseUrl: source.accessConfig?.termsUrl, checkedAt: new Date(), providerStatus: 'EventScheduled' };
  }
  return doc;
}

async function syncAgenda(agendaUrl, organizerId, options = {}) {
  if (!organizerId) throw sourceError('La agenda necesita un organizador responsable', 400);
  const requested = options.type || detectAgendaType(agendaUrl);
  const source = options.source || {};
  const isOpenAgenda = source.adapterType === 'openagenda';
  if (requested === 'openagenda' && !isOpenAgenda) throw sourceError('Registra la agenda de OpenAgenda como fuente para importarla', 422);
  const publicAgenda = PUBLIC_AGENDAS[source.adapterType] || UNIVERSITY_ADAPTERS[source.adapterType] || isOpenAgenda;
  const publicResult = PUBLIC_AGENDAS[source.adapterType] ? await readPublicAgenda(source, fetchSource)
    : UNIVERSITY_ADAPTERS[source.adapterType] ? await readUniversityCalendar(source, fetchSource)
      : isOpenAgenda ? await readOpenAgenda(source, fetchSource) : null;
  const response = publicAgenda ? { data: null } : await fetchSource(agendaUrl);
  const type = requested === 'unknown' ? detectAgendaType(agendaUrl, response.headers?.['content-type']) : requested;
  if (!publicAgenda && !['ics', 'json', 'wp_the_events_calendar'].includes(type)) throw sourceError('Formato de agenda todavía no compatible', 422);
  const rows = publicResult ? publicResult.rows.filter(row => new Date(row.endDate || row.date) >= new Date(Date.now() - 3600000)).sort((a, b) => new Date(a.date) - new Date(b.date)) : rowsFromFeed(response.data, type);
  const result = { success: true, detectedCount: rows.length, syncedCount: 0, created: 0, updated: 0,
    unchanged: 0, skipped: 0, failedWrites: 0, previewCount: 0,
    incomplete: Boolean(publicResult?.incomplete) || rows.length >= 200 || Boolean(response.data?.next_rest_url || response.data?.next || response.data?.total > rows.length), events: [] };
  const seen = new Set();
  for (const row of rows.slice(0, 200)) {
    const doc = normalizeAgendaRow(row, agendaUrl, source);
    if (!doc || seen.has(doc.sourceId)) { result.skipped++; continue; }
    seen.add(doc.sourceId);
    if (options.dryRun === true) {
      if (doc.publicSource?.providerStatus === 'EventCancelled') { result.skipped++; continue; }
      result.previewCount++;
      if (result.events.length < 10) result.events.push(doc);
      continue;
    }
    try {
      const existing = await Event.findOne({ source: doc.source, sourceId: doc.sourceId });
      if (existing) {
        if (String(existing.createdBy) !== String(organizerId) || existing.archivedAt) { result.skipped++; continue; }
        delete doc.status;
        if (doc.publicSource?.providerStatus === 'EventCancelled') existing.status = 'cancelled';
        const normalizeCompare = val => {
          if (!val) return val;
          if (Array.isArray(val)) {
            return val.map(item => {
              if (item && typeof item === 'object') {
                const copy = item.toObject ? item.toObject() : { ...item };
                delete copy._id; delete copy.id;
                return copy;
              }
              return item;
            });
          }
          if (val instanceof Date) return val.toISOString();
          return val;
        };
        const meaningful = Object.entries(doc).filter(([key]) => !['importedAt', 'pipelineMeta', 'publicSource'].includes(key));
        const object = existing.toObject();
        if (!existing.isModified() && meaningful.every(([key, value]) => JSON.stringify(normalizeCompare(object[key])) === JSON.stringify(normalizeCompare(value)))) { result.unchanged++; continue; }
        existing.set(doc);
        await existing.save();
        result.updated++;
      } else {
        if (doc.publicSource?.providerStatus === 'EventCancelled') { result.skipped++; continue; }
        await Event.create({ ...doc, createdBy: organizerId, status: 'pending_review', isOfficial: false });
        result.created++;
      }
    } catch { result.failedWrites++; }
  }
  result.syncedCount = result.created + result.updated;
  return result;
}

const syncWordPressEventsCalendar = (url, organizerId, options = {}) => syncAgenda(url, organizerId, { ...options, type: 'wp_the_events_calendar' });
async function syncOpenAgenda() { throw sourceError('OpenAgenda todavía requiere validación de acceso', 422); }
module.exports = { detectAgendaType, syncAgenda, syncWordPressEventsCalendar, syncOpenAgenda, normalizeAgendaRow, absoluteDate };
