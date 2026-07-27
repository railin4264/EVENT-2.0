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
  // the whole run, and so a single module registry is shared (needed
  // because twoFactor.test.js relies on jest.mock('qrcode'/'speakeasy')
  // which would be shadowed by a module cached from an earlier file under
  // parallel execution).
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Single process: globalThis (and thus the shared mongod) is one and
  // alive for the entire run.
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
  verbose: false,

  // Clear mocks between tests (mockClear only — keeps mock implementations).
  // NOTE: resetMocks/restoreMocks intentionally LEFT OFF. They call
  // mockReset()/mockRestore() which wipe the mock *implementation*, so the
  // global qrcode/speakeasy mocks in setup.js would start returning
  // undefined after the first test and crash twoFactorService.generateSecret.
  clearMocks: true,
  // Globals
  globals: {
    'process.env.NODE_ENV': 'test'
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // NOTE: forceExit/detectOpenHandles removed — forceExit kills the
  // process (and the MongoMemoryServer child) before SDAM monitor
  // timers finish, causing stray localhost:undefined reconnect attempts.
  silent: false,

  // Error on deprecated features
  errorOnDeprecated: true
};
