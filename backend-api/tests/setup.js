/**
 * Jest Test Setup (runs per test file, AFTER the environment is ready)
 *
 * The single shared MongoMemoryServer is created ONCE in jest.globalSetup.js
 * (sets process.env.MONGODB_URI). Here we connect mongoose — but ONLY
 * once per worker, and we NEVER disconnect between files: setupFilesAfterEnv
 * runs this per FILE, so disconnecting in afterAll would tear down the
 * connection for the NEXT file that shares this worker, causing mongoose to
 * reconnect to a just-closed mongod (AggregateError / ECONNREFUSED).
 * globalTeardown stops the shared mongod at the very end.
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

// Connect to the shared MongoMemoryServer (once per worker; skip if already up)
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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

// NO afterAll disconnect here: globalTeardown stops the shared mongod,
// and disconnecting would break other files sharing this worker.
