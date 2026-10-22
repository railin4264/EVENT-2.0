const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const OAuthState = require('../src/models/OAuthState');
const User = require('../src/models/User');
const oauthService = require('../src/services/oauthService');
const jwtService = require('../src/services/jwtService');

jest.mock('../src/middleware/sentryMiddleware', () => ({
  trackSecurityEvent: () => (req, res, next) => next()
}));

const app = express();
app.use(express.json());
app.use('/oauth', require('../src/routes/oauth'));
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const cert = keys.publicKey.export({ type: 'spki', format: 'pem' });
const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' });
const audience = 'release-test.apps.googleusercontent.com';

function signedIdentity(changes = {}, signingKey = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({
    sub: 'google-subject-1', aud: audience, iss: 'https://accounts.google.com',
    iat: now, exp: now + 3600, email: 'oauthrelease@example.com',
    email_verified: true, given_name: 'OAuth', ...changes
  }, signingKey, { algorithm: 'RS256', keyid: 'release-key' });
}

beforeEach(async () => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = audience;
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-only-provider-secret';
  process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost:3001/oauth/google/callback';
  await Promise.all([OAuthState.deleteMany({}), User.deleteMany({})]);
});

afterEach(() => jest.restoreAllMocks());

test('does not offer Google when its server credentials are incomplete', async () => {
  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const response = await request(app).get('/oauth/providers');
  expect(response.body.data.providers.some(provider => provider.name.toLowerCase() === 'google')).toBe(false);
});

describe('OAuth state without optional Redis', () => {
  test('persists only a digest and permits exactly one concurrent consumer', async () => {
    const state = await oauthService.generateState('google', '/events/create');
    const stored = await OAuthState.findOne().lean();
    expect(stored._id).not.toBe(state);
    expect(JSON.stringify(stored)).not.toContain(state);
    const results = await Promise.all(Array.from({ length: 8 }, () => oauthService.verifyState(state, 'google')));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.find(Boolean).originalUrl).toBe('/events/create');
  });

  test('a different provider cannot consume the state, and expiry is enforced before TTL deletion', async () => {
    const state = await oauthService.generateState('google');
    expect(await oauthService.verifyState(state, 'facebook')).toBeNull();
    expect(await oauthService.verifyState(state, 'google')).toBeTruthy();
    const expired = await oauthService.generateState('google');
    await OAuthState.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    expect(await oauthService.verifyState(expired, 'google')).toBeNull();
  });

  test('invalid states never exchange an authorization code', async () => {
    const exchange = jest.spyOn(OAuth2Client.prototype, 'getToken');
    await expect(oauthService.verifyGoogleToken('unused-code', 'invalid')).rejects.toThrow();
    expect(exchange).not.toHaveBeenCalled();
  });
});

describe('real Google ID token cryptography with a local test certificate', () => {
  async function verify(changes, signingKey) {
    const idToken = signedIdentity(changes, signingKey);
    // Only provider HTTP boundaries are replaced; the installed library verifies
    // the RSA signature, issuer, audience and expiry itself.
    jest.spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({ tokens: {
      id_token: idToken, access_token: 'private-provider-access', refresh_token: 'private-provider-refresh'
    } });
    jest.spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync').mockResolvedValue({ certs: { 'release-key': cert } });
    const state = await oauthService.generateState('google', '/events');
    return oauthService.verifyGoogleToken('test-code', state);
  }

  test('accepts a valid signed identity on the upgraded client', async () => {
    const result = await verify({});
    expect(result).toMatchObject({ providerId: 'google-subject-1', emailVerified: true, originalUrl: '/events' });
  });

  test.each([
    ['audience', { aud: 'another-app' }],
    ['issuer', { iss: 'https://attacker.example' }],
    ['expiry', { iat: Math.floor(Date.now() / 1000) - 4000, exp: Math.floor(Date.now() / 1000) - 1000 }],
    ['unverified email', { email_verified: false }],
    ['missing subject', { sub: '' }]
  ])('rejects invalid %s', async (_, changes) => {
    await expect(verify(changes)).rejects.toThrow('Failed to verify Google token');
  });

  test('rejects a token signed by a different key', async () => {
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    await expect(verify({}, other.privateKey.export({ type: 'pkcs8', format: 'pem' }))).rejects.toThrow();
  });

  test('parallel refreshes cannot overwrite another account credentials', async () => {
    const clients = [];
    jest.spyOn(OAuth2Client.prototype, 'refreshAccessToken').mockImplementation(async function () {
      clients.push(this);
      await new Promise(resolve => setImmediate(resolve));
      return { credentials: { access_token: `access-for-${this.credentials.refresh_token}` } };
    });
    const results = await Promise.all(['first', 'second'].map(token => oauthService.refreshGoogleToken(token)));
    expect(clients[0]).not.toBe(clients[1]);
    expect(results.map(result => result.accessToken)).toEqual(['access-for-first', 'access-for-second']);
    expect(oauthService.googleClient.credentials).toEqual({});
  });
});

describe('OAuth callback account protection', () => {
  function identity(changes = {}) {
    jest.spyOn(oauthService, 'verifyGoogleToken').mockResolvedValue({
      provider: 'google', providerId: 'google-subject-1', email: 'oauthrelease@example.com',
      emailVerified: true, firstName: 'OAuth', accessToken: 'private-provider-access',
      refreshToken: 'private-provider-refresh', originalUrl: '/events', ...changes
    });
  }
  const callback = () => request(app).post('/oauth/google/callback').send({ code: 'test-code', state: 'test-state' });
  const createUser = (changes = {}) => User.create({
    username: 'oauthrelease', email: 'oauthrelease@example.com', firstName: 'OAuth',
    password: 'Test-password-42!', ...changes
  });

  test('registration returns public account metadata, never provider tokens', async () => {
    identity();
    const response = await callback();
    expect(response.status).toBe(201);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(JSON.stringify(response.body)).not.toContain('private-provider');
    expect(response.body.user.oauthAccounts[0].provider).toBe('google');
    expect(await User.countDocuments()).toBe(1);
  });

  test('a second factor is required before issuing access or linking a provider', async () => {
    identity();
    const user = await createUser({ twoFactor: { isEnabled: true } });
    const response = await callback();
    expect(response.status).toBe(200);
    expect(response.body.requiresTwoFactor).toBe(true);
    expect(response.body.token).toBeUndefined();
    expect(jwtService.verifyTempToken(response.body.tempToken).id).toBe(String(user._id));
    expect((await User.findById(user._id)).oauthAccounts).toHaveLength(0);
  });

  test('inactive accounts cannot receive a session', async () => {
    identity();
    await createUser({ isActive: false });
    const response = await callback();
    expect(response.status).toBe(403);
    expect(response.body.token).toBeUndefined();
  });

  test('unverified provider email cannot auto-link an existing account', async () => {
    identity({ emailVerified: false });
    const user = await createUser();
    const response = await callback();
    expect(response.status).toBe(403);
    expect((await User.findById(user._id)).oauthAccounts).toHaveLength(0);
  });

  test('a linked provider identity remains attached when its email changes', async () => {
    identity({ email: 'changed@example.com' });
    const user = await createUser({ oauthAccounts: [{ provider: 'google', providerId: 'google-subject-1' }] });
    const response = await callback();
    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(String(user._id));
    expect(await User.countDocuments()).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain('private-provider');
  });

  test('subsequent login preserves omitted refresh credentials and other providers', async () => {
    await createUser({ oauthAccounts: [
      { provider: 'google', providerId: 'google-subject-1', refreshToken: 'retained-google-refresh' },
      { provider: 'facebook', providerId: 'facebook-subject', accessToken: 'retained-facebook-access' }
    ] });
    identity({ refreshToken: undefined });
    expect((await callback()).status).toBe(200);
    const stored = await User.findOne().select('+oauthAccounts.refreshToken +oauthAccounts.accessToken');
    expect(stored.oauthAccounts.find(a => a.provider === 'google').refreshToken).toBe('retained-google-refresh');
    expect(stored.oauthAccounts.find(a => a.provider === 'facebook').accessToken).toBe('retained-facebook-access');
    const unlinked = await User.findById(stored._id);
    await oauthService.unlinkOAuthAccount(unlinked, 'google');
    await unlinked.save();
    const remaining = await User.findById(stored._id).select('+oauthAccounts.accessToken');
    expect(remaining.oauthAccounts).toHaveLength(1);
    expect(remaining.oauthAccounts[0].accessToken).toBe('retained-facebook-access');
  });
});

test('a forged simulated Google code cannot sign in as another account outside local development', async () => {
  const victim = Buffer.from(JSON.stringify({ email: 'victim@example.com', name: 'Victim' })).toString('base64');
  for (const configured of [true, false]) {
    if (!configured) delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const state = await oauthService.generateState('google', '/');
    await expect(oauthService.verifyGoogleToken('dev_google_' + victim, state)).rejects.toThrow();
  }
  await expect(oauthService.getGoogleAuthUrl('/')).rejects.toThrow();
});
