const winston = require('winston');
const path = require('path');

class MonitoringConfig {
  constructor() {
    this.logger = null;
    this.sentry = null;
    this.newRelic = null;
    this.init();
  }

  init() {
    this.setupLogger();
    this.setupSentry();
    this.setupNewRelic();
  }

  setupLogger() {
    try {
      const logFormat = winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      );

      const transports = [
        // Console transport
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'info',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ];

      // File transport for production
      if (process.env.NODE_ENV === 'production') {
        transports.push(
          new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
          }),
          new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
          })
        );
      }

      this.logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        transports,
        exitOnError: false
      });

      console.log('✅ Winston logger configured successfully');
    } catch (error) {
      console.error('❌ Error configuring Winston logger:', error.message);
    }
  }

  setupSentry() {
    try {
      if (process.env.SENTRY_DSN) {
        const Sentry = require('@sentry/node');
        
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          integrations: [
            new Sentry.Integrations.Http({ tracing: true }),
            new Sentry.Integrations.Express({ app: require('express') }),
          ],
        });

        this.sentry = Sentry;
        console.log('✅ Sentry configured successfully');
      } else {
        console.log('⚠️  Sentry not configured - SENTRY_DSN not found');
      }
    } catch (error) {
      console.error('❌ Error configuring Sentry:', error.message);
    }
  }

  setupNewRelic() {
    try {
      if (process.env.NEW_RELIC_LICENSE_KEY) {
        require('newrelic');
        this.newRelic = true;
        console.log('✅ New Relic configured successfully');
      } else {
        console.log('⚠️  New Relic not configured - NEW_RELIC_LICENSE_KEY not found');
      }
    } catch (error) {
      console.error('❌ Error configuring New Relic:', error.message);
    }
  }

  // Logger methods
  info(message, meta = {}) {
    if (this.logger) {
      this.logger.info(message, meta);
    }
  }

  error(message, error = null, meta = {}) {
    if (this.logger) {
      this.logger.error(message, { error: error?.stack || error, ...meta });
    }

    // Send to Sentry
    if (this.sentry && error) {
      this.sentry.captureException(error, {
        tags: meta,
        level: 'error'
      });
    }
  }

  warn(message, meta = {}) {
    if (this.logger) {
      this.logger.warn(message, meta);
    }
  }

  debug(message, meta = {}) {
    if (this.logger) {
      this.logger.debug(message, meta);
    }
  }

  // Performance monitoring
  startTransaction(name, op = 'custom') {
    if (this.sentry) {
      return this.sentry.startTransaction({
        name,
        op,
      });
    }
    return null;
  }

  // Custom metrics
  recordMetric(name, value, tags = {}) {
    if (this.newRelic) {
      // New Relic custom metrics
      const newrelic = require('newrelic');
      newrelic.recordMetric(`Custom/${name}`, value);
    }

    // Log metric for other monitoring systems
    this.info(`Metric: ${name}`, { value, tags });
  }

  // Health check
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
        external_apis: 'unknown'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    try {
      // Check database
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        health.services.database = 'healthy';
      } else {
        health.services.database = 'unhealthy';
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Check Redis
      if (!process.env.REDIS_URL) {
        // No Redis configured (tests / degraded mode): skip the ping
        // rather than letting the client fall back to localhost:6379
        // and spam reconnect attempts.
        health.services.redis = 'unhealthy';
        health.status = health.status === 'healthy' ? 'degraded' : health.status;
      } else {
        const redis = require('redis');
        const client = redis.createClient(process.env.REDIS_URL);
        await client.ping();
        health.services.redis = 'healthy';
        client.quit();
      }
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
    }

    // Check external APIs
    try {
      const axios = require('axios');
      const responses = await Promise.allSettled([
        axios.get('https://api.stripe.com/v1/charges', {
          headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
          timeout: 5000
        }).catch(() => null),
        axios.get('https://api.cloudinary.com/v1_1/test/resources', {
          timeout: 5000
        }).catch(() => null)
      ]);

      const healthyAPIs = responses.filter(r => r.status === 'fulfilled').length;
      health.services.external_apis = healthyAPIs > 0 ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.services.external_apis = 'unhealthy';
    }

    return health;
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id
        };

        if (res.statusCode >= 400) {
          this.error('HTTP Request Error', null, logData);
        } else {
          this.info('HTTP Request', logData);
        }

        // Record performance metric
        this.recordMetric('http_request_duration', duration, {
          method: req.method,
          status: res.statusCode.toString(),
          route: req.route?.path || req.url
        });
      });

      next();
    };
  }

  // Error tracking
  trackError(error, context = {}) {
    this.error('Application Error', error, context);
    
    if (this.sentry) {
      this.sentry.captureException(error, {
        tags: context,
        level: 'error'
      });
    }
  }

  // Business metrics
  trackEvent(eventName, properties = {}) {
    this.info(`Business Event: ${eventName}`, properties);
    
    if (this.newRelic) {
      const newrelic = require('newrelic');
      newrelic.recordCustomEvent(eventName, properties);
    }
  }

  trackUserAction(userId, action, properties = {}) {
    this.trackEvent('user_action', {
      userId,
      action,
      ...properties
    });
  }

  trackAPICall(endpoint, method, duration, statusCode) {
    this.recordMetric('api_call_duration', duration, {
      endpoint,
      method,
      status: statusCode.toString()
    });
  }
}

module.exports = new MonitoringConfig();
















