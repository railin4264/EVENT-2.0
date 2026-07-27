/**
 * Jest Test Setup (runs per test file, AFTER the environment is ready)
 *
 * One MongoMemoryServer per PROCESS, created lazily and cached on
 * globalThis so every test file in this process shares the same instance
 * and its valid mongodb://127.0.0.1:PORT URI. We run with maxWorkers:1
 * (single process) so globalThis is process-wide and the mongod stays
 * alive for the whole run. This avoids the "localhost:undefined"
 * AggregateError (workers on mongoose's port-less default) and keeps a
 * single reachable mongod.
 *
 * NOTE on mocks: maxWorkers:1 also keeps ONE module registry, which is
 * required because twoFactor.test.js depends on jest.mock('qrcode'/
 * 'speakeasy'); under parallel execution an earlier file would cache the
 * real modules and shadow those mocks.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Blanks so the app runs without external infra (Redis/SMTP optional).
process.env.REDIS_URL = process.env.REDIS_URL || '';
process.env.SMTP_HOST = process.env.SMTP_HOST || '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-hermes';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  if (!globalThis.__MONGO__) {
    globalThis.__MONGO__ = await MongoMemoryServer.create();
  }
  const uri = globalThis.__MONGO__.getUri();
  process.env.MONGODB_URI = uri;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
  }
});

// We intentionally do NOT disconnect per-file: the mongod lives for the
// whole run (single process under maxWorkers:1).
