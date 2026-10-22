require('dotenv').config();

// Initialize Sentry first for error monitoring
const sentryConfig = require('./config/sentry');
sentryConfig.initialize();

// Set default environment variables if not provided
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is required in production');
    process.exit(1);
  }
  // Generate a random JWT secret for development
  const crypto = require('crypto');
  process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Generated random JWT_SECRET for development');
  }
}

if (!process.env.MONGODB_URI && !['production', 'staging'].includes(process.env.NODE_ENV)) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/eventconnect';
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Using default MONGODB_URI for development');
  }
}

if (!process.env.PORT) {
  process.env.PORT = '5000';
}

// Log critical environment variables for debugging in development only
if (process.env.NODE_ENV === 'development') {
  console.log('🗄️  MongoDB configured:', Boolean(process.env.MONGODB_URI));
  console.log('🌐 CORS Origins:', process.env.CORS_ORIGIN);
}
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Database connection
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const firebaseService = require('./config/firebase');

// Services
const CronService = require('./services/cronService');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const feedRoutes = require('./routes/feed'); // ✅ NUEVO: Rutas del feed
const tribeRoutes = require('./routes/tribes');
const gamificationRoutes = require('./routes/gamification');
const aiRoutes = require('./routes/ai');
const mapsRoutes = require('./routes/maps');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search'); // ✅ NUEVO: Rutas de búsqueda
const storiesRoutes = require('./routes/stories'); // ✅ NUEVO: Rutas de stories
const followsRoutes = require('./routes/follows'); // ✅ NUEVO: Rutas de follows
const paymentRoutes = require('./routes/payments'); // ✅ NUEVO: Rutas de pagos
const ticketRoutes = require('./routes/tickets'); // ✅ NUEVO: Rutas de tickets
const analyticsRoutes = require('./routes/analytics'); // ✅ NUEVO: Rutas de analytics
const subscriptionRoutes = require('./routes/subscriptions'); // ✅ NUEVO: Rutas de subscriptions
const dashboardRoutes = require('./routes/dashboard'); // ✅ NUEVO: Rutas de dashboard
const pushNotificationRoutes = require('./routes/pushNotifications'); // ✅ NUEVO: Rutas de push notifications
const debugRoutes = require('./routes/debug'); // ✅ NUEVO: Rutas de debug/console
const cacheRoutes = require('./routes/cache'); // ✅ NUEVO: Rutas de cache
const twoFactorRoutes = require('./routes/twoFactor'); // ✅ NUEVO: Rutas de 2FA
const oauthRoutes = require('./routes/oauth'); // ✅ NUEVO: Rutas de OAuth
const tokenRoutes = require('./routes/token'); // ✅ NUEVO: Rutas de tokens
const commentRoutes = require('./routes/comments'); // ✅ NUEVO: Rutas de comentarios
const walletRoutes = require('./routes/wallet');
const reportsRoutes = require('./routes/reports'); // ✅ NUEVO: Rutas de wallet

// Middleware
const errorHandler = require('./middleware/errorHandler');
const { i18nMiddleware } = require('./middleware/i18n');
const { sanitizeBody } = require('./middleware/sanitize');
const logger = require('./utils/logger');

// Initialize Express
const app = express();
const server = createServer(app);

// Configure Sentry for Express
sentryConfig.configureExpress(app);

// Socket.IO + cron setup runs only when started as the main script.
// When required by tests (supertest), initializing Socket.IO starts timers
// and background connections (redis cleanup interval) that surface as
// unhandled AggregateError rejections. Tests use `app` directly.
let io = null;
let socketService = null;
let cronService = null;

if (require.main === module) {
  socketService = require('./services/socketService');
  io = socketService.initialize(server);
  cronService = new CronService();
}

// Connect to databases and services ONLY when run as the main script.
// When required by tests (supertest), the test setup provides its own
// MongoMemoryServer connection, so we must not connect (or call
// process.exit) here on import.
const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    if (process.env.REDIS_REQUIRED === 'true' && !require('./config/redis').getRedisClient()?.isReady) throw new Error('Required Redis unavailable');
    if (socketService) await socketService.setupDistributedAdapter();
    logger.info('✅ Database connections established');

    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEMO_DATA === 'true') {
      try {
        const RDEventSeeder = require('./services/rdEventSeeder');
        await RDEventSeeder.seedAllRDEvents();
      } catch (seedErr) {
        logger.warn('Seed dominican ecosystem skipped/error: ' + seedErr.message);
      }
      try {
        const { seedPlanetaryEvents } = require('./services/eventIngestion/planetaryEventHarvester');
        await seedPlanetaryEvents();
      } catch (planetErr) {
        logger.warn('Seed planetary ecosystem skipped/error: ' + planetErr.message);
      }
    }
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

// Initialize cache service
const cacheService = require('./services/cacheService');
cacheService.connect().catch(error => {
  console.error('⚠️ Cache service initialization failed:', error.message);
});

// Initialize Firebase for push notifications
const firebaseInitialized = firebaseService.initialize();
if (firebaseInitialized) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔥 Firebase Push Notifications: Enabled');
  }
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Firebase Push Notifications: Disabled (no credentials)');
  }
}


// Root route for health check
app.get('/', (req, res) => {
  res.send('API Running');
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:', 'http://localhost:5000', 'http://localhost:3000', 'http://localhost:3001'],
      connectSrc: ['\'self\'', 'ws:', 'wss:', 'http://localhost:5000', 'http://localhost:3000', 'http://localhost:3001'],
      mediaSrc: ['\'self\'', 'https:', 'http://localhost:5000', 'http://localhost:3000', 'http://localhost:3001'],
    }
  }
}));

// CORS - Secure configuration
app.use(cors({
  origin: (origin, callback) => {
    // Native clients and signed webhooks do not send a browser Origin.
    if (!origin) return callback(null, true);
    // In development, allow all localhost origins (for Flutter web, React, etc.)
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      // Allow all localhost ports and undefined origin (for tests)
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
        return;
      }
    }

    // Production: use strict allowlist
    const rawOrigins = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '';
    const allowedOrigins = rawOrigins ? rawOrigins.split(',').map(value => value.trim()).filter(Boolean) : [];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Client-Version',
    'X-Client-Platform',
    'Accept',
    'Origin',
    'Cache-Control',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'X-Requested-With',
    'X-Client-Version',
    'X-Client-Platform'
  ]
}));

app.use(cookieParser());

app.set('trust proxy', process.env.TRUST_PROXY ? process.env.TRUST_PROXY.split(',').map(value => value.trim()) : false);
const { SharedRateLimitStore } = require('./services/sharedRateLimitStore');
const sharedLimits = process.env.NODE_ENV !== 'test' && Boolean(process.env.REDIS_URL);
const { rateLimitIdentity, authRateLimitIdentity, rateBudget } = require('./utils/rateLimitIdentity');

// Global Rate limiting
const limiter = rateLimit({
  keyGenerator: rateLimitIdentity,
  ...(sharedLimits ? { store: new SharedRateLimitStore('global') } : {}),
  windowMs: 15 * 60 * 1000,
  max: rateBudget(process.env.API_RATE_LIMIT_MAX, 1500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again after 15 minutes' }
});
app.use(limiter);

// Strict rate limiter for authentication routes
const authLimiter = rateLimit({
  keyGenerator: authRateLimitIdentity,
  ...(sharedLimits ? { store: new SharedRateLimitStore('auth') } : {}),
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Strict in production (real brute-force protection). Relaxed in test/dev so
  // functional suites (which share one IP) are not throttled mid-run.
  max: rateBudget(process.env.AUTH_RATE_LIMIT_MAX, process.env.NODE_ENV === 'production' ? 20 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' }
});

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb', verify: (req, res, buffer) => {
  if (/^\/api\/(?:v1\/)?payments\/webhook\/?$/.test(req.path)) req.rawBody = buffer;
} }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);
app.use(i18nMiddleware); // i18n support
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EventConnect API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Readiness is separate from process liveness and exposes no credentials.
app.get(['/ready', '/api/ready'], (req, res) => {
  const database = require('mongoose').connection.readyState === 1;
  const redis = Boolean(require('./config/redis').getRedisClient()?.isReady);
  const ready = database && (process.env.REDIS_REQUIRED !== 'true' || redis);
  res.status(ready ? 200 : 503).json({ success: ready, checks: { database, redis }, timestamp: new Date().toISOString() });
});

// API Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EventConnect API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Versioned API router (v1)
const apiV1Router = express.Router();
apiV1Router.use('/auth', authLimiter, authRoutes);
apiV1Router.use('/users', userRoutes);
apiV1Router.use('/events', require('./routes/discovery'));
apiV1Router.use('/events', eventRoutes);
apiV1Router.use('/feed', feedRoutes);
apiV1Router.use('/tribes', tribeRoutes);
apiV1Router.use('/gamification', gamificationRoutes);
apiV1Router.use('/ai', aiRoutes);
apiV1Router.use('/maps', mapsRoutes);
apiV1Router.use('/chat', chatRoutes);
apiV1Router.use('/upload', uploadRoutes);
apiV1Router.use('/notifications', notificationRoutes);
apiV1Router.use('/search', searchRoutes);
apiV1Router.use('/stories', storiesRoutes);
apiV1Router.use('/follows', followsRoutes);
apiV1Router.use('/payments', paymentRoutes);
apiV1Router.use('/tickets', ticketRoutes);
apiV1Router.use('/analytics', analyticsRoutes);
apiV1Router.use('/subscriptions', subscriptionRoutes);
apiV1Router.use('/dashboard', dashboardRoutes);
apiV1Router.use('/push', pushNotificationRoutes);
apiV1Router.use('/debug', debugRoutes);
apiV1Router.use('/cache', cacheRoutes);
apiV1Router.use('/2fa', twoFactorRoutes);
apiV1Router.use('/oauth', oauthRoutes);
apiV1Router.use('/token', tokenRoutes);
apiV1Router.use('/comments', commentRoutes);
apiV1Router.use('/wallet', walletRoutes);
apiV1Router.use('/services', require('./routes/services'));
apiV1Router.use('/reports', reportsRoutes);
apiV1Router.use('/audit', require('./routes/audit'));
apiV1Router.use('/support', require('./routes/support'));
apiV1Router.use('/ideas', require('./routes/ideas'));
apiV1Router.use('/event-planning', require('./routes/eventPlanning'));
apiV1Router.use('/organizer-reputation', require('./routes/organizerReputation'));
apiV1Router.use('/community-actions', require('./routes/communityActions'));
apiV1Router.use('/partners', require('./routes/partners'));
apiV1Router.use('/planning-tools', require('./routes/planningTools'));
apiV1Router.use('/plans', require('./routes/plans'));
apiV1Router.use('/serrucho', require('./routes/serrucho'));
apiV1Router.use('/suppliers', require('./routes/suppliers'));
apiV1Router.use('/telegram', require('./routes/telegram'));
apiV1Router.use('/sources', require('./routes/sources'));
apiV1Router.get('/config', (req, res) => res.json({ success: true, data: require('./config/features').getPublicConfig() }));

// Mount versioned router — /api/v1 is canonical; /api is backward-compatible (deprecated)
app.use('/api/v1', apiV1Router);
app.use('/api', (req, res, next) => {
  if (!req.path.startsWith('/v1')) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/v1>; rel="successor-version"');
  }
  next();
}, apiV1Router);

// Socket.IO is now handled by socketService

// Make io available to routes
app.set('io', io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Configure Sentry error handler (must be before other error handlers)
sentryConfig.configureErrorHandler(app);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only bind a port when run as the main script (tests use supertest against app).
if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`
🚀 EventConnect API Server Started!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
🏥 Health: http://localhost:${PORT}/health
🌐 Network: http://192.168.56.1:${PORT}/health
⚡ Socket.IO: Enabled
🔒 Security: Enhanced
📱 Feed System: Active
💬 Comments: Active
📊 Analytics: Ready
🎮 Gamification: Active
⏰ Scheduled Jobs: Ready
    `);

    // Initialize and start scheduled jobs in production
    if (process.env.NODE_ENV === 'production') {
      cronService.initialize();
      cronService.start();
      logger.info('🕐 Cron jobs started for production environment');
    } else {
      cronService.initialize();
      logger.info('🕐 Cron jobs initialized (not started in development)');
      if (process.env.EVENT_INGESTION_ENABLED === 'true') {
        cronService.jobs.eventIngestion.start();
        logger.info('Approved-source ingestion enabled locally; other development jobs remain stopped');
      }
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cronService?.stop();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io, cronService };
// Server updated to trigger restart
