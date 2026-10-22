const service = require('../src/services/twoFactorService');
const actual = jest.requireActual('speakeasy');
const actualQr = jest.requireActual('qrcode');
beforeEach(() => {
  require('speakeasy').generateSecret.mockImplementation(actual.generateSecret.bind(actual));
  require('speakeasy').totp.verify.mockImplementation(actual.totp.verify.bind(actual.totp));
  require('qrcode').toDataURL.mockImplementation(actualQr.toDataURL.bind(actualQr));
});
test('the actual 2FA service accepts a real current OTP and rejects expired, malformed and wrong-secret tokens', async () => {
  const generated = await service.generateSecret('crypto-test@example.test');
  expect(generated.qrCode).toMatch(/^data:image\/png;base64,/);
  expect(generated.qrCode).not.toContain('TEST_QR_CODE');
  const secret = generated.secret;
  const token = actual.totp({ secret, encoding: 'base32' });
  expect(service.verifyToken(token, secret)).toBe(true);
  expect(service.verifyToken('not-an-otp', secret)).toBe(false);
  const old = actual.totp({ secret, encoding: 'base32', time: Math.floor(Date.now() / 1000) - 3600 });
  expect(service.verifyToken(old, secret, 0)).toBe(false);
  let otherSecret = actual.generateSecret().base32;
  while (actual.totp({ secret: otherSecret, encoding: 'base32' }) === token) otherSecret = actual.generateSecret().base32;
  expect(service.verifyToken(token, otherSecret, 0)).toBe(false);
});
