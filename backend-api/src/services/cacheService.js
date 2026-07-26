/**
 * Redis Caching Service for EventConnect 2.0
 * Provides comprehensive caching functionality with Redis
 */

const Redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 5;

    // Cache configuration
    this.defaultTTL = parseInt(process.env.CACHE_TTL_MEDIUM) || 3600; // 1 hour
    this.shortTTL = parseInt(process.env.CACHE_TTL_SHORT) || 300; // 5 minutes
    this.longTTL = parseInt(process.env.CACHE_TTL_LONG) || 86400; // 24 hours
  }

  async connect() {
    // Redis is OPTIONAL. If no REDIS_URL is configured, stay disconnected and
    // never attempt a connection (avoids background reconnection attempts that
    // surface as unhandled AggregateError rejections in tests/CI).
    if (!process.env.REDIS_URL) {
      this.isConnected = false;
      this.client = null;
      return null;
    }

    try {
      if (this.isConnected && this.client) {
        return this.client;
      }

      const redisConfig = {
        url: process.env.REDIS_URL,
        socket: {
          // Do not auto-reconnect in the background — if Redis is down we
          // degrade to no-cache instead of hammering reconnection.
          reconnectStrategy: false
        }
      };

      this.client = Redis.createClient(redisConfig);

      this.client.on('error', (err) => {
        // Swallow connection errors so they never become unhandled rejections.
        logger.warn('Redis client error (cache disabled):', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
        this.retryAttempts = 0;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
        this.isConnected = true;
      });

      await this.client.connect();
      return this.client;

    } catch (error) {
      // Redis is optional: never crash the app (or test runs) when it is
      // unavailable. Callers already guard with this.isConnected / try-catch
      // and degrade gracefully (cache miss → recompute from DB).
      logger.warn('Redis unavailable, continuing without cache:', error.message);
      this.isConnected = false;
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis Client Disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  // Basic cache operations
  async get(key, defaultValue = null) {
    if (!this.isConnected) {
      return defaultValue;
    }
    try {
      const value = await this.client.get(this.formatKey(key));
      if (value === null) {
        logger.debug(`Cache miss for key: ${key}`);
        return defaultValue;
      }

      logger.debug(`Cache hit for key: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return defaultValue;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.isConnected) {
      return false;
    }
    try {
      const serializedValue = JSON.stringify(value);
      const formattedKey = this.formatKey(key);
      const cacheTTL = ttl || this.defaultTTL;

      await this.client.setEx(formattedKey, cacheTTL, serializedValue);
      logger.debug(`Cache set for key: ${key}, TTL: ${cacheTTL}s`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      return false;
    }
    try {
      const result = await this.client.del(this.formatKey(key));
      logger.debug(`Cache delete for key: ${key}, result: ${result}`);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) {
      return false;
    }
    try {
      const result = await this.client.exists(this.formatKey(key));
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isConnected) {
      return false;
    }
    try {
      const result = await this.client.expire(this.formatKey(key), ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  // Pattern-based operations
  async deletePattern(pattern) {
    if (!this.isConnected) {
      return false;
    }
    try {
      const keys = await this.client.keys(this.formatKey(pattern));

      if (keys.length > 0) {
        const result = await this.client.del(keys);
        logger.debug(`Cache delete pattern ${pattern}: ${result} keys deleted`);
        return result;
      }
      return 0;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async getKeysPattern(pattern) {
    if (!this.isConnected) {
      return [];
    }
    try {
      return await this.client.keys(this.formatKey(pattern));
    } catch (error) {
      logger.error(`Cache get keys pattern error for ${pattern}:`, error);
      return [];
    }
  }

  // Hash operations
  async hget(key, field) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const value = await this.client.hGet(this.formatKey(key), field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache hget error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hset(key, field, value, ttl = null) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const formattedKey = this.formatKey(key);
      await this.client.hSet(formattedKey, field, JSON.stringify(value));

      if (ttl) {
        await this.client.expire(formattedKey, ttl);
      }

      return true;
    } catch (error) {
      logger.error(`Cache hset error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hgetall(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const hash = await this.client.hGetAll(this.formatKey(key));
      const result = {};

      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }

      return result;
    } catch (error) {
      logger.error(`Cache hgetall error for key ${key}:`, error);
      return {};
    }
  }

  // List operations
  async lpush(key, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      return await this.client.lPush(this.formatKey(key), JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache lpush error for key ${key}:`, error);
      return 0;
    }
  }

  async rpush(key, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      return await this.client.rPush(this.formatKey(key), JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache rpush error for key ${key}:`, error);
      return 0;
    }
  }

  async lrange(key, start = 0, stop = -1) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const values = await this.client.lRange(this.formatKey(key), start, stop);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      logger.error(`Cache lrange error for key ${key}:`, error);
      return [];
    }
  }

  // Set operations
  async sadd(key, member) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      return await this.client.sAdd(this.formatKey(key), JSON.stringify(member));
    } catch (error) {
      logger.error(`Cache sadd error for key ${key}:`, error);
      return 0;
    }
  }

  async smembers(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const members = await this.client.sMembers(this.formatKey(key));
      return members.map(member => JSON.parse(member));
    } catch (error) {
      logger.error(`Cache smembers error for key ${key}:`, error);
      return [];
    }
  }

  async sismember(key, member) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      return await this.client.sIsMember(this.formatKey(key), JSON.stringify(member));
    } catch (error) {
      logger.error(`Cache sismember error for key ${key}:`, error);
      return false;
    }
  }

  // High-level caching methods
  async cacheUser(userId, userData, ttl = null) {
    return await this.set(`user:${userId}`, userData, ttl || this.longTTL);
  }

  async getCachedUser(userId) {
    return await this.get(`user:${userId}`);
  }

  async invalidateUser(userId) {
    await this.del(`user:${userId}`);
    await this.deletePattern(`user:${userId}:*`);
  }

  async cacheEvent(eventId, eventData, ttl = null) {
    return await this.set(`event:${eventId}`, eventData, ttl || this.defaultTTL);
  }

  async getCachedEvent(eventId) {
    return await this.get(`event:${eventId}`);
  }

  async invalidateEvent(eventId) {
    await this.del(`event:${eventId}`);
    await this.deletePattern(`event:${eventId}:*`);
    await this.deletePattern('events:*'); // Invalidate event lists
  }

  async cacheTribe(tribeId, tribeData, ttl = null) {
    return await this.set(`tribe:${tribeId}`, tribeData, ttl || this.defaultTTL);
  }

  async getCachedTribe(tribeId) {
    return await this.get(`tribe:${tribeId}`);
  }

  async invalidateTribe(tribeId) {
    await this.del(`tribe:${tribeId}`);
    await this.deletePattern(`tribe:${tribeId}:*`);
    await this.deletePattern('tribes:*'); // Invalidate tribe lists
  }

  // Session management
  async setSession(sessionId, sessionData, ttl = 86400) {
    return await this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async incrementRateLimit(key, window = 3600) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const rateLimitKey = this.formatKey(`rate_limit:${key}`);
      const current = await this.client.incr(rateLimitKey);

      if (current === 1) {
        await this.client.expire(rateLimitKey, window);
      }

      return current;
    } catch (error) {
      logger.error(`Rate limit increment error for key ${key}:`, error);
      return 0;
    }
  }

  async getRateLimit(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const value = await this.client.get(this.formatKey(`rate_limit:${key}`));
      return value ? parseInt(value) : 0;
    } catch (error) {
      logger.error(`Rate limit get error for key ${key}:`, error);
      return 0;
    }
  }

  // Utility methods
  formatKey(key) {
    const prefix = process.env.REDIS_KEY_PREFIX || 'eventconnect';
    return `${prefix}:${key}`;
  }

  async flushAll() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.client.flushAll();
      logger.warn('All cache keys have been flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush all error:', error);
      return false;
    }
  }

  async getInfo() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Cache info error:', error);
      return null;
    }
  }

  async getStats() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const info = await this.client.info('stats');
      const keyspace = await this.client.info('keyspace');

      return {
        info,
        keyspace,
        isConnected: this.isConnected,
        retryAttempts: this.retryAttempts
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return {
        isConnected: this.isConnected,
        retryAttempts: this.retryAttempts,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;