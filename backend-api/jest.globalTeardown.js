/**
 * Jest globalTeardown — runs ONCE after all test files, in the same process
 * as globalSetup. Stops the shared MongoMemoryServer.
 */
module.exports = async function globalTeardown() {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
};
