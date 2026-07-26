/**
 * Sentry Configuration for EventConnect 2.0
 * Provides error monitoring and performance tracking
 */

const Sentry = require('@sentry/node');
// const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('../utils/logger');

class SentryConfig {
  constructor() {
    this.isInitialized = false;
    this.environment = process.env.NODE_ENV || 'development';
    this.dsn = process.env.SENTRY_DSN;
    this.release = process.env.APP_VERSION || '2.0.0';
  }

  /**
   * Initialize Sentry with configuration
   */
  initialize() {
    try {
      if (!this.dsn) {
        console.log('⚠️ Sentry DSN not configured, error monitoring disabled');
        return false;
      }

      Sentry.init({
        dsn: this.dsn,
        environment: this.environment,
        release: `eventconnect@${this.release}`,

        // Performance monitoring
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,

        // Profiling
        profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1,

        // Integrations
        integrations: [
          // Performance profiling
          // new ProfilingIntegration(), // Disabled temporarily

          // HTTP request tracking
          new Sentry.Integrations.Http({ tracing: true }),

          // Express integration
          new Sentry.Integrations.Express({ app: null }), // App will be set later

          // Console integration (captures console.error)
          new Sentry.Integrations.Console({ levels: ['error'] }),

          // OnUnhandledRejection
          new Sentry.Integrations.OnUnhandledRejection({ mode: 'warn' }),

          // OnUncaughtException
          new Sentry.Integrations.OnUncaughtException({
            exitEvenIfOtherHandlersAreRegistered: false
          })
        ],

        // Error filtering
        beforeSend(event, hint) {
          // Don't send errors in development unless explicitly enabled
          if (this.environment === 'development' && !process.env.SENTRY_SEND_DEV_ERRORS) {
            return null;
          }

          // Filter out specific errors
          if (event.exception) {
            const error = hint.originalException;

            // Don't send validation errors
            if (error?.name === 'ValidationError') {
              return null;
            }

            // Don't send JWT errors (these are often expected)
            if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
              return null;
            }

            // Don't send rate limit errors
            if (error?.message?.includes('Rate limit')) {
              return null;
            }

            // Don't send authentication errors (401)
            if (error?.status === 401) {
              return null;
            }
          }

          return event;
        },

        // Performance sampling
        tracesSampler(samplingContext) {
          // Higher sampling for important operations
          const transactionName = samplingContext.transactionContext.name;

          if (transactionName?.includes('/api/auth/')) {
            return 0.5; // 50% sampling for auth operations
          }

          if (transactionName?.includes('/api/events/')) {
            return 0.3; // 30% sampling for event operations
          }

          if (transactionName?.includes('/api/payments/')) {
            return 1.0; // 100% sampling for payment operations
          }

          // Default sampling rate
          return parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1;
        },

        // Additional configuration
        maxBreadcrumbs: 50,
        debug: this.environment === 'development',
        attachStacktrace: true,
        sendDefaultPii: false, // Don't send personally identifiable information

        // Server name
        serverName: process.env.SERVER_NAME || 'eventconnect-api',

        // Tags
        initialScope: {
          tags: {
            component: 'backend-api',
            version: this.release,
            environment: this.environment
          },
          user: {
            id: 'system'
          }
        }
      });

      this.isInitialized = true;
      console.log(`✅ Sentry initialized for ${this.environment} environment`);
      logger.info('Sentry error monitoring initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
      logger.error('Sentry initialization failed:', error);
      return false;
    }
  }

  /**
   * Configure Sentry for Express app
   */
  configureExpress(app) {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Request handler must be the first middleware
      app.use(Sentry.Handlers.requestHandler());

      // TracingHandler creates a trace for every incoming request
      app.use(Sentry.Handlers.tracingHandler());

      console.log('✅ Sentry Express middleware configured');
    } catch (error) {
      console.error('❌ Failed to configure Sentry Express middleware:', error);
      logger.error('Sentry Express configuration failed:', error);
    }
  }

  /**
   * Configure Sentry error handler for Express
   */
  configureErrorHandler(app) {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Error handler must be registered before any other error middleware
      app.use(Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
          // Capture all server errors
          return error.status >= 500;
        }
      }));

      console.log('✅ Sentry error handler configured');
    } catch (error) {
      console.error('❌ Failed to configure Sentry error handler:', error);
      logger.error('Sentry error handler configuration failed:', error);
    }
  }

  /**
   * Capture an exception with context
   */
  captureException(error, context = {}) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.withScope(scope => {
        // Add context
        if (context.user) {
          scope.setUser(context.user);
        }

        if (context.tags) {
          Object.keys(context.tags).forEach(key => {
            scope.setTag(key, context.tags[key]);
          });
        }

        if (context.extra) {
          Object.keys(context.extra).forEach(key => {
            scope.setExtra(key, context.extra[key]);
          });
        }

        if (context.level) {
          scope.setLevel(context.level);
        }

        // Capture the exception
        Sentry.captureException(error);
      });
    } catch (err) {
      logger.error('Failed to capture exception in Sentry:', err);
    }
  }

  /**
   * Capture a message with context
   */
  captureMessage(message, level = 'info', context = {}) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.withScope(scope => {
        scope.setLevel(level);

        if (context.user) {
          scope.setUser(context.user);
        }

        if (context.tags) {
          Object.keys(context.tags).forEach(key => {
            scope.setTag(key, context.tags[key]);
          });
        }

        if (context.extra) {
          Object.keys(context.extra).forEach(key => {
            scope.setExtra(key, context.extra[key]);
          });
        }

        Sentry.captureMessage(message, level);
      });
    } catch (err) {
      logger.error('Failed to capture message in Sentry:', err);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.addBreadcrumb({
        timestamp: new Date().getTime() / 1000,
        ...breadcrumb
      });
    } catch (err) {
      logger.error('Failed to add breadcrumb in Sentry:', err);
    }
  }

  /**
   * Set user context
   */
  setUser(user) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setUser({
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        ip_address: '{{auto}}'
      });
    } catch (err) {
      logger.error('Failed to set user in Sentry:', err);
    }
  }

  /**
   * Set tag
   */
  setTag(key, value) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setTag(key, value);
    } catch (err) {
      logger.error('Failed to set tag in Sentry:', err);
    }
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name, op = 'http.server') {
    if (!this.isInitialized) {
      return null;
    }

    try {
      return Sentry.startTransaction({
        name,
        op
      });
    } catch (err) {
      logger.error('Failed to start transaction in Sentry:', err);
      return null;
    }
  }

  /**
   * Flush all pending events
   */
  async flush(timeout = 5000) {
    if (!this.isInitialized) {
      return true;
    }

    try {
      return await Sentry.flush(timeout);
    } catch (err) {
      logger.error('Failed to flush Sentry:', err);
      return false;
    }
  }

  /**
   * Close Sentry client
   */
  async close(timeout = 5000) {
    if (!this.isInitialized) {
      return true;
    }

    try {
      return await Sentry.close(timeout);
    } catch (err) {
      logger.error('Failed to close Sentry:', err);
      return false;
    }
  }

  /**
   * Check if Sentry is initialized
   */
  get initialized() {
    return this.isInitialized;
  }

  /**
   * Get current hub
   */
  getCurrentHub() {
    if (!this.isInitialized) {
      return null;
    }

    return Sentry.getCurrentHub();
  }

  /**
   * Create middleware for specific route monitoring
   */
  createRouteMiddleware(routeName) {
    if (!this.isInitialized) {
      return (req, res, next) => next();
    }

    return (req, res, next) => {
      const transaction = this.startTransaction(`${req.method} ${routeName}`);

      if (transaction) {
        // Add request data
        transaction.setData('url', req.url);
        transaction.setData('method', req.method);
        transaction.setData('user_agent', req.get('User-Agent'));

        // Set user context if available
        if (req.user) {
          this.setUser(req.user);
        }

        // Finish transaction when response ends
        res.on('finish', () => {
          transaction.setHttpStatus(res.statusCode);
          transaction.finish();
        });
      }

      next();
    };
  }
}

// Create singleton instance
const sentryConfig = new SentryConfig();

module.exports = sentryConfig;
