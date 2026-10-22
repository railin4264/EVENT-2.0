const crypto = require('crypto');
const jwt = require('../services/jwtService');
// This only allocates a rate budget. Protected routes still validate the live
// user, revoked tokens and sessionVersion before authorizing any operation.
function rateLimitIdentity(req) {
  const token = req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.cookies?.accessToken;
  if (token) {
    try {
      const claims = jwt.verifyAccessToken(token);
      if (typeof claims.id === 'string' && /^[a-f0-9]{24}$/i.test(claims.id)) return `user:${claims.id}`;
    } catch { /* Invalid credentials never create an authenticated budget. */ }
  }
  return `ip:${req.ip}`;
}
function authRateLimitIdentity(req) {
  const identity = rateLimitIdentity(req);
  if (identity.startsWith('user:')) return identity;
  const raw = req.body?.email || req.body?.username;
  const account = typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 254) : '';
  return account ? `account:${crypto.createHash('sha256').update(`${req.ip}:${account}`).digest('hex')}` : identity;
}
function rateBudget(raw, fallback) {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 20 && value <= 10000 ? value : fallback;
}
module.exports = { rateLimitIdentity, authRateLimitIdentity, rateBudget };
