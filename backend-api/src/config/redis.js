const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis Connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection error:', error);
    
    // In development, continue without redis
    if (process.env.NODE_ENV === 'development') {
      logger.warn('🔄 Continuing in development mode without Redis');
      return null;
    }
    
    process.exit(1);
  }
};

const getRedisClient = () => redisClient;

module.exports = { connectRedis, getRedisClient };





