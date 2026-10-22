'use strict';

/**
 * seed-planetary-world.js
 * ------------------------------------------------------------------
 * Direct runner script to populate EventNow with authentic published
 * events across Dominican Republic, Brazil, Japan, Mexico, Colombia,
 * Argentina, Spain, USA, and Virtual global stages.
 *
 * Usage: node backend-api/scripts/seed-planetary-world.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { seedPlanetaryEvents, PLANETARY_ITEMS } = require('../src/services/eventIngestion/planetaryEventHarvester');
const { syncVirtualEvents } = require('../src/services/eventIngestion/virtualEventHarvester');
const Event = require('../src/models/Event');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventconnect';
  console.log(`[PlanetarySeeder] Connecting to MongoDB: ${uri}...`);
  await mongoose.connect(uri);

  console.log(`[PlanetarySeeder] Seeding ${PLANETARY_ITEMS.length} planetary events...`);
  const result = await seedPlanetaryEvents();
  console.log('[PlanetarySeeder] Planetary events result:', JSON.stringify(result, null, 2));

  console.log('[PlanetarySeeder] Synchronizing virtual stream events...');
  const virtualResult = await syncVirtualEvents();
  console.log('[PlanetarySeeder] Virtual events result:', JSON.stringify(virtualResult, null, 2));

  // Output new database totals by countryCode
  const breakdown = await Event.aggregate([
    { $group: { _id: '$location.countryCode', country: { $first: '$location.country' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('[PlanetarySeeder] Current events breakdown by countryCode:');
  console.table(breakdown);

  const cityBreakdown = await Event.aggregate([
    { $group: { _id: '$location.city', country: { $first: '$location.country' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 25 }
  ]);
  console.log('[PlanetarySeeder] Top cities breakdown:');
  console.table(cityBreakdown);

  await mongoose.disconnect();
  console.log('[PlanetarySeeder] Complete! Database is populated worldwide.');
  process.exit(0);
}

main().catch(err => {
  console.error('[PlanetarySeeder] Execution failed:', err);
  process.exit(1);
});
