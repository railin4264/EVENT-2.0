/**
 * Script de Aplicación de Correcciones Críticas
 * EVENT NOW 2.0
 * 
 * Este script aplica automáticamente las correcciones críticas identificadas
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔧 Iniciando aplicación de correcciones críticas para EVENT NOW 2.0...\n');

// Generar secrets seguros
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// 1. ACTUALIZAR VARIABLES DE ENTORNO BACKEND
function updateBackendEnv() {
  console.log('📝 Actualizando variables de entorno del backend...');
  
  const envPath = path.join(__dirname, '..', 'backend-api', '.env');
  const jwtSecret = generateSecureSecret();
  const jwtRefreshSecret = generateSecureSecret();
  const sessionSecret = generateSecureSecret(32);
  
  const envContent = `# EventConnect 2.0 Backend - Environment Variables
# Generated: ${new Date().toISOString()}

# ===========================================
# SERVER CONFIGURATION
# ===========================================
NODE_ENV=development
PORT=5000
HOST=localhost
API_VERSION=v1

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
MONGODB_URI=mongodb://localhost:27017/eventconnect
MONGODB_TEST_URI=mongodb://localhost:27017/eventconnect_test
MONGODB_OPTIONS=retryWrites=true&w=majority

# ===========================================
# REDIS CONFIGURATION
# ===========================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=eventconnect:

# ===========================================
# JWT CONFIGURATION - SECURE SECRETS
# ===========================================
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256

# ===========================================
# CORS CONFIGURATION
# ===========================================
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:8081,http://localhost:19006
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# ===========================================
# SECURITY
# ===========================================
BCRYPT_ROUNDS=12
SESSION_SECRET=${sessionSecret}
COOKIE_SECRET=${generateSecureSecret(32)}
HELMET_CSP_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL=false

# ===========================================
# EXTERNAL SERVICES
# ===========================================
# Google Maps (Regenerar en producción)
GOOGLE_MAPS_API_KEY=AIzaSyB_TEMP_KEY_FOR_DEV_ONLY

# Stripe (Obtener de dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnop
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnop
STRIPE_WEBHOOK_SECRET=whsec_test_secret
STRIPE_API_VERSION=2023-10-16

# Cloudinary (Obtener de cloudinary.com)
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=demo_key
CLOUDINARY_API_SECRET=demo_secret
CLOUDINARY_UPLOAD_PRESET=eventconnect

# Email Configuration (Configurar con tu proveedor)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=EventConnect <noreply@eventconnect.com>

# Firebase (Para push notifications)
FIREBASE_PROJECT_ID=eventconnect-2024
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@eventconnect-2024.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_HERE\\n-----END PRIVATE KEY-----
FIREBASE_DATABASE_URL=https://eventconnect-2024.firebaseio.com

# ===========================================
# MONITORING & LOGGING
# ===========================================
SENTRY_DSN=
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_ROTATION=daily
LOG_FILE_MAX_SIZE=20m
LOG_FILE_MAX_FILES=14d
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_LOGGING=true

# ===========================================
# FEATURE FLAGS
# ===========================================
FEATURE_PAYMENTS_ENABLED=true
FEATURE_PUSH_NOTIFICATIONS_ENABLED=true
FEATURE_EMAIL_NOTIFICATIONS_ENABLED=true
FEATURE_SMS_NOTIFICATIONS_ENABLED=false
FEATURE_SOCIAL_LOGIN_ENABLED=true
FEATURE_2FA_ENABLED=true
FEATURE_GAMIFICATION_ENABLED=true
FEATURE_STORIES_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
FEATURE_AI_RECOMMENDATIONS_ENABLED=true

# Generated on: ${new Date().toISOString()}
# ⚠️ NEVER commit this file with real credentials to version control!
`;

  try {
    // Crear backup del .env actual si existe
    if (fs.existsSync(envPath)) {
      const backupPath = envPath + '.backup.' + Date.now();
      fs.copyFileSync(envPath, backupPath);
      console.log(`   ✅ Backup creado: ${path.basename(backupPath)}`);
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('   ✅ Variables de entorno actualizadas con secrets seguros\n');
    
    // Guardar secrets en archivo separado para referencia
    const secretsInfo = `EVENT NOW 2.0 - Secrets Generados
==================================
Fecha: ${new Date().toISOString()}

JWT_SECRET: ${jwtSecret}
JWT_REFRESH_SECRET: ${jwtRefreshSecret}
SESSION_SECRET: ${sessionSecret}

⚠️ IMPORTANTE: Guarda estos valores de forma segura.
En producción, usa un gestor de secrets como AWS Secrets Manager o HashiCorp Vault.
`;
    
    fs.writeFileSync(path.join(__dirname, 'generated-secrets.txt'), secretsInfo);
    console.log('   📄 Secrets guardados en fixes/generated-secrets.txt\n');
    
  } catch (error) {
    console.error('   ❌ Error actualizando .env:', error.message);
  }
}

// 2. CREAR MIDDLEWARE DE SANITIZACIÓN MONGODB
function createMongoSanitizer() {
  console.log('🛡️ Creando middleware de sanitización MongoDB...');
  
  const sanitizerContent = `/**
 * Middleware de Sanitización MongoDB
 * Previene ataques de inyección NoSQL
 */

const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../utils/logger');

module.exports = function setupMongoSanitizer(app) {
  // Configurar sanitización
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      // Log de intentos de inyección
      logger.warn(\`⚠️ Intento de inyección NoSQL bloqueado\`, {
        ip: req.ip,
        path: req.path,
        key: key,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      });
      
      // En producción, considera bloquear IPs maliciosas
      if (process.env.NODE_ENV === 'production') {
        // Implementar lógica de rate limiting o ban temporal
      }
    }
  }));
  
  // Middleware adicional para validar ObjectIds
  app.use((req, res, next) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    // Validar params que parecen ser ObjectIds
    for (const key in req.params) {
      if (key.includes('Id') || key === 'id') {
        if (!objectIdRegex.test(req.params[key])) {
          return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
          });
        }
      }
    }
    
    next();
  });
};
`;

  const middlewarePath = path.join(__dirname, '..', 'backend-api', 'src', 'middleware', 'mongoSanitize.js');
  
  try {
    fs.writeFileSync(middlewarePath, sanitizerContent);
    console.log('   ✅ Middleware de sanitización MongoDB creado\n');
  } catch (error) {
    console.error('   ❌ Error creando middleware:', error.message);
  }
}

// 3. MEJORAR CONFIGURACIÓN CORS
function updateCorsConfig() {
  console.log('🔒 Actualizando configuración CORS...');
  
  const corsConfigContent = `/**
 * Configuración CORS mejorada
 * Con validación estricta para producción
 */

const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir localhost
    if (process.env.NODE_ENV === 'development') {
      // Permitir requests sin origin (Postman, etc)
      if (!origin) {
        return callback(null, true);
      }
      
      // Permitir cualquier localhost o IP local
      if (origin.includes('localhost') || 
          origin.includes('127.0.0.1') || 
          origin.includes('192.168.') ||
          origin.includes('10.0.')) {
        return callback(null, true);
      }
    }
    
    // En producción, solo permitir orígenes configurados
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(\`CORS: Origin \${origin} not allowed\`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Client-Version',
    'X-Client-Platform',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Rate-Limit-Remaining'
  ],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204
};

module.exports = corsOptions;
`;

  const corsPath = path.join(__dirname, '..', 'backend-api', 'src', 'config', 'cors.js');
  
  try {
    fs.writeFileSync(corsPath, corsConfigContent);
    console.log('   ✅ Configuración CORS actualizada\n');
  } catch (error) {
    console.error('   ❌ Error actualizando CORS:', error.message);
  }
}

// 4. IMPLEMENTAR SISTEMA DE REFRESH TOKEN
function createAuthService() {
  console.log('🔐 Creando servicio de autenticación mejorado...');
  
  const authServiceContent = `/**
 * Servicio de Autenticación Mejorado
 * Con soporte para refresh tokens
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../utils/logger');
const redisClient = require('../config/redis').client;

class AuthService {
  /**
   * Generar tokens de acceso y refresh
   */
  async generateTokens(userId) {
    try {
      // Access token de corta duración
      const accessToken = jwt.sign(
        { 
          userId, 
          type: 'access',
          iat: Date.now()
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
          algorithm: 'HS256'
        }
      );
      
      // Refresh token de larga duración
      const refreshToken = jwt.sign(
        { 
          userId, 
          type: 'refresh',
          jti: crypto.randomBytes(16).toString('hex'), // ID único
          iat: Date.now()
        },
        process.env.JWT_REFRESH_SECRET,
        { 
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
          algorithm: 'HS256'
        }
      );
      
      // Guardar refresh token en base de datos
      await RefreshToken.create({
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Error generating tokens:', error);
      throw error;
    }
  }
  
  /**
   * Renovar access token usando refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET
      );
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Verificar en base de datos
      const storedToken = await RefreshToken.findOne({
        token: refreshToken,
        userId: decoded.userId,
        revoked: false
      });
      
      if (!storedToken) {
        throw new Error('Refresh token not found or revoked');
      }
      
      // Verificar si está en blacklist (Redis)
      const isBlacklisted = await this.checkBlacklist(refreshToken);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }
      
      // Generar nuevo access token
      const accessToken = jwt.sign(
        { 
          userId: decoded.userId, 
          type: 'access',
          iat: Date.now()
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
          algorithm: 'HS256'
        }
      );
      
      // Actualizar última actividad
      storedToken.lastUsed = new Date();
      await storedToken.save();
      
      return { 
        success: true, 
        accessToken,
        expiresIn: 900 // 15 minutos en segundos
      };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  /**
   * Revocar refresh token
   */
  async revokeRefreshToken(refreshToken) {
    try {
      // Marcar como revocado en base de datos
      await RefreshToken.updateOne(
        { token: refreshToken },
        { revoked: true, revokedAt: new Date() }
      );
      
      // Agregar a blacklist en Redis (TTL = tiempo restante del token)
      const decoded = jwt.decode(refreshToken);
      const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
      
      if (ttl > 0) {
        await redisClient.setex(
          \`blacklist:\${refreshToken}\`,
          ttl,
          'revoked'
        );
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error revoking token:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Revocar todos los tokens de un usuario
   */
  async revokeAllUserTokens(userId) {
    try {
      // Revocar todos los refresh tokens del usuario
      const tokens = await RefreshToken.find({ 
        userId, 
        revoked: false 
      });
      
      for (const token of tokens) {
        await this.revokeRefreshToken(token.token);
      }
      
      return { success: true, count: tokens.length };
    } catch (error) {
      logger.error('Error revoking all user tokens:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Verificar si un token está en blacklist
   */
  async checkBlacklist(token) {
    try {
      if (!redisClient) return false;
      const result = await redisClient.get(\`blacklist:\${token}\`);
      return !!result;
    } catch (error) {
      logger.error('Error checking blacklist:', error);
      return false;
    }
  }
  
  /**
   * Limpiar tokens expirados (cron job)
   */
  async cleanupExpiredTokens() {
    try {
      const result = await RefreshToken.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      logger.info(\`Cleaned up \${result.deletedCount} expired tokens\`);
      return { success: true, count: result.deletedCount };
    } catch (error) {
      logger.error('Error cleaning up tokens:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AuthService();
`;

  const authServicePath = path.join(__dirname, '..', 'backend-api', 'src', 'services', 'authService.js');
  
  try {
    // Crear backup si existe
    if (fs.existsSync(authServicePath)) {
      fs.copyFileSync(authServicePath, authServicePath + '.backup');
    }
    
    fs.writeFileSync(authServicePath, authServiceContent);
    console.log('   ✅ Servicio de autenticación mejorado creado\n');
  } catch (error) {
    console.error('   ❌ Error creando servicio de auth:', error.message);
  }
}

// 5. CREAR MODELO DE REFRESH TOKEN
function createRefreshTokenModel() {
  console.log('📄 Creando modelo de RefreshToken...');
  
  const modelContent = `/**
 * Modelo de Refresh Token
 * Para gestión segura de tokens de renovación
 */

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    platform: String,
    deviceId: String
  },
  lastUsed: {
    type: Date,
    default: null
  },
  revoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
refreshTokenSchema.index({ userId: 1, revoked: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método para verificar si el token es válido
refreshTokenSchema.methods.isValid = function() {
  return !this.revoked && this.expiresAt > new Date();
};

// Método estático para limpiar tokens expirados
refreshTokenSchema.statics.cleanupExpired = async function() {
  return await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
`;

  const modelPath = path.join(__dirname, '..', 'backend-api', 'src', 'models', 'RefreshToken.js');
  
  try {
    fs.writeFileSync(modelPath, modelContent);
    console.log('   ✅ Modelo RefreshToken creado\n');
  } catch (error) {
    console.error('   ❌ Error creando modelo:', error.message);
  }
}

// 6. MEJORAR MIDDLEWARE DE AUTENTICACIÓN
function updateAuthMiddleware() {
  console.log('🔑 Actualizando middleware de autenticación...');
  
  const middlewareContent = `/**
 * Middleware de Autenticación Mejorado
 * Con manejo de tokens expirados y refresh automático
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Caché de usuarios en memoria (TTL: 5 minutos)
const userCache = new Map();

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Obtener token del header Authorization
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      // Fallback a cookie si existe
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado',
        code: 'NO_TOKEN'
      });
    }
    
    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar tipo de token
      if (decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido - Tipo incorrecto',
          code: 'INVALID_TOKEN_TYPE'
        });
      }
      
      // Buscar usuario (con caché)
      let user;
      const cacheKey = \`user:\${decoded.userId}\`;
      
      if (userCache.has(cacheKey)) {
        user = userCache.get(cacheKey);
      } else {
        user = await User.findById(decoded.userId)
          .select('-password')
          .lean();
        
        if (user) {
          // Guardar en caché por 5 minutos
          userCache.set(cacheKey, user);
          setTimeout(() => userCache.delete(cacheKey), 5 * 60 * 1000);
        }
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Verificar estado del usuario
      if (user.status === 'suspended' || user.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Cuenta suspendida o bloqueada',
          code: 'ACCOUNT_SUSPENDED'
        });
      }
      
      // Agregar usuario al request
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      // Manejo específico de errores JWT
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          expiredAt: error.expiredAt
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
      
      throw error;
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
};

// Middleware para rutas que requieren rol específico
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: \`Rol \${req.user.role} no tiene acceso a este recurso\`
      });
    }
    
    next();
  };
};

// Middleware opcional - No bloquea si no hay token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      req.user = user;
    }
  } catch (error) {
    // Ignorar errores - es opcional
  }
  
  next();
};
`;

  const middlewarePath = path.join(__dirname, '..', 'backend-api', 'src', 'middleware', 'auth.js');
  
  try {
    // Backup
    if (fs.existsSync(middlewarePath)) {
      fs.copyFileSync(middlewarePath, middlewarePath + '.backup');
    }
    
    fs.writeFileSync(middlewarePath, middlewareContent);
    console.log('   ✅ Middleware de autenticación actualizado\n');
  } catch (error) {
    console.error('   ❌ Error actualizando middleware:', error.message);
  }
}

// 7. ACTUALIZAR RUTAS DE AUTENTICACIÓN
function updateAuthRoutes() {
  console.log('🛤️ Actualizando rutas de autenticación...');
  
  const routesContent = `/**
 * Rutas de Autenticación Mejoradas
 * Con soporte para refresh tokens
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const authService = require('../services/authService');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting para auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 requests
  message: 'Demasiados intentos, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validaciones
const validateRegister = [
  body('firstName').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('lastName').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/)
    .withMessage('La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
    .withMessage('Las contraseñas no coinciden')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Rutas públicas
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Rutas protegidas
router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAllDevices);
router.get('/me', protect, authController.getCurrentUser);
router.put('/change-password', protect, authController.changePassword);
router.post('/enable-2fa', protect, authController.enableTwoFactor);
router.post('/verify-2fa', protect, authController.verifyTwoFactor);

// OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/facebook', authController.facebookAuth);
router.get('/facebook/callback', authController.facebookCallback);

module.exports = router;
`;

  const routesPath = path.join(__dirname, '..', 'backend-api', 'src', 'routes', 'auth.js');
  
  try {
    // Backup
    if (fs.existsSync(routesPath)) {
      fs.copyFileSync(routesPath, routesPath + '.backup');
    }
    
    fs.writeFileSync(routesPath, routesContent);
    console.log('   ✅ Rutas de autenticación actualizadas\n');
  } catch (error) {
    console.error('   ❌ Error actualizando rutas:', error.message);
  }
}

// 8. Ejecutar todas las correcciones
async function applyAllFixes() {
  console.log('═══════════════════════════════════════════════════════\n');
  
  updateBackendEnv();
  createMongoSanitizer();
  updateCorsConfig();
  createAuthService();
  createRefreshTokenModel();
  updateAuthMiddleware();
  updateAuthRoutes();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ CORRECCIONES CRÍTICAS APLICADAS EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 Próximos pasos:');
  console.log('1. Instalar dependencias: npm install express-mongo-sanitize');
  console.log('2. Reiniciar el servidor backend');
  console.log('3. Probar el sistema de autenticación');
  console.log('4. Verificar logs en backend-api/logs/');
  console.log('5. Configurar servicios externos (Stripe, Firebase, etc.)\n');
}

// Ejecutar
applyAllFixes();
