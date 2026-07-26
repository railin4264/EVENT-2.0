const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      // Do not auto-reconnect in the background; if Redis is down we operate
      // without it instead of hammering reconnection attempts.
      socket: { reconnectStrategy: false }
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis client error (continuing without Redis):', err.message);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis Connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn('❌ Redis connection failed, continuing without Redis:', error.message);
    redisClient = null;
    // Never crash the process because Redis is unavailable (tests, degraded
    // production, local dev). The app must keep working without cache.
    return null;
  }
};

const getRedisClient = () => redisClient;

module.exports = { connectRedis, getRedisClient };





