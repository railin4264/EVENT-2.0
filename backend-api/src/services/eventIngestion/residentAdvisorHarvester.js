'use strict';

/**
 * Resident Advisor (ra.co) Public GraphQL Harvester
 * ------------------------------------------------------------------
 * Harvests electronic music events, underground clubs, DJ lineups,
 * and venue coordinates from the public ra.co GraphQL endpoint.
 */

const axios = require('axios');
const logger = require('../../utils/logger') || console;
const { computeH3Hierarchy } = require('./h3SpatialIndexer');

const RA_GRAPHQL_ENDPOINT = 'https://ra.co/graphql';

const EVENT_LISTINGS_QUERY = `
  query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
    eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
      data {
        id
        listingDate
        event {
          id
          title
          startTime
          endTime
          contentUrl
          images {
            filename
          }
          venue {
            id
            name
            address
            latitude
            longitude
          }
          artists {
            id
            name
          }
          cost
        }
      }
      totalResults
    }
  }
`;

/**
 * Queries Resident Advisor GraphQL endpoint for a given area and date range.
 *
 * @param {object} options
 * @param {number} [options.areaId=34] - e.g. 34 for New York, 13 for London, 45 for Miami
 * @param {string} [options.dateFrom] - ISO string 'YYYY-MM-DD'
 * @param {string} [options.dateTo] - ISO string 'YYYY-MM-DD'
 * @returns {Promise<Array<object>>}
 */
async function fetchRaEvents({ areaId = 34, dateFrom, dateTo } = {}) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const variables = {
      filters: {
        areas: { eq: areaId },
        listingDate: {
          gte: dateFrom || today,
          lte: dateTo || thirtyDaysLater
        }
      },
      pageSize: 30,
      page: 1
    };

    const res = await axios.post(
      RA_GRAPHQL_ENDPOINT,
      { query: EVENT_LISTINGS_QUERY, variables },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
          'Referer': 'https://ra.co/events'
        },
        timeout: 15000
      }
    );

    const listings = res.data?.data?.eventListings?.data || [];
    const events = [];

    for (const item of listings) {
      const ev = item.event;
      if (!ev) continue;

      const lat = parseFloat(ev.venue?.latitude);
      const lng = parseFloat(ev.venue?.longitude);
      const coords = (Number.isFinite(lng) && Number.isFinite(lat)) ? [lng, lat] : [-69.9312, 18.4861];
      const h3Hierarchy = computeH3Hierarchy(coords[1], coords[0]);

      const artistsList = (ev.artists || []).map(a => a.name).filter(Boolean);
      const description = artistsList.length > 0
        ? `Lineup: ${artistsList.join(', ')}. Sesión de música electrónica en ${ev.venue?.name || 'club'}.`
        : `Noche de música electrónica en vivo en ${ev.venue?.name || 'recinto'}.`;

      events.push({
        title: ev.title,
        description,
        category: 'music',
        activityType: 'electronic_club',
        date: ev.startTime ? new Date(ev.startTime) : new Date(item.listingDate),
        endDate: ev.endTime ? new Date(ev.endTime) : new Date(new Date(item.listingDate).getTime() + 6 * 3600 * 1000),
        location: {
          type: 'Point',
          coordinates: coords,
          venue: ev.venue?.name || 'Club Nocturno',
          address: ev.venue?.address || 'Área Metropolitana'
        },
        price: {
          amount: parseFloat(ev.cost) || 0,
          currency: 'USD'
        },
        images: ev.images?.[0]?.filename ? [{ url: ev.images[0].filename }] : [],
        externalUrl: ev.contentUrl ? `https://ra.co${ev.contentUrl}` : 'https://ra.co',
        source: 'resident_advisor_graphql',
        sourceId: `ra-${ev.id}`,
        h3: h3Hierarchy,
        tags: ['electronica', 'club', 'nightlife', ...artistsList.slice(0, 3).map(a => a.toLowerCase().replace(/[^a-z0-9]/g, '-'))],
        pipelineMeta: {
          tier: 2,
          ingestedAt: new Date(),
          originalSourceUrl: `https://ra.co/events`,
          rawSchemaType: 'resident_advisor_graphql',
          confidenceScore: 0.98
        }
      });
    }

    return events;
  } catch (err) {
    logger.warn?.(`Resident Advisor GraphQL harvest failed: ${err.message}`);
    return [];
  }
}

module.exports = {
  fetchRaEvents
};
