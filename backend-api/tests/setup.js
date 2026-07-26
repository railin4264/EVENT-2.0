/**
 * Jest Test Setup (runs per test file, AFTER the environment is ready)
 *
 * The MongoMemoryServer is created ONCE for the WHOLE run by
 * jest.globalSetup.js, which exposes its URI via process.env.MONGODB_URI
 * (env is inherited by every worker). Here we ONLY connect mongoose
 * to that shared URI — we never create a mongod ourselves.
 *
 * directConnection:true disables the mongodb SDAM monitor, whose
 * background reconnect attempts ("localhost:undefined") were the source
 * of the stray AggregateError / internalConnectMultiple that appeared
 * only in the full suite.
 *
 * We connect once (if not already up) and never disconnect between
 * files in the same worker (would tear down the shared connection
 * for the next file). globalSetup stops the mongod at the end.
 */

const mongoose = require('mongoose');

// Variables de entorno para tests (deben ir ANTES de importar el server)
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
// Tests run without Redis/SMTP externally (MongoMemoryServer is used).
// Blank (but present) so dotenv.config() in server.js won't re-inject the
// real REDIS_URL/SMTP_HOST from .env, which would trigger connection attempts.
process.env.REDIS_URL = '';
process.env.SMTP_HOST = '';

// Connect to the shared MongoMemoryServer provided by globalSetup.
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      directConnection: true, // disable SDAM monitor reconnects
      serverSelectionTimeoutMS: 5000,
    });
  }
});

// Limpiar después de cada test (per-test, safe)
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// NO afterAll disconnect: the shared mongod is stopped by globalTeardown,
// and disconnecting here would break other files sharing this worker.
