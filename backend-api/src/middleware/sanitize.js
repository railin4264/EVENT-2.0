const logger = require('../utils/logger');

// Shared input sanitization helpers used to harden string inputs against
// stored-XSS (HTML) and NoSQL operator injection ($where, $gt, $ne, ...).

// Escape characters that have meaning in HTML so user content cannot inject markup.
function escapeHtml(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Reject/neutralize MongoDB operator keys (those starting with $) and the
// prototype-pollution keys __proto__ / constructor.
function stripNoSql(value) {
  if (Array.isArray(value)) {
    return value.map(stripNoSql);
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      if (key === '__proto__' || key === 'constructor') continue;
      if (key.startsWith('$')) continue; // drop operator keys
      cleaned[key] = stripNoSql(value[key]);
    }
    return cleaned;
  }
  return value;
}

// Express middleware: recursively sanitize all string fields of body, query and params.
function sanitizeBody(req, res, next) {
  try {
    if (req.body) req.body = stripNoSql(req.body);
    if (req.query) req.query = stripNoSql(req.query);
    if (req.params) req.params = stripNoSql(req.params);
  } catch (err) {
    logger.error('sanitizeBody error:', err);
  }
  next();
}

// Fields that must never be settable from client input (privilege escalation guard).
const FORBIDDEN_USER_FIELDS = [
  'role', 'isAdmin', 'admin', 'permissions', 'isSuperAdmin',
  'emailVerified', 'isEmailVerified', 'tokenVersion', 'passwordResetToken',
  'refreshTokens', 'twoFactorSecret', 'twoFactorEnabled', '__v'
];

// Returns a copy of `obj` with forbidden keys removed.
function stripForbiddenUserFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  FORBIDDEN_USER_FIELDS.forEach((f) => delete out[f]);
  return out;
}

module.exports = {
  escapeHtml,
  stripNoSql,
  sanitizeBody,
  stripForbiddenUserFields,
  FORBIDDEN_USER_FIELDS
};
