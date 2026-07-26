const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transport configurations
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat,
    handleExceptions: true
  }),

  // File transport for all logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'eventconnect-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    handleExceptions: true
  }),

  // Error-only file transport
  new DailyRotateFile({
    filename: path.join(logsDir, 'eventconnect-error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    handleExceptions: true
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'eventconnect-api',
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exceptionHandlers: transports,
  rejectionHandlers: transports,
  exitOnError: false
});

// Enhanced logging methods
logger.request = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || 'anonymous'
  };

  if (res.statusCode >= 400) {
    logger.error('HTTP Request Failed', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

logger.auth = (action, userId, email, success = true, details = {}) => {
  logger.info('Authentication Event', {
    action,
    userId,
    email,
    success,
    ...details
  });
};

logger.business = (event, data = {}) => {
  logger.info('Business Event', {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.performance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, 'Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...details
  });
};

logger.security = (event, level = 'warn', details = {}) => {
  logger.log(level, 'Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Database operation logging
logger.db = (operation, collection, query = {}, result = {}) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    query: JSON.stringify(query),
    resultCount: result.length || result.modifiedCount || result.deletedCount || 'unknown'
  });
};

// Socket.IO logging
logger.socket = (event, socketId, userId, data = {}) => {
  logger.info('Socket Event', {
    event,
    socketId,
    userId,
    ...data
  });
};

module.exports = logger;