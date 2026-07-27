/**
 * Jest Configuration for EventConnect 2.0 Backend API
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files - creates ONE MongoMemoryServer per PROCESS (cached on
  // globalThis in setup.js) and connects mongoose to its valid
  // mongodb://127.0.0.1:PORT URI. We run with maxWorkers:1 (single
  // process) so globalThis is process-wide and the mongod stays alive for
  // the whole run. This avoids both the "localhost:undefined" AggregateError
  // (workers on mongoose's port-less default) and the ECONNRESET / second-
  // mongod AggregateError (parallel workers each got their own globalThis
  // or the parent's mongod died mid-run).
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Single process: globalThis (and thus the shared mongod) is one and
  // alive for the entire run. Slower than parallel, but the only topology
  // that keeps one valid mongod reachable for every test file.
  maxWorkers: 1,

  // Test file patterns. NOTE: tests/integration/* are end-to-end tests
  // that hit a live HTTP server on :5000 (started outside jest); they are
  // excluded here because the supertest/in-process harness does not bring
  // one up, and attempting the connection produces stray AggregateError
  // rejections. Run them separately against a running server.
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.js'
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/integration/'],

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