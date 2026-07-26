const express = require('express');
const rateLimit = require('express-rate-limit');
const jwtService = require('../services/jwtService');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for token refresh (stricter than normal routes)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many token refresh attempts' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/token/refresh
 * @access  Public (requires valid refresh token)
 */
router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Generate new token pair
    const tokens = await jwtService.refreshTokens(refreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens
    });

  } catch (error) {
    logger.warn('Token refresh failed:', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    let statusCode = 401;
    let message = 'Invalid refresh token';

    if (error.message === 'Refresh token expired') {
      statusCode = 401;
      message = 'Refresh token expired. Please login again.';
    } else if (error.message === 'User not found') {
      statusCode = 404;
      message = 'User not found';
    }

    res.status(statusCode).json({
      success: false,
      message
    });
  }
});

/**
 * @desc    Revoke refresh token (logout)
 * @route   POST /api/token/revoke
 * @access  Public (requires valid refresh token)
 */
router.post('/revoke', refreshLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify the refresh token to get user ID
    const decoded = jwtService.verifyRefreshToken(refreshToken);

    // Revoke the specific refresh token
    await jwtService.revokeRefreshToken(decoded.id, refreshToken);

    logger.info(`Refresh token revoked for user: ${decoded.id}`);

    res.json({
      success: true,
      message: 'Refresh token revoked successfully'
    });

  } catch (error) {
    logger.warn('Token revocation failed:', {
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * @desc    Revoke all refresh tokens for user (logout from all devices)
 * @route   POST /api/token/revoke-all
 * @access  Private (requires valid access token)
 */
router.post('/revoke-all', async (req, res) => {
  try {
    // Extract user ID from access token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const accessToken = authHeader.substring(7);
    const decoded = jwtService.verifyAccessToken(accessToken);

    // Revoke all refresh tokens
    await jwtService.revokeAllRefreshTokens(decoded.id);

    logger.info(`All refresh tokens revoked for user: ${decoded.id}`);

    res.json({
      success: true,
      message: 'All refresh tokens revoked successfully'
    });

  } catch (error) {
    logger.warn('Revoke all tokens failed:', {
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      message: 'Invalid access token'
    });
  }
});

/**
 * @desc    Get token information
 * @route   POST /api/token/info
 * @access  Public
 */
router.post('/info', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many token info requests' }
}), (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const tokenInfo = jwtService.getTokenInfo(token);

    // Remove sensitive information
    if (tokenInfo.payload) {
      delete tokenInfo.payload.jti; // Remove unique token ID
    }

    res.json({
      success: true,
      data: tokenInfo
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid token format'
    });
  }
});

/**
 * @desc    Verify token validity
 * @route   POST /api/token/verify
 * @access  Public
 */
router.post('/verify', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many verification requests' }
}), async (req, res) => {
  try {
    const { token, type = 'access' } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    let decoded;
    if (type === 'access') {
      decoded = jwtService.verifyAccessToken(token);
    } else if (type === 'refresh') {
      decoded = jwtService.verifyRefreshToken(token);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type. Must be "access" or "refresh"'
      });
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('isActive email');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        userId: decoded.id,
        email: user.email,
        tokenType: type,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
      }
    });

  } catch (error) {
    logger.warn('Token verification failed:', {
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      message: error.message || 'Invalid token'
    });
  }
});

module.exports = router;