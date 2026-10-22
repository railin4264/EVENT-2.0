/**
 * EventAggregator
 * ------------------------------------------------------------------
 * Pulls real, official events from public discovery APIs and normalizes
 * them into the local Event schema so the global map is never empty.
 *
 * Sources (each is skipped gracefully if its key is missing):
 *   - Ticketmaster Discovery API  (TICKETMASTER_API_KEY)
 *   - Eventbrite: organizer integration pending; public search is retired.
 *   - Bandsintown: artist-scoped integration pending, not a city search.
 *   - Songkick API                (SONGKICK_API_KEY)     — live music by geo
 *   - Meetup: authorized GraphQL integration pending.
 *
 * If a key is missing the source is skipped gracefully (no crash). A local
 * sample seeder (scripts/seed-events.js) provides demo events so the map is
 * usable before the keys are configured.
 */

const axios = require('axios');
const Event = require('../models/Event');
const logger = require('../utils/logger');

const TICKETMASTER_BASE = 'https://app.ticketmaster.com/discovery/v2/events.json';
const SONGKICK_BASE = 'https://api.songkick.com/api/3.0';

// Map a free-text category to the app's controlled category enum.
const { CATEGORY_SLUGS } = require('../utils/categories');
const { fetchIcsFeeds, fetchJsonFeeds, listConfigured, defaultCoords } = require('./feedImporter');

const CATEGORY_MAP = {
  music: 'music', concert: 'music', festival: 'party', jazz: 'music', rock: 'music', pop: 'music',
  sports: 'sports', sport: 'sports', deporte: 'sports', deportes: 'sports',
  theatre: 'entertainment', theater: 'entertainment', teatro: 'entertainment', comedy: 'nightlife',
  art: 'art', arte: 'art', exhibition: 'art', exposicion: 'art', museum: 'culture', cultura: 'culture', culture: 'culture',
  film: 'film', cine: 'film', cinema: 'film', photography: 'photography', fotografia: 'photography',
  dance: 'dance', baile: 'dance', danza: 'dance',
  food: 'food', foodanddrink: 'food', gastronomia: 'food', comida: 'food',
  business: 'business', negocios: 'business', networking: 'networking',
  tech: 'technology', technology: 'technology', tecnologia: 'technology', conference: 'technology', hackathon: 'technology',
  workshop: 'workshop', taller: 'workshop', class: 'workshop',
  health: 'health', salud: 'health', fitness: 'wellness', wellness: 'wellness', yoga: 'wellness', bienestar: 'wellness',
  outdoors: 'outdoors', nature: 'outdoors', hiking: 'outdoors', senderismo: 'outdoors',
  party: 'party', fiesta: 'party', nightlife: 'nightlife', social: 'social',
  community: 'community', comunidad: 'community', charity: 'community', volunteering: 'community', voluntariado: 'community',
  education: 'education', educacion: 'education', literature: 'literature', lectura: 'literature', books: 'literature',
  gaming: 'gaming', juegos: 'gaming', family: 'family', familia: 'family', kids: 'family',
  other: 'other', otro: 'other'
};

const normalizeCategory = (raw = '') => {
  const key = String(raw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  if (CATEGORY_SLUGS.includes(key)) return key;
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  const hit = Object.keys(CATEGORY_MAP).find(k => key.includes(k) && k.length > 3);
  return hit ? CATEGORY_MAP[hit] : 'other';
};

/**
 * Ticketmaster Discovery -> Event documents
 */
async function fetchFromTicketmaster({ lat, lng, radius = 50, size = 50, page = 0 } = {}) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  try {
    const params = {
      apikey: apiKey,
      size,
      page,
      sort: 'date,asc',
      locale: '*'
    };
    if (lat != null && lng != null) {
      params.geoPoint = `${lat},${lng}`;
      params.radius = radius;
    }

    const { data } = await axios.get(TICKETMASTER_BASE, { params, timeout: 15000 });
    const events = data?._embedded?.events || [];

    return events.map((ev) => {
      const venue = ev._embedded?.venues?.[0];
      const latV = parseFloat(venue?.location?.latitude);
      const lngV = parseFloat(venue?.location?.longitude);
      const category = ev.classifications?.[0]?.segment?.name || ev.classifications?.[0]?.genre?.name || 'other';
      const startDate = ev.dates?.start?.dateTime || ev.dates?.start?.localDate;

      return {
        source: 'ticketmaster',
        sourceId: ev.id,
        title: ev.name,
        description: ev.description || ev.info || 'Evento importado desde Ticketmaster.',
        category: normalizeCategory(category),
        tags: [category].filter(Boolean),
        location: {
          type: 'Point',
          coordinates: [lngV, latV],
          address: [venue?.address?.line1, venue?.city?.name, venue?.state?.stateCode, venue?.country?.countryCode]
            .filter(Boolean)
            .join(', ')
        },
        venue: venue?.name || '',
        date: startDate ? new Date(startDate) : new Date(),
        price: {
          amount: ev.priceRanges?.[0]?.min ?? 0,
          currency: ev.priceRanges?.[0]?.currency || 'USD'
        },
        images: (ev.images || []).slice(0, 5).map((img) => ({ url: img.url })),
        externalUrl: ev.url,
        imported: true,
        importedAt: new Date()
      };
    }).filter((e) => Number.isFinite(e.location.coordinates[0]) && Number.isFinite(e.location.coordinates[1]));
  } catch (err) {
    logger.error('Ticketmaster fetch failed:', err?.response?.data || err.message);
    return [];
  }
}

// These providers require organizer-specific or separately approved integrations.
// A credential alone does not enable global public discovery.
async function fetchFromEventbrite() { return []; }
async function fetchFromBandsintown() { return []; }

/**
 * Songkick -> Event documents (live music, native geo search).
 */
async function fetchFromSongkick({ lat, lng, radius = 50, page = 1 } = {}) {
  const apiKey = process.env.SONGKICK_API_KEY;
  if (!apiKey || lat == null || lng == null) return [];

  try {
    const params = {
      apikey: apiKey,
      page,
      per_page: 50,
      location: `geo:${lat},${lng}`,
      radius
    };
    const { data } = await axios.get(`${SONGKICK_BASE}/events.json`, { params, timeout: 15000 });
    const events = data?.results?.event || [];

    return events.map((ev) => {
      const venue = ev.venue || {};
      const latV = parseFloat(venue.lat);
      const lngV = parseFloat(venue.lng);
      const startDate = ev.start?.datetime || ev.start?.date;

      return {
        source: 'songkick',
        sourceId: String(ev.id),
        title: ev.displayName || ev.type || 'Concierto',
        description: `Evento de Songkick: ${ev.displayName || ev.type || ''}`,
        category: normalizeCategory(ev.type || 'concert'),
        tags: ['music', (ev.type || 'concert').toLowerCase()].filter(Boolean),
        location: {
          type: 'Point',
          coordinates: [lngV, latV],
          address: [venue.displayName, venue.city?.displayName, venue.metroArea?.displayName]
            .filter(Boolean)
            .join(', ')
        },
        venue: venue.displayName || '',
        date: startDate ? new Date(startDate) : new Date(),
        price: { amount: 0, currency: 'USD' },
        images: [],
        externalUrl: ev.uri,
        imported: true,
        importedAt: new Date()
      };
    }).filter((e) => Number.isFinite(e.location.coordinates[0]) && Number.isFinite(e.location.coordinates[1]));
  } catch (err) {
    logger.error('Songkick fetch failed:', err?.response?.data || err.message);
    return [];
  }
}

async function fetchFromMeetup() { return []; }

function hasAnySourceConfigured() {
  return Boolean(
    process.env.TICKETMASTER_API_KEY || process.env.SONGKICK_API_KEY ||
    listConfigured('ICS_FEEDS').length || listConfigured('JSON_EVENT_FEEDS').length
  );
}

function defaultZone() {
  const c = defaultCoords();
  return { lat: c.lat, lng: c.lng, radius: Number(process.env.INGESTION_RADIUS_KM) || 150, size: 100 };
}

/**
 * Convierte un item importado a un documento Event válido. Devuelve null si no es salvable.
 */
function toEventDoc(item) {
  if (!item.source || !item.sourceId || String(item.sourceId) === 'undefined') return null;
  const title = String(item.title || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, ' ').trim().slice(0, 100);
  if (title.length < 3) return null;

  const date = item.date instanceof Date ? item.date : new Date(item.date);
  const endDate = item.endDate ? new Date(item.endDate) : null;
  const limit = new Date(); limit.setFullYear(limit.getFullYear() + 2);
  if (Number.isNaN(date.getTime()) || date < new Date(Date.now() - 3600 * 1000) || date > limit) return null;

  let description = String(item.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (description.length < 10) description = (description + ' — ' + title + '. Evento importado.').slice(0, 2000);

  const coords = item.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2 || !coords.every(Number.isFinite) || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) return null;
  let address = String(item.location?.address || '').trim().slice(0, 200);
  if (address.length < 5) address = [item.location?.venue || item.venue, item.location?.city, item.location?.country].filter(Boolean).join(', ').slice(0, 200);
  if (address.length < 5) return null;

  const amount = Math.max(0, Math.round((Number(item.price?.amount) || 0) * 100) / 100);
  const currency = String(item.price?.currency || 'USD').toUpperCase();
  if (!Event.schema.path('price.currency').enumValues.includes(currency)) return null;
  const tags = (item.tags || []).map(t => String(t).toLowerCase().replace(/[^a-z0-9\u00C0-\u017F_-]/g, '').slice(0, 30)).filter(Boolean).slice(0, 10);

  const doc = {
    source: item.source,
    sourceId: String(item.sourceId),
    title,
    description,
    category: normalizeCategory(item.category),
    tags,
    date,
    endDate: endDate && Number.isFinite(endDate.getTime()) && endDate >= date ? endDate : undefined,
    location: { type: 'Point', coordinates: coords, address, venue: String(item.location?.venue || item.venue || '').slice(0, 100), city: String(item.location?.city || '').slice(0, 100), country: String(item.location?.country || '').slice(0, 100) },
    price: { amount, currency },
    images: (item.images || []).filter(i => i && /^https?:\/\//i.test(i.url)).slice(0, 5),
    externalUrl: item.externalUrl && /^https?:\/\//i.test(item.externalUrl) ? item.externalUrl : undefined,
    ticketUrl: item.ticketUrl && /^https?:\/\//i.test(item.ticketUrl) ? item.ticketUrl : (amount > 0 ? item.externalUrl : undefined),
    paymentMode: amount > 0 ? 'external' : 'free',
    imported: true,
    importedAt: new Date(),
    organizer: item.organizer || item.source,
    status: 'pending_review'
  };
  if (doc.ticketUrl && !/^https?:\/\//i.test(doc.ticketUrl)) delete doc.ticketUrl;
  if (!doc.images || doc.images.length === 0) {
    const { getCategoryFallbackImage } = require('../utils/imageFallbacks');
    doc.images = [{ url: getCategoryFallbackImage({ category: doc.category, tags: doc.tags, title: doc.title, isVirtual: doc.isVirtual }), caption: doc.title }];
  }
  if (typeof item.timeZone === 'string') {
    try {
      new Intl.DateTimeFormat('en', { timeZone: item.timeZone }).format();
      doc.timeZone = item.timeZone;
    } catch { /* Keep an absent zone explicit instead of guessing from the city. */ }
  }
  return doc;
}

/**
 * Agrega desde todas las fuentes configuradas, deduplica por source+sourceId y hace upsert.
 * Cada evento se valida de forma aislada: uno inválido no detiene la ingesta.
 */
async function aggregateAndStore({ lat, lng, radius = 50, size = 50 } = {}) {
  const incoming = [
    ...(await fetchFromTicketmaster({ lat, lng, radius, size })),
    ...(await fetchFromEventbrite({ lat, lng, radius })),
    ...(await fetchFromBandsintown({ lat, lng, radius })),
    ...(await fetchFromSongkick({ lat, lng, radius })),
    ...(await fetchFromMeetup({ lat, lng, radius })),
    ...(await fetchIcsFeeds()),
    ...(await fetchJsonFeeds())
  ];

  const User = require('../models/User');
  let systemUser = await User.findOne({ email: 'system@eventconnect.app' });
  if (!systemUser && incoming.length) {
    systemUser = await User.create({
      username: 'eventnow_system',
      email: 'system@eventconnect.app',
      password: require('crypto').randomBytes(32).toString('hex') + 'Aa1!',
      firstName: 'EventNow',
      lastName: 'Importados',
      isEmailVerified: true,
      role: 'system'
    });
  }

  let created = 0, updated = 0, skipped = 0;
  for (const item of incoming) {
    const doc = toEventDoc(item);
    if (!doc) { skipped += 1; continue; }
    try {
      const existing = await Event.findOne({ source: doc.source, sourceId: doc.sourceId });
      if (existing) {
        // Synchronization must not undo an administrator's approval or cancellation.
        delete doc.status;
        // Validate as a document so cross-field validators can read this.date.
        existing.set(doc);
        await existing.save();
        updated += 1;
      } else {
        await Event.create({ ...doc, createdBy: systemUser._id });
        created += 1;
      }
    } catch (err) {
      skipped += 1;
      logger.warn(`Ingestion skipped "${doc.title}": ${err.message}`);
    }
  }

  logger.info(`Event aggregation complete: ${created} created, ${updated} updated, ${skipped} skipped (${incoming.length} fetched)`);
  return { fetched: incoming.length, created, updated, skipped };
}

module.exports = {
  fetchFromTicketmaster,
  fetchFromEventbrite,
  fetchFromBandsintown,
  fetchFromSongkick,
  fetchFromMeetup,
  aggregateAndStore,
  hasAnySourceConfigured,
  defaultZone,
  toEventDoc,
  normalizeCategory
};
