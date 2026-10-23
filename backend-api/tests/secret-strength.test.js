const { weakSecretReasons } = require('../src/config/secretStrength');
const strong = () => require('crypto').randomBytes(48).toString('hex');

test('production secrets must be long, distinct and not template values', () => {
  expect(weakSecretReasons({ JWT_SECRET: strong(), JWT_REFRESH_SECRET: strong() })).toEqual([]);
  expect(weakSecretReasons({ JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production', JWT_REFRESH_SECRET: strong() })).toHaveLength(1);
  expect(weakSecretReasons({ JWT_SECRET: 'short', JWT_REFRESH_SECRET: '' })).toHaveLength(2);
  const same = strong();
  expect(weakSecretReasons({ JWT_SECRET: same, JWT_REFRESH_SECRET: same })).toContain('JWT_SECRET y JWT_REFRESH_SECRET deben ser distintos');
});
