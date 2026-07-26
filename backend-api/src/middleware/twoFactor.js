/**
 * Two-Factor Authentication Middleware for EventConnect 2.0
 */

const twoFactorService = require('../services/twoFactorService');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to check if user requires 2FA verification
 * Used after initial login to determine if 2FA step is needed
 */
const requiresTwoFactor = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has 2FA enabled
    if (user.twoFactor && user.twoFactor.isEnabled) {
      return res.status(200).json({
        success: false,
        requires2FA: true,
        message: '2FA verification required',
        userId: user._id
      });
    }

    // User doesn't have 2FA enabled, continue normally
    next();
  } catch (error) {
    logger.error('2FA requirement check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking 2FA requirements'
    });
  }
};

/**
 * Middleware to enforce 2FA for sensitive operations
 * Requires a valid 2FA token in the request
 */
const enforceSecondFactor = async (req, res, next) => {
  try {
    const user = req.user;
    const { twoFactorToken } = req.body || req.headers;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // If user doesn't have 2FA enabled, they need to set it up for sensitive operations
    if (!user.twoFactor || !user.twoFactor.isEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Two-factor authentication is required for this operation',
        code: 'REQUIRES_2FA_SETUP'
      });
    }

    // Check if 2FA token is provided
    if (!twoFactorToken) {
      return res.status(400).json({
        success: false,
        message: '2FA token is required for this operation',
        code: 'REQUIRES_2FA_TOKEN'
      });
    }

    // Check rate limiting
    const rateLimit = await twoFactorService.checkRateLimit(user._id.toString(), 'totp');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed 2FA attempts. Please try again later.',
        resetTime: rateLimit.resetTime
      });
    }

    // Verify the 2FA token
    const isValidToken = twoFactorService.verifyToken(twoFactorToken, user.twoFactor.secret);
    if (!isValidToken) {
      await twoFactorService.recordFailedAttempt(user._id.toString(), 'totp');
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token',
        attemptsRemaining: rateLimit.attemptsRemaining - 1
      });
    }

    // Clear rate limiting on successful verification
    await twoFactorService.clearRateLimit(user._id.toString());

    logger.info(`2FA verification successful for sensitive operation by user: ${user.username}`);
    next();
  } catch (error) {
    logger.error('2FA enforcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA token'
    });
  }
};

/**
 * Middleware to optionally verify 2FA if token is provided
 * Used for operations that benefit from 2FA but don't require it
 */
const optionalSecondFactor = async (req, res, next) => {
  try {
    const user = req.user;
    const { twoFactorToken } = req.body || req.headers;

    if (!user || !twoFactorToken) {
      // No user or no 2FA token provided, continue normally
      return next();
    }

    // If user has 2FA enabled and token is provided, verify it
    if (user.twoFactor && user.twoFactor.isEnabled) {
      const isValidToken = twoFactorService.verifyToken(twoFactorToken, user.twoFactor.secret);

      if (isValidToken) {
        req.verified2FA = true;
        logger.info(`Optional 2FA verification successful for user: ${user.username}`);
      } else {
        req.verified2FA = false;
        logger.warn(`Optional 2FA verification failed for user: ${user.username}`);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional 2FA verification error:', error);
    // Don't fail the request for optional 2FA
    req.verified2FA = false;
    next();
  }
};

/**
 * Middleware to check if user is in 2FA setup process
 */
const checkSetupProcess = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is in the middle of 2FA setup
    if (user.twoFactor && user.twoFactor.tempSecret && !user.twoFactor.isEnabled) {
      const setupAge = Date.now() - new Date(user.twoFactor.setupInitiatedAt).getTime();
      const maxSetupTime = 10 * 60 * 1000; // 10 minutes

      if (setupAge > maxSetupTime) {
        // Setup has expired, clean it up
        user.twoFactor = {
          isEnabled: false
        };
        await user.save();

        return res.status(400).json({
          success: false,
          message: '2FA setup has expired. Please start the setup process again.',
          code: 'SETUP_EXPIRED'
        });
      }

      req.inSetupProcess = true;
    } else {
      req.inSetupProcess = false;
    }

    next();
  } catch (error) {
    logger.error('2FA setup check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking 2FA setup status'
    });
  }
};

/**
 * Middleware to check if 2FA is recommended for user
 * Based on account value, admin role, etc.
 */
const recommendTwoFactor = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return next();
    }

    let shouldRecommend = false;
    const reasons = [];

    // Recommend for admin users
    if (user.role === 'admin') {
      shouldRecommend = true;
      reasons.push('admin_account');
    }

    // Recommend for users with payment methods
    if (user.hasPaymentMethods) {
      shouldRecommend = true;
      reasons.push('payment_methods');
    }

    // Recommend for active event creators
    if (user.eventsCreated && user.eventsCreated.length > 5) {
      shouldRecommend = true;
      reasons.push('event_creator');
    }

    // Recommend for tribe owners/admins
    if (user.tribesOwned && user.tribesOwned.length > 0) {
      shouldRecommend = true;
      reasons.push('tribe_owner');
    }

    // Add recommendation to response if applicable
    if (shouldRecommend && (!user.twoFactor || !user.twoFactor.isEnabled)) {
      res.locals.twoFactorRecommendation = {
        recommended: true,
        reasons: reasons,
        message: 'We recommend enabling two-factor authentication for enhanced security.'
      };
    }

    next();
  } catch (error) {
    logger.error('2FA recommendation check error:', error);
    next(); // Don't fail the request
  }
};

/**
 * Middleware to log 2FA events for security monitoring
 */
const logSecurityEvent = (eventType) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (user) {
        logger.info(`2FA Security Event: ${eventType}`, {
          userId: user._id,
          username: user.username,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('2FA security logging error:', error);
    }

    next();
  };
};

module.exports = {
  requiresTwoFactor,
  enforceSecondFactor,
  optionalSecondFactor,
  checkSetupProcess,
  recommendTwoFactor,
  logSecurityEvent
};