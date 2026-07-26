/**
 * Cache Middleware for EventConnect 2.0
 * Provides caching functionality for Express routes
 */

const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Cache middleware factory
 * @param {Object} options - Cache configuration options
 * @param {number} options.ttl - Time to live in seconds
 * @param {string} options.keyGenerator - Function to generate cache key
 * @param {boolean} options.private - Whether cache is user-specific
 * @param {Array} options.varyBy - Headers to vary cache by
 * @param {Function} options.skip - Function to determine if caching should be skipped
 */
const cache = (options = {}) => {
  const {
    ttl = 3600, // 1 hour default
    keyGenerator = null,
    isPrivate = false,
    varyBy = [],
    skip = null,
    invalidatePattern = null
  } = options;

  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests by default
      if (req.method !== 'GET') {
        return next();
      }

      // Skip if custom skip function returns true
      if (skip && skip(req)) {
        return next();
      }

      // Generate cache key
      const cacheKey = generateCacheKey(req, keyGenerator, isPrivate, varyBy);

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);

        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `max-age=${ttl}, ${isPrivate ? 'private' : 'public'}`
        });

        return res.json(cachedData);
      }

      logger.debug(`Cache miss for key: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache the response
          cacheService.set(cacheKey, data, ttl).catch(error => {
            logger.error('Error caching response:', error);
          });

          // Set cache headers
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'Cache-Control': `max-age=${ttl}, ${isPrivate ? 'private' : 'public'}`
          });
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      // Add cache key to request for potential invalidation
      req.cacheKey = cacheKey;
      req.invalidatePattern = invalidatePattern;

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Generate cache key based on request
 */
function generateCacheKey(req, keyGenerator, isPrivate, varyBy) {
  if (keyGenerator) {
    return keyGenerator(req);
  }

  let key = `${req.method}:${req.path}`;

  // Add query parameters
  if (Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map(k => `${k}=${req.query[k]}`)
      .join('&');
    key += `?${sortedQuery}`;
  }

  // Add user ID for private caches
  if (isPrivate && req.user) {
    key = `user:${req.user._id}:${key}`;
  }

  // Add vary headers
  if (varyBy.length > 0) {
    const varyValues = varyBy
      .map(header => `${header}:${req.get(header) || ''}`)
      .join(':');
    key += `:${varyValues}`;
  }

  return key;
}

/**
 * Cache invalidation middleware
 */
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    try {
      if (Array.isArray(patterns)) {
        for (const pattern of patterns) {
          const resolvedPattern = typeof pattern === 'function' ? pattern(req) : pattern;
          await cacheService.deletePattern(resolvedPattern);
          logger.debug(`Invalidated cache pattern: ${resolvedPattern}`);
        }
      } else {
        const resolvedPattern = typeof patterns === 'function' ? patterns(req) : patterns;
        await cacheService.deletePattern(resolvedPattern);
        logger.debug(`Invalidated cache pattern: ${resolvedPattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }

    next();
  };
};

/**
 * Pre-configured cache middlewares for common use cases
 */

// Short-term cache (5 minutes) for frequently changing data
const shortCache = cache({ ttl: 300 });

// Medium-term cache (1 hour) for moderately changing data
const mediumCache = cache({ ttl: 3600 });

// Long-term cache (24 hours) for rarely changing data
const longCache = cache({ ttl: 86400 });

// User-specific cache (private)
const userCache = (ttl = 3600) => cache({ ttl, isPrivate: true });

// Event list cache with pagination
const eventListCache = cache({
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => {
    const { page = 1, limit = 20, category, location, search } = req.query;
    return `events:list:p${page}:l${limit}:c${category || 'all'}:loc${location || 'all'}:s${search || 'none'}`;
  }
});

// Tribe list cache
const tribeListCache = cache({
  ttl: 3600, // 1 hour
  keyGenerator: (req) => {
    const { page = 1, limit = 20, category, location } = req.query;
    return `tribes:list:p${page}:l${limit}:c${category || 'all'}:loc${location || 'all'}`;
  }
});

// User profile cache
const userProfileCache = cache({
  ttl: 1800, // 30 minutes
  isPrivate: true,
  keyGenerator: (req) => `user:profile:${req.params.userId || req.user._id}`
});

// Event details cache
const eventDetailsCache = cache({
  ttl: 900, // 15 minutes
  keyGenerator: (req) => `event:details:${req.params.eventId}`
});

// Tribe details cache
const tribeDetailsCache = cache({
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => `tribe:details:${req.params.tribeId}`
});

// Search results cache
const searchCache = cache({
  ttl: 600, // 10 minutes
  keyGenerator: (req) => {
    const { q, type, location, page = 1 } = req.query;
    return `search:${type || 'all'}:${q}:loc${location || 'all'}:p${page}`;
  }
});

// Feed cache (user-specific)
const feedCache = cache({
  ttl: 300, // 5 minutes
  isPrivate: true,
  keyGenerator: (req) => {
    const { page = 1, limit = 20 } = req.query;
    return `feed:${req.user._id}:p${page}:l${limit}`;
  }
});

// Notifications cache (user-specific)
const notificationsCache = cache({
  ttl: 60, // 1 minute
  isPrivate: true,
  keyGenerator: (req) => `notifications:${req.user._id}`
});

// Cache warming function
const warmCache = async (key, dataFetcher, ttl = 3600) => {
  try {
    const exists = await cacheService.exists(key);
    if (!exists) {
      const data = await dataFetcher();
      await cacheService.set(key, data, ttl);
      logger.info(`Cache warmed for key: ${key}`);
    }
  } catch (error) {
    logger.error(`Cache warming error for key ${key}:`, error);
  }
};

// Cache statistics middleware
const cacheStats = async (req, res, next) => {
  try {
    const stats = await cacheService.getStats();
    res.locals.cacheStats = stats;
  } catch (error) {
    logger.error('Error getting cache stats:', error);
  }
  next();
};

module.exports = {
  cache,
  invalidateCache,
  warmCache,
  cacheStats,

  // Pre-configured middlewares
  shortCache,
  mediumCache,
  longCache,
  userCache,
  eventListCache,
  tribeListCache,
  userProfileCache,
  eventDetailsCache,
  tribeDetailsCache,
  searchCache,
  feedCache,
  notificationsCache
};