/**
 * Jest globalSetup — runs ONCE per test process (before any test file).
 * Spins up a single shared MongoMemoryServer so that all test files (and all
 * jest workers) connect to the SAME mongod instead of each file starting its
 * own instance and colliding on ports (which produced AggregateError via
 * ECONNREFUSED / internalConnectMultiple).
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  const mongoServer = await MongoMemoryServer.create();
  // Expose the URI to every worker via the environment (workers inherit env).
  process.env.MONGODB_URI = mongoServer.getUri();
  // Keep the handle so globalTeardown can stop it.
  global.__MONGOD__ = mongoServer;
};
