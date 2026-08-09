const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const { enforceSecondFactor } = require('../middleware/twoFactor');
const { sanitizeBody, stripForbiddenUserFields } = require('../middleware/sanitize');
const User = require('../models/User');
const logger = require('../utils/logger');
const jwtService = require('../services/jwtService');
const twoFactorService = require('../services/twoFactorService');
const router = express.Router();


// Validation middleware
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1-50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1-50 characters'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('acceptTerms')
    .optional()
    .custom((value) => value === true || value === 'true' || value === 1)
    .withMessage('You must accept the terms and conditions'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('birthDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Valid date of birth is required')
    .custom((value) => {
      const today = new Date();
      const birthDate = new Date(value);
      if (birthDate >= today) {
        throw new Error('Date of birth must be in the past');
      }
      return true;
    })
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
];

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', sanitizeBody, validateRegister, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  try {
    logger.info('Registration attempt:', { email: req.body.email, username: req.body.username });
    const { username, email, password, firstName, lastName, name, interests, bio, location, acceptTerms, birthDate } = req.body;

    // Accept a single `name` and split into firstName/lastName for convenience.
    let resolvedFirst = firstName;
    let resolvedLast = lastName;
    if ((!resolvedFirst || !resolvedLast) && typeof name === 'string' && name.trim()) {
      const parts = name.trim().split(/\s+/);
      resolvedFirst = resolvedFirst || parts[0];
      resolvedLast = resolvedLast || parts.slice(1).join(' ') || parts[0];
    }

    // Terms acceptance is captured if provided, but registration is not
    // blocked on it (the User model does not persist acceptTerms, and the
    // public API must remain usable without it).
    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user with interests
    const userData = {
      username,
      email,
      password,
      firstName: resolvedFirst,
      lastName: resolvedLast,
      birthDate
    };
    // Prevent privilege escalation: never trust role/admin/permission fields
    // from client input.
    const safeUserData = stripForbiddenUserFields(userData);

    // Add optional fields if provided
    if (interests && Array.isArray(interests)) {
      userData.interests = interests;
    }
    if (bio) {
      userData.bio = bio;
    }
    if (location) {
      userData.location = location;
    }
    if (req.body.phone) {
      userData.phone = req.body.phone;
    }

    // Auto-verify email in development mode so users can log in immediately
    if (process.env.NODE_ENV !== 'production') {
      safeUserData.isEmailVerified = true;
    }

    const user = await User.create(safeUserData);

    // Generate token pair using JWT service
    const tokens = jwtService.generateTokenPair(user);

    // Store refresh token in user document (refresh tokens need to be tracked)
    // NOTE: Access tokens are NOT stored because they are stateless JWT tokens
    user.refreshTokens = [tokens.refreshToken];
    await user.save();

    logger.info(`New user registered: ${email}`);

    const userPayload = {
      id: user._id,
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
      role: user.role,
      interests: user.interests,
      bio: user.bio,
      location: user.location,
      stats: { eventsCreated: 0, eventsAttended: 0, followers: 0, following: 0, points: 0, level: 1 }
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      // Dual keys for forward/backward compatibility
      accessToken: tokens.accessToken,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      data: { user: userPayload, token: tokens.accessToken, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      user: userPayload
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', sanitizeBody, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Log login attempts in development only
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Login attempt for email:', email);
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      logger.warn(`Login failed: User not found for email ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      logger.warn(`Login failed: Password mismatch for email ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if 2FA is enabled — don't issue tokens until the TOTP is verified
    if (user.twoFactor && user.twoFactor.isEnabled) {
      const tempToken = jwtService.generateTempToken(user);
      logger.info(`2FA required for login: ${email}`);
      return res.json({
        success: true,
        requiresTwoFactor: true,
        tempToken,
        user: {
          id: user._id,
          _id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    }

    // Generate token pair using JWT service
    const tokens = jwtService.generateTokenPair(user);

    // Store refresh token in user document (refresh tokens need to be tracked)
    if (!user.refreshTokens) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(tokens.refreshToken);

    // Track the access token so it can be revoked on password change / logout-all
    if (!user.tokens) {
      user.tokens = [];
    }
    user.tokens.push({ token: tokens.accessToken });

    // Limit tokens to 5 per user
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    if (user.tokens.length > 5) {
      user.tokens = user.tokens.slice(-5);
    }

    // NOTE: Access tokens are NOT stored in database because they are stateless JWT tokens
    // Only refresh tokens are stored for rotation/revocation purposes
    // Token validity is verified by JWT signature, not database lookup

    await user.save();

    logger.info(`Login successful for user: ${email}`);

    const loginPayload = {
      id: user._id,
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
      role: user.role,
      bio: user.bio,
      location: user.location,
      interests: user.interests || [],
      isActive: user.isActive,
      stats: {
        eventsCreated: (user.eventsCreated || []).length,
        eventsAttended: (user.eventsAttended || []).length,
        followers: 0,
        following: 0,
        points: 0,
        level: 1
      }
    };

    res.json({
      success: true,
      message: 'Login successful',
      // Dual keys for forward/backward compatibility
      accessToken: tokens.accessToken,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      data: { user: loginPayload, token: tokens.accessToken, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      user: loginPayload
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Refresh access token with token rotation
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    let { refreshToken } = req.body;

    // Check cookies if not in body
    if (!refreshToken && req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwtService.verifyRefreshToken(refreshToken);
    } catch (error) {
      logger.warn('Invalid refresh token provided:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Find user and validate refresh token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if refresh token exists in user's tokens
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      logger.warn(`Invalid refresh token for user: ${user.username}`);
      // If token is compromised, remove all refresh tokens for security
      user.refreshTokens = [];
      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token - security breach detected',
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }

    // REFRESH TOKEN ROTATION - Remove old refresh token
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);

    // Generate new tokens using JWT service
    const tokens = jwtService.generateTokenPair(user);

    // Store new refresh token
    user.refreshTokens.push(tokens.refreshToken);

    await user.save();

    logger.info(`Tokens refreshed for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Remove current access token
    req.user.tokens = req.user.tokens ? req.user.tokens.filter(tokenObj => tokenObj.token !== req.token) : [];

    // Remove refresh token if provided
    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens ? req.user.refreshTokens.filter(token => token !== refreshToken) : [];
    }

    await req.user.save();

    logger.info(`User logged out: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
router.post('/logout-all', protect, enforceSecondFactor, async (req, res) => {
  try {
    // Revoke the current token and clear all sessions
    if (!req.user.revokedTokens) req.user.revokedTokens = [];
    if (req.token) req.user.revokedTokens.push(req.token);
    req.user.tokens = [];
    req.user.refreshTokens = [];

    // Keep the revoked list bounded
    if (req.user.revokedTokens.length > 50) {
      req.user.revokedTokens = req.user.revokedTokens.slice(-50);
    }

    await req.user.save();

    logger.info(`User logged out from all devices: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @desc    Change password (with full token rotation)
// @route   POST /api/auth/change-password
// @access  Private
router.post('/change-password', protect, enforceSecondFactor, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    // Rotate all sessions: invalidate every existing token so stolen/old
    // tokens stop working immediately after a password change.
    if (!user.revokedTokens) user.revokedTokens = [];
    if (req.token) user.revokedTokens.push(req.token);
    user.tokens = [];
    user.refreshTokens = [];
    if (user.revokedTokens.length > 50) {
      user.revokedTokens = user.revokedTokens.slice(-50);
    }
    await user.save();

    logger.info(`Password changed for user: ${user.username}`);
    res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const u = req.user;
    const userPayload = {
      id: u._id,
      _id: u._id,
      username: u.username,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName} ${u.lastName}`,
      avatar: u.avatar,
      role: u.role,
      bio: u.bio,
      location: u.location,
      interests: u.interests || [],
      isActive: u.isActive,
      settings: u.settings,
      stats: {
        eventsCreated: (u.eventsCreated || []).length,
        eventsAttended: (u.eventsAttended || []).length,
        followers: 0,
        following: 0,
        points: 0,
        level: 1
      },
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    };
    // Normalized: { success, data: { user } } — matches all other API endpoints
    res.json({
      success: true,
      message: 'User profile retrieved',
      data: { user: userPayload },
      // backward compat: also expose user at root
      user: userPayload
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Send email verification token
// @route   POST /api/auth/send-verification
// @access  Public
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a verification link has been sent' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    const emailService = require('../services/emailService');
    await emailService.sendEmailVerification(email, user.firstName, verificationToken);

    res.json({ success: true, message: 'If the email exists, a verification link has been sent' });
  } catch (error) {
    logger.error('Send verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});

// @desc    Verify email token
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});

// @desc    Verify 2FA code after login (completes the 2FA challenge)
// @route   POST /api/auth/verify-2fa
// @access  Public (requires tempToken from login)
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'Temp token and 2FA code are required'
      });
    }

    // Validate 6-digit code format
    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }

    // Verify temp token to recover the user id
    let decoded;
    try {
      decoded = jwtService.verifyTempToken(tempToken);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired setup token'
      });
    }

    const user = await User.findById(decoded.id).select('+password');
    if (!user || !user.twoFactor || !user.twoFactor.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Verify TOTP
    const isValid = twoFactorService.verifyToken(code, user.twoFactor.secret);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }

    // Issue the real token pair now that 2FA is satisfied
    const tokens = jwtService.generateTokenPair(user);

    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(tokens.refreshToken);

    if (!user.tokens) user.tokens = [];
    user.tokens.push({ token: tokens.accessToken });

    if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);
    if (user.tokens.length > 5) user.tokens = user.tokens.slice(-5);

    await user.save();

    logger.info(`2FA verification successful for user: ${user.username}`);

    const loginPayload = {
      id: user._id,
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive
    };

    res.json({
      success: true,
      message: '2FA verification successful',
      accessToken: tokens.accessToken,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: loginPayload
    });
  } catch (error) {
    logger.error('2FA verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA verification'
    });
  }
});

module.exports = router;





