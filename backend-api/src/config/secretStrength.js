'use strict';

// Template values copied from env files ("your-super-secret...", "change_me", "TODO")
// would let anyone sign valid tokens. Production refuses to start with them.
const PLACEHOLDER = /your|change|example|todo|placeholder|secret[-_]?key|default|test|xxx/i;

function weakSecretReasons(env = process.env) {
  const reasons = [];
  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = env[name] || '';
    if (value.length < 32) reasons.push(`${name} debe tener al menos 32 caracteres`);
    else if (PLACEHOLDER.test(value)) reasons.push(`${name} parece un valor de plantilla`);
  }
  if (env.JWT_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) reasons.push('JWT_SECRET y JWT_REFRESH_SECRET deben ser distintos');
  return reasons;
}

module.exports = { weakSecretReasons };
