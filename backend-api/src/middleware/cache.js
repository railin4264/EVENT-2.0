const logger = require('../utils/logger');

// In-memory response cache used to set a custom `x-cache` header (HIT/MISS) on
// read-only GET endpoints so clients and tests can observe caching behavior.
const store = new Map();

function makeCache(ttlSeconds = 30) {
  const ttl = ttlSeconds * 1000;

  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    // Attendance, orders and permissions can change between two reads.
    // A user-specific cache key alone does not make stale permissions safe.
    if (req.user) {
      res.vary('Authorization');
      res.set('Cache-Control', 'private, no-store');
      res.set('x-cache', 'BYPASS');
      return next();
    }

    // Event responses include attendance/favorites and age-restricted content.
    // Never reuse one user's response for a different user or a public visitor.
    const identity = req.user ? `${req.user._id || req.user.id}:${req.user.age ?? 'unknown'}` : 'anonymous';
    const key = `${identity}:${req.originalUrl || req.url}:u=${req.user?.id || 'anon'}`;
    const cacheControl = req.user ? 'private, no-store' : `public, max-age=${ttlSeconds}`;
    res.vary('Authorization');
    const cached = store.get(key);

    if (cached && Date.now() - cached.ts < ttl) {
      res.set('x-cache', 'HIT');
      res.set('Cache-Control', cacheControl);
      return res.status(cached.status).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(key, { ts: Date.now(), status: res.statusCode, body });
      }
      res.set('x-cache', 'MISS');
      res.set('Cache-Control', cacheControl);
      return originalJson(body);
    };

    next();
  };
}

// Named caches referenced by src/routes/events.js and src/routes/tribes.js
const eventListCache = makeCache(30);
const eventDetailsCache = makeCache(60);
const tribeListCache = makeCache(30);
const tribeDetailsCache = makeCache(60);

// Invalidates all cached entries (call after mutations)
function invalidateCache() {
  store.clear();
}

module.exports = {
  eventListCache,
  eventDetailsCache,
  tribeListCache,
  tribeDetailsCache,
  invalidateCache,
  makeCache
};
