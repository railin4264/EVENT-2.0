const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Removed deprecated options useNewUrlParser and useUnifiedTopology
    // These are default in MongoDB driver v4.0.0+
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);

    if (process.env.NODE_ENV === 'development') {
      logger.warn('🔄 Continuing in development mode without database');
      return null;
    }

    if (process.env.NODE_ENV === 'test') {
      logger.error('❌ MongoDB connection failed in test mode');
      throw error; // Let the test framework handle the error instead of exiting
    }

    // Production/staging: a missing DB is fatal. For any other mode (dev,
    // local, undefined) keep the server up so the app can be probed even
    // before Mongo is reachable.
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      process.exit(1);
    }

    logger.warn('🔄 Continuing without database connection');
    return null;
  }
};

module.exports = connectDB;





