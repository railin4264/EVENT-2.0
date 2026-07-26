/**
 * Jest Configuration for EventConnect 2.0 Backend API
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files - provides test env vars; the mongo connection is
  // estabished per-file by setup.js (it connects to the shared URI).
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // ONE MongoMemoryServer for the WHOLE run, created in the parent
  // process by globalSetup and exposed via process.env.MONGODB_URI
  // (env is inherited by every worker). This is the only topology
  // that avoids the stray "localhost:undefined" AggregateError: a
  // per-worker mongod left the mongodb SDAM monitor reconnecting
  // to a port-less "localhost" when the worker-local db churned.
  globalSetup: '<rootDir>/jest.globalSetup.js',
  globalTeardown: '<rootDir>/jest.globalTeardown.js',

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module paths
  modulePaths: ['<rootDir>/src'],

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Globals
  globals: {
    'process.env.NODE_ENV': 'test'
  },

  // Transform configuration (if needed for ES6 modules)
  transform: {},

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Test result processor
  testResultsProcessor: undefined,

  // Max workers for parallel testing
  maxWorkers: '50%',

  // NOTE: forceExit/detectOpenHandles removed — forceExit kills the
  // process (and the MongoMemoryServer child) before SDAM monitor
  // timers finish, causing stray localhost:undefined reconnect attempts.

  // Suppress console output during tests (optional)
  silent: false,

  // Error on deprecated features
  errorOnDeprecated: true
};