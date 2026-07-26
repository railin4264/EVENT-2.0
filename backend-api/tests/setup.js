/**
 * Jest Test Setup
 * Configuración global para tests
 *
 * Una sola MongoMemoryServer se comparte entre TODOS los archivos de test
 * (evita arrancar 8 mongods en paralelo, que colisionan en puertos/recursos
 * y producen AggregateError). setup.js posee el ciclo de vida completo;
 * los archivos de test solo usan process.env.MONGODB_URI ya seteado.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
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

let mongoServer;

// Configurar antes de todos los tests (una vez para toda la suite)
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Exponer para que los test files reutilicen la misma instancia
  globalThis.__MONGOD__ = mongoServer;
});

// Limpiar después de cada test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cerrar conexión después de todos los tests (única dueña del ciclo de vida)
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
  delete globalThis.__MONGOD__;
});
