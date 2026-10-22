/**
 * seed-virtual-events.js
 * Run directly with: node backend-api/scripts/seed-virtual-events.js
 */
const mongoose = require('mongoose');
const { syncVirtualEvents } = require('../src/services/eventIngestion/virtualEventHarvester');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventconnect';

async function main() {
  console.log('[SeedVirtual] Connecting to MongoDB at', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('[SeedVirtual] Connected. Running syncVirtualEvents...');
  const result = await syncVirtualEvents();
  console.log('[SeedVirtual] Result:', result);
  await mongoose.disconnect();
  console.log('[SeedVirtual] Done.');
}

main().catch(err => {
  console.error('[SeedVirtual] Error:', err);
  process.exit(1);
});
