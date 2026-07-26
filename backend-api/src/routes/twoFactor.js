/**
 * Two-Factor Authentication Routes for EventConnect 2.0
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const twoFactorService = require('../services/twoFactorService');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for 2FA routes
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many 2FA requests' }
});

// Validation middleware
const validateTOTPToken = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('TOTP token must be 6 digits')
];

const validateBackupCode = [
  body('code')
    .isLength({ min: 8, max: 8 })
    .isAlphanumeric()
    .withMessage('Backup code must be 8 alphanumeric characters')
];

// @desc    Setup 2FA - Generate secret and QR code
// @route   POST /api/2fa/setup
// @access  Private
router.post('/setup', protect, twoFactorLimiter, async (req, res) => {
  try {
    const user = req.user;

    // Check if 2FA is already enabled
    if (user.twoFactor && user.twoFactor.isEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled for this account'
      });
    }

    // Generate new secret
    const secretData = await twoFactorService.generateSecret(user.email);

    // Generate setup token
    const setupToken = await twoFactorService.generateSetupToken(
      user._id.toString(),
      secretData.tempSecret
    );

    // Store temporary secret in user document
    user.twoFactor = {
      isEnabled: false,
      tempSecret: secretData.tempSecret,
      setupToken: setupToken,
      setupInitiatedAt: new Date()
    };

    await user.save();

    logger.info(`2FA setup initiated for user: ${user.username}`);

    res.json({
      success: true,
      message: '2FA setup initiated',
      data: {
        qrCode: secretData.qrCode,
        manualEntryKey: secretData.manualEntryKey,
        setupToken: setupToken
      }
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up 2FA'
    });
  }
});

// @desc    Verify 2FA setup
// @route   POST /api/2fa/verify-setup
// @access  Private
router.post('/verify-setup', protect, twoFactorLimiter, validateTOTPToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = req.user;
    const { token, setupToken } = req.body;

    // Verify setup token
    const setupData = await twoFactorService.verifySetupToken(setupToken);
    if (!setupData || setupData.userId !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired setup token'
      });
    }

    // Verify TOTP token with temporary secret
    const isValidToken = twoFactorService.verifyToken(token, setupData.tempSecret);
    if (!isValidToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }

    // Generate backup codes
    const backupCodes = twoFactorService.generateBackupCodes();
    const backupCodesWithMetadata = backupCodes.map(code => ({
      code,
      used: false,
      generatedAt: new Date()
    }));

    // Enable 2FA
    user.twoFactor = {
      isEnabled: true,
      secret: setupData.tempSecret,
      backupCodes: backupCodesWithMetadata,
      enabledAt: new Date(),
      tempSecret: undefined,
      setupToken: undefined,
      setupInitiatedAt: undefined
    };

    await user.save();

    // Complete setup and clean up temporary data
    await twoFactorService.completeSetup(setupToken);

    logger.info(`2FA enabled successfully for user: ${user.username}`);

    res.json({
      success: true,
      message: '2FA enabled successfully',
      data: {
        backupCodes: backupCodes
      }
    });
  } catch (error) {
    logger.error('2FA verification setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA setup'
    });
  }
});

// @desc    Verify 2FA token during login
// @route   POST /api/2fa/verify
// @access  Public (but requires valid user context)
router.post('/verify', twoFactorLimiter, validateTOTPToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user || !user.twoFactor?.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Check rate limiting
    const rateLimit = await twoFactorService.checkRateLimit(userId, 'totp');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please try again later.',
        resetTime: rateLimit.resetTime
      });
    }

    // Verify TOTP token
    const isValidToken = twoFactorService.verifyToken(token, user.twoFactor.secret);
    if (!isValidToken) {
      await twoFactorService.recordFailedAttempt(userId, 'totp');
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token',
        attemptsRemaining: rateLimit.attemptsRemaining - 1
      });
    }

    // Clear rate limiting on successful verification
    await twoFactorService.clearRateLimit(userId);

    // Generate JWT token
    const jwtToken = user.getSignedJwtToken();

    logger.info(`2FA verification successful for user: ${user.username}`);

    res.json({
      success: true,
      message: '2FA verification successful',
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA token'
    });
  }
});

// @desc    Verify backup code
// @route   POST /api/2fa/verify-backup
// @access  Public (but requires valid user context)
router.post('/verify-backup', twoFactorLimiter, validateBackupCode, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { code, userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user || !user.twoFactor?.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Check rate limiting
    const rateLimit = await twoFactorService.checkRateLimit(userId, 'backup');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please try again later.',
        resetTime: rateLimit.resetTime
      });
    }

    // Verify backup code
    const verification = twoFactorService.verifyBackupCode(code, user.twoFactor.backupCodes);
    if (!verification.valid) {
      await twoFactorService.recordFailedAttempt(userId, 'backup');
      return res.status(400).json({
        success: false,
        message: 'Invalid backup code',
        attemptsRemaining: rateLimit.attemptsRemaining - 1
      });
    }

    // Update user's backup codes
    user.twoFactor.backupCodes = verification.remainingCodes;
    await user.save();

    // Clear rate limiting on successful verification
    await twoFactorService.clearRateLimit(userId);

    // Generate JWT token
    const jwtToken = user.getSignedJwtToken();

    // Count remaining unused backup codes
    const remainingCodes = verification.remainingCodes.filter(c => !c.used).length;

    logger.info(`Backup code verification successful for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Backup code verification successful',
      token: jwtToken,
      remainingBackupCodes: remainingCodes,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    logger.error('Backup code verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying backup code'
    });
  }
});

// @desc    Disable 2FA
// @route   POST /api/2fa/disable
// @access  Private
router.post('/disable', protect, twoFactorLimiter, validateTOTPToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = req.user;
    const { token } = req.body;

    if (!user.twoFactor?.isEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Verify TOTP token
    const isValidToken = twoFactorService.verifyToken(token, user.twoFactor.secret);
    if (!isValidToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }

    // Disable 2FA
    user.twoFactor = {
      isEnabled: false,
      disabledAt: new Date()
    };

    await user.save();

    // Clear any rate limiting
    await twoFactorService.clearRateLimit(user._id.toString());

    logger.info(`2FA disabled for user: ${user.username}`);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    logger.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling 2FA'
    });
  }
});

// @desc    Generate new backup codes
// @route   POST /api/2fa/regenerate-backup-codes
// @access  Private
router.post('/regenerate-backup-codes', protect, twoFactorLimiter, validateTOTPToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = req.user;
    const { token } = req.body;

    if (!user.twoFactor?.isEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account'
      });
    }

    // Verify TOTP token
    const isValidToken = twoFactorService.verifyToken(token, user.twoFactor.secret);
    if (!isValidToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }

    // Generate new backup codes
    const backupCodes = twoFactorService.generateBackupCodes();
    const backupCodesWithMetadata = backupCodes.map(code => ({
      code,
      used: false,
      generatedAt: new Date()
    }));

    // Update user's backup codes
    user.twoFactor.backupCodes = backupCodesWithMetadata;
    user.twoFactor.backupCodesRegeneratedAt = new Date();

    await user.save();

    logger.info(`Backup codes regenerated for user: ${user.username}`);

    res.json({
      success: true,
      message: 'New backup codes generated',
      data: {
        backupCodes: backupCodes
      }
    });
  } catch (error) {
    logger.error('Backup codes regeneration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating backup codes'
    });
  }
});

// @desc    Get 2FA status
// @route   GET /api/2fa/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = req.user;

    const status = {
      isEnabled: user.twoFactor?.isEnabled || false,
      enabledAt: user.twoFactor?.enabledAt || null,
      hasBackupCodes: false,
      remainingBackupCodes: 0
    };

    if (user.twoFactor?.isEnabled && user.twoFactor.backupCodes) {
      status.hasBackupCodes = true;
      status.remainingBackupCodes = user.twoFactor.backupCodes.filter(c => !c.used).length;
    }

    res.json({
      success: true,
      message: '2FA status retrieved',
      data: status
    });
  } catch (error) {
    logger.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting 2FA status'
    });
  }
});

// @desc    Generate recovery code (for account recovery)
// @route   POST /api/2fa/recovery-code
// @access  Public
router.post('/recovery-code', twoFactorLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email, isActive: true });
    if (!user || !user.twoFactor?.isEnabled) {
      // Don't reveal if user exists or has 2FA enabled
      return res.json({
        success: true,
        message: 'If the account exists and has 2FA enabled, a recovery code has been sent to the email address.'
      });
    }

    // Generate recovery code
    const recoveryCode = await twoFactorService.generateRecoveryCode(user._id.toString());

    // Send recovery code via email
    try {
      const emailService = require('../services/emailService');
      await emailService.send2FARecoveryCode(user.email, user.firstName, recoveryCode);
      logger.info(`2FA recovery code sent to: ${user.email}`);
    } catch (emailError) {
      logger.error('Failed to send 2FA recovery code email:', emailError);
      // Don't reveal to user that email failed for security reasons
    }

    res.json({
      success: true,
      message: 'If the account exists and has 2FA enabled, a recovery code has been sent to the email address.',
      // Recovery code sent via email only
    });
  } catch (error) {
    logger.error('2FA recovery code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recovery code'
    });
  }
});

// @desc    Recover account with recovery code
// @route   POST /api/2fa/recover
// @access  Public
router.post('/recover', twoFactorLimiter, async (req, res) => {
  try {
    const { recoveryCode, newPassword } = req.body;

    if (!recoveryCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Recovery code and new password are required'
      });
    }

    // Verify recovery code
    const recoveryData = await twoFactorService.verifyRecoveryCode(recoveryCode);
    if (!recoveryData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired recovery code'
      });
    }

    // Find user
    const user = await User.findById(recoveryData.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recovery request'
      });
    }

    // Update password and disable 2FA
    user.password = newPassword;
    user.twoFactor = {
      isEnabled: false,
      disabledAt: new Date(),
      disabledReason: 'account_recovery'
    };

    await user.save();

    logger.info(`Account recovered and 2FA disabled for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Account recovered successfully. 2FA has been disabled for security. Please set up 2FA again.'
    });
  } catch (error) {
    logger.error('2FA account recovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recovering account'
    });
  }
});

// @desc    Get 2FA statistics (Admin only)
// @route   GET /api/2fa/stats
// @access  Private (Admin)
router.get('/stats', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await twoFactorService.getStatistics();

    // Get database statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const usersWithTwoFactor = await User.countDocuments({
      isActive: true,
      'twoFactor.isEnabled': true
    });

    res.json({
      success: true,
      message: '2FA statistics retrieved',
      data: {
        ...stats,
        totalUsers,
        usersWithTwoFactor,
        adoptionRate: totalUsers > 0 ? (usersWithTwoFactor / totalUsers * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    logger.error('2FA statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting 2FA statistics'
    });
  }
});

module.exports = router;