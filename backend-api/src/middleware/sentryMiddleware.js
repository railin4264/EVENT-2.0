/**
 * Sentry Middleware for EventConnect 2.0
 * Provides enhanced error tracking and performance monitoring
 */

const sentryConfig = require('../config/sentry');
const logger = require('../utils/logger');

/**
 * Middleware to set user context for Sentry
 */
const setSentryUser = (req, res, next) => {
  try {
    if (req.user && sentryConfig.initialized) {
      sentryConfig.setUser({
        id: req.user._id || req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      });

      // Add user breadcrumb
      sentryConfig.addBreadcrumb({
        message: 'User authenticated',
        category: 'auth',
        level: 'info',
        data: {
          userId: req.user._id || req.user.id,
          username: req.user.username,
          role: req.user.role
        }
      });
    }
  } catch (error) {
    logger.error('Error setting Sentry user context:', error);
  }

  next();
};

/**
 * Middleware to track API endpoint performance
 */
const trackApiPerformance = (routeName) => {
  return (req, res, next) => {
    if (!sentryConfig.initialized) {
      return next();
    }

    try {
      const transaction = sentryConfig.startTransaction(
        `${req.method} ${routeName || req.route?.path || req.path}`,
        'http.server'
      );

      if (transaction) {
        // Add request context
        transaction.setData('url', req.url);
        transaction.setData('method', req.method);
        transaction.setData('query', req.query);
        transaction.setData('user_agent', req.get('User-Agent'));
        transaction.setData('ip', req.ip);

        // Add user context if available
        if (req.user) {
          transaction.setData('user_id', req.user._id || req.user.id);
          transaction.setData('user_role', req.user.role);
        }

        // Store transaction in request for later use
        req.sentryTransaction = transaction;

        // Finish transaction when response ends
        res.on('finish', () => {
          try {
            transaction.setHttpStatus(res.statusCode);
            transaction.setData('response_size', res.get('Content-Length'));
            transaction.finish();
          } catch (error) {
            logger.error('Error finishing Sentry transaction:', error);
          }
        });

        // Handle response errors
        res.on('error', (error) => {
          try {
            transaction.setStatus('internal_error');
            sentryConfig.captureException(error, {
              tags: {
                component: 'api_response',
                endpoint: routeName || req.path
              }
            });
            transaction.finish();
          } catch (err) {
            logger.error('Error handling response error in Sentry:', err);
          }
        });
      }
    } catch (error) {
      logger.error('Error in Sentry performance tracking:', error);
    }

    next();
  };
};

/**
 * Middleware to add breadcrumbs for important actions
 */
const addActionBreadcrumb = (action, category = 'action') => {
  return (req, res, next) => {
    try {
      if (sentryConfig.initialized) {
        const breadcrumbData = {
          message: action,
          category,
          level: 'info',
          data: {
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
          }
        };

        // Add user info if available
        if (req.user) {
          breadcrumbData.data.user_id = req.user._id || req.user.id;
          breadcrumbData.data.username = req.user.username;
        }

        // Add relevant request data
        if (req.params && Object.keys(req.params).length > 0) {
          breadcrumbData.data.params = req.params;
        }

        sentryConfig.addBreadcrumb(breadcrumbData);
      }
    } catch (error) {
      logger.error('Error adding Sentry breadcrumb:', error);
    }

    next();
  };
};

/**
 * Middleware to capture specific errors with context
 */
const captureErrorWithContext = (error, req, additionalContext = {}) => {
  try {
    if (!sentryConfig.initialized) {
      return;
    }

    const context = {
      user: req.user ? {
        id: req.user._id || req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      } : null,
      tags: {
        component: 'api',
        endpoint: req.path,
        method: req.method,
        status_code: error.status || error.statusCode || 500,
        ...additionalContext.tags
      },
      extra: {
        url: req.url,
        headers: req.headers,
        query: req.query,
        body: req.body,
        params: req.params,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        ...additionalContext.extra
      },
      level: error.status >= 500 ? 'error' : 'warning'
    };

    sentryConfig.captureException(error, context);
  } catch (err) {
    logger.error('Error capturing exception in Sentry:', err);
  }
};

/**
 * Middleware for database operation monitoring
 */
const trackDatabaseOperation = (operation) => {
  return (req, res, next) => {
    try {
      if (sentryConfig.initialized) {
        sentryConfig.addBreadcrumb({
          message: `Database operation: ${operation}`,
          category: 'database',
          level: 'info',
          data: {
            operation,
            endpoint: req.path,
            user_id: req.user?._id || req.user?.id
          }
        });
      }
    } catch (error) {
      logger.error('Error tracking database operation:', error);
    }

    next();
  };
};

/**
 * Middleware for payment operation monitoring
 */
const trackPaymentOperation = (operation) => {
  return (req, res, next) => {
    try {
      if (sentryConfig.initialized) {
        // Set high priority tags for payment operations
        sentryConfig.setTag('payment_operation', operation);
        sentryConfig.setTag('critical_path', 'payment');

        sentryConfig.addBreadcrumb({
          message: `Payment operation: ${operation}`,
          category: 'payment',
          level: 'info',
          data: {
            operation,
            endpoint: req.path,
            user_id: req.user?._id || req.user?.id,
            timestamp: new Date().toISOString()
          }
        });

        // Ensure 100% sampling for payment operations
        if (req.sentryTransaction) {
          req.sentryTransaction.sampled = true;
        }
      }
    } catch (error) {
      logger.error('Error tracking payment operation:', error);
    }

    next();
  };
};

/**
 * Middleware for security event monitoring
 */
const trackSecurityEvent = (eventType) => {
  return (req, res, next) => {
    try {
      if (sentryConfig.initialized) {
        sentryConfig.setTag('security_event', eventType);

        sentryConfig.addBreadcrumb({
          message: `Security event: ${eventType}`,
          category: 'security',
          level: 'warning',
          data: {
            event_type: eventType,
            endpoint: req.path,
            ip: req.ip,
            user_agent: req.get('User-Agent'),
            user_id: req.user?._id || req.user?.id,
            timestamp: new Date().toISOString()
          }
        });

        // Capture as message for important security events
        if (['login_failure', 'suspicious_activity', 'rate_limit_exceeded'].includes(eventType)) {
          sentryConfig.captureMessage(`Security event: ${eventType}`, 'warning', {
            tags: {
              security_event: eventType,
              endpoint: req.path
            },
            extra: {
              ip: req.ip,
              user_agent: req.get('User-Agent'),
              user_id: req.user?._id || req.user?.id
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error tracking security event:', error);
    }

    next();
  };
};

/**
 * Middleware to measure custom metrics
 */
const measureCustomMetric = (metricName, getValue) => {
  return (req, res, next) => {
    try {
      if (sentryConfig.initialized) {
        const startTime = Date.now();

        res.on('finish', () => {
          try {
            const duration = Date.now() - startTime;
            const value = getValue ? getValue(req, res) : duration;

            sentryConfig.addBreadcrumb({
              message: `Metric: ${metricName}`,
              category: 'metric',
              level: 'info',
              data: {
                metric_name: metricName,
                value,
                duration,
                endpoint: req.path
              }
            });
          } catch (error) {
            logger.error('Error measuring custom metric:', error);
          }
        });
      }
    } catch (error) {
      logger.error('Error setting up custom metric measurement:', error);
    }

    next();
  };
};

module.exports = {
  setSentryUser,
  trackApiPerformance,
  addActionBreadcrumb,
  captureErrorWithContext,
  trackDatabaseOperation,
  trackPaymentOperation,
  trackSecurityEvent,
  measureCustomMetric
};