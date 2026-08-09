/**
 * EventAggregator
 * ------------------------------------------------------------------
 * Pulls real, official events from public discovery APIs and normalizes
 * them into the local Event schema so the global map is never empty.
 *
 * Sources:
 *   - Ticketmaster Discovery API  (https://developer.ticketmaster.com/)
 *   - Eventbrite Public API       (https://www.eventbrite.com/platform/api)
 *
 * Both require an API key supplied via environment variables:
 *   TICKETMASTER_API_KEY
 *   EVENTBRITE_API_KEY
 *
 * If a key is missing the source is skipped gracefully (no crash). A local
 * sample seeder (scripts/seed-events.js) provides demo events so the map is
 * usable before the keys are configured.
 */

const axios = require('axios');
const Event = require('../models/Event');
const logger = require('../utils/logger');

const TICKETMASTER_BASE = 'https://app.ticketmaster.com/discovery/v2/events.json';
const EVENTBRITE_BASE = 'https://www.eventbriteapi.com/v3';

// Map a free-text category to the app's controlled category enum.
const CATEGORY_MAP = {
  music: 'music',
  concert: 'music',
  festival: 'music',
  sports: 'sports',
  theatre: 'arts',
  theater: 'arts',
  art: 'arts',
  museum: 'arts',
  film: 'arts',
  food: 'food',
  foodanddrink: 'food',
  business: 'business',
  tech: 'technology',
  technology: 'technology',
  conference: 'technology',
  workshop: 'workshop',
  health: 'health',
  fitness: 'health',
  party: 'party',
  social: 'party',
  community: 'community',
  charity: 'community',
  education: 'education',
  family: 'family',
  other: 'other'
};

const normalizeCategory = (raw = '') => {
  const key = String(raw).toLowerCase().replace(/[^a-z]/g, '');
  return CATEGORY_MAP[key] || 'other';
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

/**
 * Eventbrite -> Event documents
 */
async function fetchFromEventbrite({ lat, lng, radius = 50, page = 1 } = {}) {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) return [];

  try {
    const params = {
      token: apiKey,
      page,
      page_size: 50
    };
    if (lat != null && lng != null) {
      params['location.latitude'] = lat;
      params['location.longitude'] = lng;
      params['location.within'] = `${radius}km`;
    }

    const { data } = await axios.get(`${EVENTBRITE_BASE}/events/search/`, { params, timeout: 15000 });
    const events = data?.events || [];

    const enriched = await Promise.all(
      events.map(async (ev) => {
        let venue = {};
        try {
          const vRes = await axios.get(`${EVENTBRITE_BASE}/venues/${ev.venue_id}/`, {
            params: { token: apiKey },
            timeout: 10000
          });
          venue = vRes.data || {};
        } catch (_) { /* ignore venue lookup errors */ }

        const latV = parseFloat(venue.latitude);
        const lngV = parseFloat(venue.longitude);

        return {
          source: 'eventbrite',
          sourceId: String(ev.id),
          title: ev.name?.text || ev.name?.html || 'Event',
          description: ev.description?.text || 'Evento importado desde Eventbrite.',
          category: normalizeCategory(ev.category?.name || 'other'),
          tags: [ev.category?.name].filter(Boolean),
          location: {
            type: 'Point',
            coordinates: [lngV, latV],
            address: [venue.address?.address_1, venue.address?.city, venue.address?.region, venue.address?.country]
              .filter(Boolean)
              .join(', ')
          },
          venue: venue.name || '',
          date: ev.start?.utc ? new Date(ev.start.utc) : new Date(),
          price: {
            amount: ev.ticket_availability?.minimum_ticket_price?.major_value ?? 0,
            currency: ev.ticket_availability?.minimum_ticket_price?.currency || 'USD'
          },
          images: ev.logo ? [{ url: ev.logo.url }] : [],
          externalUrl: ev.url,
          imported: true,
          importedAt: new Date()
        };
      })
    );

    return enriched.filter((e) => Number.isFinite(e.location.coordinates[0]) && Number.isFinite(e.location.coordinates[1]));
  } catch (err) {
    logger.error('Eventbrite fetch failed:', err?.response?.data || err.message);
    return [];
  }
}

/**
 * Aggregate from all configured sources, dedupe by source+sourceId, and
 * upsert into the database. Returns the count of newly created events.
 */
async function aggregateAndStore({ lat, lng, radius = 50, size = 50 } = {}) {
  const incoming = [
    ...(await fetchFromTicketmaster({ lat, lng, radius, size })),
    ...(await fetchFromEventbrite({ lat, lng, radius }))
  ];

  // Imported events need an owner. Use a dedicated "system" account so they
  // don't belong to a real user.
  const User = require('../models/User');
  let systemUser = await User.findOne({ email: 'system@eventconnect.app' });
  if (!systemUser) {
    systemUser = await User.create({
      username: 'eventconnect_system',
      email: 'system@eventconnect.app',
      password: require('crypto').randomBytes(32).toString('hex'),
      isEmailVerified: true,
      role: 'system'
    });
  }

  let created = 0;
  let updated = 0;

  for (const item of incoming) {
    if (!item.sourceId) continue;
    const existing = await Event.findOne({ source: item.source, sourceId: item.sourceId });
    if (existing) {
      await Event.updateOne({ _id: existing._id }, { $set: item });
      updated += 1;
    } else {
      await Event.create({ ...item, createdBy: systemUser._id });
      created += 1;
    }
  }

  logger.info(`Event aggregation complete: ${created} created, ${updated} updated (${incoming.length} fetched)`);
  return { fetched: incoming.length, created, updated };
}

module.exports = {
  fetchFromTicketmaster,
  fetchFromEventbrite,
  aggregateAndStore,
  normalizeCategory
};
