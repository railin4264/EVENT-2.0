'use strict';

// Read-only inventory: no remote feeds, seeding, scheduling or writes.
const path = require('path');
const mongoose = require('mongoose');
const { sourceBlockers, SUPPORTED_ADAPTERS } = require('../src/services/eventIngestion/sourcePolicy');

async function inspectIngestionReadiness() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const uri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventconnect').replace('localhost', '127.0.0.1');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, autoIndex: false, autoCreate: false });
    const db = mongoose.connection.db;
    const [records, publishedEvents] = await Promise.all([
      db.collection('sources').find({}, { projection: {
        _id: 0, sourceId: 1, name: 1, status: 1, classification: 1, adapterType: 1,
        accessConfig: 1, license: 1, responsibleOrganizer: 1
      } }).sort({ sourceId: 1 }).toArray(),
      db.collection('events').countDocuments({ status: 'published' })
    ]);
    // Do not print endpoint URLs, organizer identities, credentials or payloads.
    const sources = records.map(source => {
      const blockers = sourceBlockers(source);
      return { sourceId: source.sourceId, name: source.name, status: source.status,
        adapter: source.adapterType, ready: blockers.length === 0, blockers };
    });
    return {
      checkedAt: new Date().toISOString(), readOnly: true,
      supportedAdapters: [...SUPPORTED_ADAPTERS],
      summary: {
        registeredSources: sources.length,
        readySources: sources.filter(source => source.ready).length,
        blockedSources: sources.filter(source => !source.ready).length,
        activeButBlockedSources: sources.filter(source => source.status === 'active' && !source.ready).length,
        publishedEvents
      },
      note: 'Readiness checks configuration only; it does not certify provider availability, successful imports or global coverage.',
      sources
    };
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  inspectIngestionReadiness().then(report => console.log(JSON.stringify(report, null, 2))).catch(() => {
    console.error('No se pudo inspeccionar la ingesta. Comprueba la conexión local a MongoDB. No se modificaron datos.');
    process.exitCode = 1;
  });
}

module.exports = { inspectIngestionReadiness };
