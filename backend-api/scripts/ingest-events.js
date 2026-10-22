/**
 * Run one cycle of the approved source registry.
 * Register, review and approve sources using the admin Sources API first.
 * Environment credentials alone never activate public discovery.
 * Usage: node scripts/ingest-events.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { runGlobalIngestionCycle } = require('../src/services/eventIngestion/GlobalPipelineOrchestrator');

async function main() {
  const uri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventconnect').replace('localhost', '127.0.0.1');
  await mongoose.connect(uri);
  const result = await runGlobalIngestionCycle();
  console.log('Ingesta completada:', result);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
