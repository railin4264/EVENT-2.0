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

// Global mocks for 2FA crypto deps. Defined here (setupFilesAfterEnv) so they
// are installed BEFORE any test file requires the server — in maxWorkers:1 the
// server/twoFactorService module is cached on first load, and twoFactor.test.js
// runs AFTER security.test.js (which doesn't mock these). Mocking globally
// ensures the cached twoFactorService sees the mocked qrcode/speakeasy in every
// file, so 2FA QR/token assertions are deterministic.
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,TEST_QR_CODE'))
}));
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'TEST_SECRET_BASE32_VALUE_FOR_TESTING',
    otpauth_url: 'otpauth://totp/EventConnect%20(test@example.com)?secret=TEST_SECRET_BASE32_VALUE_FOR_TESTING&issuer=eventconnect.com'
  })),
  // Default to a valid token so the cached server (maxWorkers:1) treats TOTP
  // verification as successful. Tests that need a rejection override this with
  // speakeasy.totp.verify.mockReturnValue(false).
  totp: { verify: jest.fn(() => true) }
}));

// Blanks so the app runs without external infra (Redis/SMTP optional).
process.env.REDIS_URL = '';
process.env.SMTP_HOST = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.SENTRY_DSN = '';
// Raise the 2FA rate-limit in tests: all requests share 127.0.0.1, so the
// default max:10/15min would 429 the 2FA route tests. Only the 2FA limiter
// reads this env; the auth/API limiters (which security/performance assert
// as 429) are unaffected.
process.env.TWO_FACTOR_RATE_LIMIT_MAX = process.env.TWO_FACTOR_RATE_LIMIT_MAX || '1000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-hermes';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  if (!globalThis.__MONGO__) {
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        globalThis.__MONGO__ = await MongoMemoryServer.create({
          instance: {
            ip: '127.0.0.1',
            launchTimeout: 60000
          }
        });
        break;
      } catch (err) {
        lastErr = err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (!globalThis.__MONGO__) throw lastErr;
  }
  const uri = globalThis.__MONGO__.getUri();
  process.env.MONGODB_URI = uri;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
  }
}, 90000);

// Jest creates a separate environment for each file, including globalThis.
// Release that environment's database and child process after its suite.
afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch (_) {}
  if (globalThis.__MONGO__) {
    try {
      await globalThis.__MONGO__.stop();
    } catch (_) {}
    globalThis.__MONGO__ = null;
    await new Promise(r => setTimeout(r, 300));
  }
});

beforeEach(() => {
  require('speakeasy').totp.verify.mockReturnValue(true);
});
