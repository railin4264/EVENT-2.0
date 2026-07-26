module.exports = {
  extends: [
    'expo',
  ],
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'build/',
    'metro.config.js',
    'scripts/',
    'react-native-maps.web.js',
  ],
};


























