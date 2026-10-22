'use strict';

/**
 * planetaryEventHarvester.js
 * ------------------------------------------------------------------
 * Global Ingestion & Population Engine for EventNow 2.0.
 * Ingests and maintains published event ecosystems across Dominican
 * Republic, Brazil, Japan, Mexico, Colombia, Argentina, Spain,
 * United States, and borderless Virtual Streams.
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { PLANETARY_ITEMS, sanitizeTag } = require('./planetaryCatalog');
const { invalidateCache } = require('../../middleware/cache');
const logger = require('../../utils/logger') || console;
const { demoCatalogEnabled, DEMO_CATALOG_SKIP } = require('./demoCatalogGuard');

/**
 * Seeds or updates the global planetary catalog in MongoDB.
 *
 * @param {Object} options
 * @param {boolean} [options.dryRun=false] - When true, simulates without writing to DB
 * @returns {Promise<{ success: boolean, created: number, updated: number, total: number, byCountry: Object }>}
 */
async function seedPlanetaryEvents({ dryRun = false } = {}) {
  if (!demoCatalogEnabled()) return { ...DEMO_CATALOG_SKIP };
  try {
    // 1. Get or confirm the Official Admin Curator
    let curator = await User.findOne({ role: 'admin' });
    if (!curator) {
      curator = await User.findOne();
    }
    if (!curator) {
      logger.warn('[PlanetaryHarvester] No user found to author planetary events. Seeding deferred.');
      return { success: false, reason: 'no_user_found' };
    }

    logger.info(`[PlanetaryHarvester] Starting planetary ingestion under curator: ${curator.username} (${curator._id})`);

    let created = 0;
    let updated = 0;
    const byCountry = {};

    for (const item of PLANETARY_ITEMS) {
      const countryKey = item.location?.countryCode || 'VIRTUAL';
      byCountry[countryKey] = (byCountry[countryKey] || 0) + 1;

      if (dryRun) continue;

      const sanitizedTags = (item.tags || []).map(sanitizeTag);
      const coords = item.location?.coordinates || [0, 20];
      const lng = coords[0];
      const lat = coords[1];

      // Calculate Uber H3 Spatial Hierarchy
      let h3Index = {};
      if (!item.isVirtual && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        try {
          h3Index = computeH3Hierarchy(lat, lng);
        } catch (h3Err) {
          logger.warn(`[PlanetaryHarvester] H3 index calculation skipped for ${item.sourceId}: ${h3Err.message}`);
        }
      }

      const eventPayload = {
        title: item.title,
        description: item.description,
        category: item.category,
        date: item.date,
        endDate: item.endDate,
        timeZone: item.timeZone,
        location: item.location,
        price: item.price,
        images: item.images,
        maxAttendees: item.maxAttendees,
        tags: sanitizedTags,
        activityType: item.activityType || 'event',
        isOfficial: true,
        isSoloFriendly: true,
        status: 'published',
        isPrivate: false,
        source: 'planetary_catalog',
        sourceId: item.sourceId,
        createdBy: curator._id,
        organizer: item.organizer || 'EventNow Global Curator',
        ...(item.familyDetails ? { familyDetails: item.familyDetails } : {}),
        ...(item.holidaySeason ? { holidaySeason: item.holidaySeason } : {}),
        ...(item.holidayLabel ? { holidayLabel: item.holidayLabel } : {}),
        ...(item.healthDetails ? { healthDetails: item.healthDetails } : {}),
        ...(item.isVirtual ? {
          isVirtual: true,
          eventType: item.eventType || 'virtual',
          virtualPlatform: item.virtualPlatform || 'custom',
          virtualLink: item.virtualLink,
          virtualDetails: item.virtualDetails || {}
        } : {}),
        h3: h3Index,
        pipelineMeta: {
          rawSchemaType: 'planetary_catalog',
          language: item.location?.countryCode === 'BR' ? 'pt' : item.location?.countryCode === 'JP' ? 'ja' : item.location?.countryCode === 'US' ? 'en' : 'es',
          confidenceScore: 1.0,
          ingestedAt: new Date()
        }
      };

      const existing = await Event.findOne({
        $or: [
          { sourceId: item.sourceId },
          { title: item.title, 'location.countryCode': item.location?.countryCode }
        ]
      });

      if (existing) {
        await Event.findByIdAndUpdate(existing._id, { $set: eventPayload });
        updated++;
      } else {
        await Event.create(eventPayload);
        created++;
      }
    }

    if (!dryRun) {
      try {
        invalidateCache();
      } catch (_) {
        // Cache invalidation safe ignore if redis not active
      }
    }

    const total = await Event.countDocuments({ source: 'planetary_catalog' });
    logger.info(`[PlanetaryHarvester] Ingestion completed: created=${created}, updated=${updated}, catalogTotal=${total}`);

    return {
      success: true,
      created,
      updated,
      total,
      byCountry
    };
  } catch (err) {
    logger.error('[PlanetaryHarvester] Error during planetary ingestion:', err);
    throw err;
  }
}

module.exports = {
  seedPlanetaryEvents,
  PLANETARY_ITEMS
};
