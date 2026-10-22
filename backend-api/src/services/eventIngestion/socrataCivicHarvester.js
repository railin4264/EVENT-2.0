'use strict';

/**
 * Socrata Open Data API (SODA / SoQL) Civic Harvester
 * ------------------------------------------------------------------
 * Ingests municipal, state, and governmental cultural events
 * via SoQL queries ($where, $order, $limit) without API keys.
 */

const axios = require('axios');
const logger = require('../../utils/logger') || console;
const { computeH3Hierarchy } = require('./h3SpatialIndexer');

/**
 * Curated public SODA open data endpoints for civic events.
 */
const CIVIC_PORTALS = [
  {
    name: 'Portal Cívico Municipal Abierto',
    url: 'https://data.cityofnewyork.us/resource/tvpp-9vvx.json',
    dateField: 'start_date_time',
    titleField: 'event_name',
    descField: 'event_description',
    venueField: 'event_location'
  }
];

/**
 * Executes a SoQL query against a Socrata SODA endpoint.
 *
 * @param {string} endpointUrl
 * @param {object} options
 * @returns {Promise<Array<object>>}
 */
async function querySocrata(endpointUrl, {
  startDate = new Date().toISOString(),
  limit = 100,
  appToken = process.env.SOCRATA_APP_TOKEN || null
} = {}) {
  try {
    const headers = {
      'User-Agent': 'EventNow-CivicHarvester/2.0 (+https://eventnow.do)'
    };
    if (appToken) {
      headers['X-App-Token'] = appToken;
    }

    const params = {
      $limit: limit,
      $order: ':id DESC'
    };

    const res = await axios.get(endpointUrl, { params, headers, timeout: 12000 });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    logger.warn?.(`Socrata query failed on ${endpointUrl}: ${err.message}`);
    return [];
  }
}

/**
 * Normalizes a raw SODA record into EventNow canonical format.
 *
 * @param {object} row
 * @param {string} endpointUrl
 * @returns {object|null}
 */
function normalizeSocrataEvent(row, endpointUrl = '') {
  if (!row || typeof row !== 'object') return null;

  const title = row.event_name || row.title || row.name || row.project_name;
  if (!title || typeof title !== 'string' || title.length < 3) return null;

  const rawDate = row.start_date_time || row.event_date || row.date || row.created_date;
  const startDate = rawDate ? new Date(rawDate) : new Date();
  const endDate = row.end_date_time ? new Date(row.end_date_time) : new Date(startDate.getTime() + 4 * 3600 * 1000);

  let lat = null;
  let lng = null;

  if (row.latitude && row.longitude) {
    lat = parseFloat(row.latitude);
    lng = parseFloat(row.longitude);
  } else if (row.location?.latitude && row.location?.longitude) {
    lat = parseFloat(row.location.latitude);
    lng = parseFloat(row.location.longitude);
  } else if (Array.isArray(row.location?.coordinates)) {
    lng = parseFloat(row.location.coordinates[0]);
    lat = parseFloat(row.location.coordinates[1]);
  }

  const coords = (Number.isFinite(lng) && Number.isFinite(lat)) ? [lng, lat] : [-69.9312, 18.4861];
  const h3Hierarchy = computeH3Hierarchy(coords[1], coords[0]);

  return {
    title: title.trim(),
    description: (row.event_description || row.description || `Actividad cívica y cultural oficial: ${title}`).slice(0, 3000),
    category: 'culture',
    date: startDate,
    endDate,
    location: {
      type: 'Point',
      coordinates: coords,
      address: row.event_location || row.street_address || row.address || 'Espacio Público Municipal',
      venue: row.event_location || 'Plaza Cívica / Parque'
    },
    price: { amount: 0, currency: 'DOP' },
    isOfficial: true,
    activityType: 'civic_cultural',
    source: 'socrata_soda_civic',
    sourceId: row[':id'] || `${endpointUrl}#${encodeURIComponent(title)}`,
    h3: h3Hierarchy,
    pipelineMeta: {
      tier: 3,
      ingestedAt: new Date(),
      originalSourceUrl: endpointUrl,
      rawSchemaType: 'socrata_soda',
      confidenceScore: 0.99
    }
  };
}

module.exports = {
  CIVIC_PORTALS,
  querySocrata,
  normalizeSocrataEvent
};
