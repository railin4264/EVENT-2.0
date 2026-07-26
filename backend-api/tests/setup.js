/**
 * Jest Test Setup
 * Configuración global para tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Configurar antes de todos los tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Limpiar después de cada test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cerrar conexión después de todos los tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Variables de entorno para tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
// Tests run without Redis/SMTP externally (MongoMemoryServer is used).
// Blank (but present) so dotenv.config() in server.js won't re-inject the
// real REDIS_URL/SMTP_HOST from .env, which would trigger connection attempts.
process.env.REDIS_URL = '';
process.env.SMTP_HOST = '';
