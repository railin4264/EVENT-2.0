const logger = require('../utils/advancedLogger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const start = process.hrtime.bigint();

  // Log incoming request
  logger.info('Incoming Request', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const hrDuration = process.hrtime.bigint() - start;
    const microseconds = Number(hrDuration / 1000n);

    // Log request completion
    logger.request(req, res, duration);

    // Performance monitoring
    if (duration > 1000) {
      logger.performance('Slow Request', duration, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        microseconds
      });
    }

    // Security monitoring
    if (res.statusCode === 401) {
      logger.security('Unauthorized Access Attempt', 'warn', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
    }

    if (res.statusCode === 403) {
      logger.security('Forbidden Access Attempt', 'warn', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userId: req.user?.id,
        userAgent: req.get('User-Agent')
      });
    }

    if (res.statusCode >= 500) {
      logger.error('Server Error Response', {
        statusCode: res.statusCode,
        method: req.method,
        url: req.url,
        duration: duration,
        ip: req.ip,
        userId: req.user?.id
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Rate limiting event logger
const rateLimitLogger = (req, res, next) => {
  const originalStatus = res.status;
  res.status = function(statusCode) {
    if (statusCode === 429) {
      logger.security('Rate Limit Exceeded', 'warn', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });
    }
    return originalStatus.call(this, statusCode);
  };
  next();
};

module.exports = {
  requestLogger,
  rateLimitLogger
};