// Local development with a persistent, isolated MongoDB. No Docker required.
// Never points to the database from .env and never sends email or charges cards.
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function main() {
  process.env.NODE_ENV = 'development';
  process.env.REDIS_URL = '';
  process.env.SMTP_HOST = '';
  process.env.STRIPE_SECRET_KEY = '';
  process.env.SENTRY_DSN = '';
  const dbPath = path.resolve(__dirname, '../.local-data/mongodb');
  fs.mkdirSync(dbPath, { recursive: true });
  // Preserve MongoDB's own locks and recovery journal. A failure must never
  // silently replace the persistent database with an empty temporary instance.
  const mongo = await MongoMemoryServer.create({ instance: { dbPath, dbName: 'eventnow_local', storageEngine: 'wiredTiger', launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongo.getUri('eventnow_local');
  const { app, server } = require('../src/server');
  mongoose.set('bufferTimeoutMS', 5000);
  await mongoose.connect(process.env.MONGODB_URI);
  const io = require('../src/services/socketService').initialize(server);

  // Auto-seed verified Dominican events and ideas if empty
  try {
    const RDEventSeeder = require('../src/services/rdEventSeeder');
    const { seedIdeas } = require('./seed-ideas');
    await RDEventSeeder.ensureMinimumEvents(8);
    if (process.env.ENABLE_DEMO_DATA === 'true') await seedIdeas();
    console.log('✅ Base de datos local inicializada con eventos y creadores dominicanos.');
  } catch (err) {
    console.warn('Advertencia al sembrar eventos:', err.message);
  }

  app.set('io', io);
  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => console.log(`Local API ready: http://localhost:${port}; database: ${dbPath}`));

  process.on('unhandledRejection', (reason) => {
    console.warn('Unhandled rejection in dev server:', reason?.message || reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception in dev server:', err?.message || err);
  });

  let stopping = false;
  const cleanup = async () => {
    if (stopping) return;
    stopping = true;
    try { io.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
    try { await mongoose.disconnect(); } catch (_) {}
    try { await mongo.stop({ doCleanup: false }); } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(error => {
  console.error(`${error.message} — Se conservan todos sus archivos en .local-data/mongodb.`);
  process.exit(1);
});

