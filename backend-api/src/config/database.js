const mongoose = require('mongoose');
const logger = require('../utils/logger');
const boundedInteger = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};
const connectDB = async () => {
  const deployed = ['production', 'staging'].includes(process.env.NODE_ENV);
  if (deployed && !process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  // An explicit URI must never fall back to another database.
  const uris = process.env.MONGODB_URI ? [process.env.MONGODB_URI] :
    ['mongodb://localhost:27017/eventconnect', 'mongodb://127.0.0.1:27017/eventconnect'];
  for (const uri of uris) {
    try {
      const conn = await mongoose.connect(uri, {
        autoIndex: !deployed,
        serverSelectionTimeoutMS: 4000, connectTimeoutMS: 5000,
        maxPoolSize: boundedInteger(process.env.MONGO_MAX_POOL_SIZE, 20, 1, 200),
        minPoolSize: 0, waitQueueTimeoutMS: 5000, maxIdleTimeMS: 60000
      });
      logger.info('MongoDB connected');
      return conn;
    } catch (error) {
      // Driver messages can contain credentials. Log only a bounded safe code.
      logger.warn('MongoDB connection failed', { code: String(error.code || error.name || 'connection_error').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) });
    }
  }
  if (deployed || process.env.NODE_ENV === 'test') throw new Error('MongoDB connection unavailable');
  logger.warn('Continuing development without database');
  return null;
};
module.exports = connectDB;
