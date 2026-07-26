const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const jwtService = require('../services/jwtService');

/**
 * Enhanced Authentication Middleware with proper error handling
 * Implements secure token verification and user validation
 */
const protect = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization') || req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // Verify JWT token using JWT service
    let decoded;
    try {
      decoded = jwtService.verifyAccessToken(token);
      logger.info(`Token decoded successfully for user ID: ${decoded.id}`);
    } catch (error) {
      logger.error('Token verification failed:', {
        error: error.message,
        type: error.name,
        token: token?.substring(0, 20) + '...'
      });

      if (error.name === 'TokenExpiredError' || error.message === 'Access token expired') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError' || error.message === 'Invalid access token' || error.message === 'Invalid token type') {
        return res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'AUTH_TOKEN_INVALID'
        });
      } else {
        throw error;
      }
    }

    // Find user and validate token
    const user = await User.findOne({
      _id: decoded.id,
      isActive: true
    }).select('-password');

    if (!user) {
      logger.warn(`User not found or inactive for ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    // NOTE: Access tokens are stateless JWT tokens and don't need to be stored in DB
    // Only refresh tokens are stored in user.refreshTokens for rotation/revocation
    // Token validity is already verified by jwtService.verifyAccessToken() above

    // Add user and token to request
    req.user = user;
    req.token = token;
    req.decoded = decoded;

    logger.info(`User authenticated: ${user.username}`);
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Optional authentication - sets req.user if token is valid, but doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // If no token, continue without setting req.user
  if (!token) {
    return next();
  }

  try {
    const decoded = jwtService.verifyAccessToken(token);
    req.user = await User.findOne({ _id: decoded.id, isActive: true }).select('-password');

    if (!req.user) {
      logger.warn(`Optional auth - User not found for ID: ${decoded.id}`);
    } else {
      logger.info(`Optional auth - User authenticated: ${req.user.username}`);
    }
  } catch (error) {
    logger.warn('Optional auth - Token verification failed:', error.message);
    // Don't fail, just continue without setting req.user
  }

  next();
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Role-based authorization middleware
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        code: 'AUTH_NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`User ${req.user.id} attempted to access restricted resource with role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        code: 'AUTH_FORBIDDEN'
      });
    }

    next();
  };
};

module.exports = { protect, authorize, optionalAuth, restrictTo };






