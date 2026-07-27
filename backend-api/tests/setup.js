/**
 * Jest Test Setup (runs per test file, AFTER the environment is ready)
 *
 * One MongoMemoryServer per PROCESS, created lazily and cached on
 * globalThis so every test file in this process shares a valid
 * mongodb://127.0.0.1:PORT URI. The jest config runs with
 * maxWorkers:1 (single process), so globalThis is process-wide and the
 * mongod stays alive for the whole run — this avoids BOTH the stray
 * "localhost:undefined" AggregateError (workers on mongoose's port-less
 * default when globalSetup's env didn't reach them) AND the ECONNRESET
 * / second-mongod AggregateError (parallel workers each got their own
 * globalThis / the parent's mongod died mid-run).
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Variables de entorno para tests (deben ir ANTES de importar el server)
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
// Tests run without Redis/SMTP externally. Blank (but present) so
// dotenv.config() in server.js won't re-inject the real REDIS_URL/SMTP_HOST.
process.env.REDIS_URL = '';
process.env.SMTP_HOST = '';

beforeAll(async () => {
  if (!globalThis.__MONGO__) {
    globalThis.__MONGO__ = await MongoMemoryServer.create();
  }
  const uri = globalThis.__MONGO__.getUri();
  process.env.MONGODB_URI = uri;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  }
});

// Limpiar después de cada test (per-test, safe)
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// NO afterAll disconnect: the mongod + connection persist for the process
// lifetime; jest reaps the mongod when the single worker exits.
