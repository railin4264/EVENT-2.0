/**
 * Jest Configuration for EventConnect 2.0 Backend API
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files - provides test env vars + mongo connection per test file.
  // The shared MongoMemoryServer is created ONCE in globalSetup (see below)
  // so multiple test files don't each spawn their own mongod (port collisions
  // produced AggregateError / ECONNREFUSED in parallel + runInBand runs).
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Single shared MongoMemoryServer for the whole process (official pattern).
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

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Suppress console output during tests (optional)
  silent: false,

  // Error on deprecated features
  errorOnDeprecated: true
};