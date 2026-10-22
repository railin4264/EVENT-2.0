/**
 * OAuth Routes for EventConnect 2.0
 * Handles Google, Facebook, and other OAuth authentication
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const { trackSecurityEvent } = require('../middleware/sentryMiddleware');
const oauthService = require('../services/oauthService');
const User = require('../models/User');
const logger = require('../utils/logger');
const crypto = require('crypto');
const jwtService = require('../services/jwtService');

const router = express.Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});

function publicOAuthAccounts(user) {
  return (user.oauthAccounts || []).map(account => ({
    provider: account.provider,
    email: account.email,
    linkedAt: account.linkedAt,
    lastUsed: account.lastUsed,
    expiresAt: account.expiresAt
  }));
}

// Rate limiting for OAuth routes
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { success: false, message: 'Too many OAuth requests' }
});

// @desc    Get available OAuth providers
// @route   GET /api/oauth/providers
// @access  Public
router.get('/providers', async (req, res) => {
  try {
    const providers = oauthService.getEnabledProviders().map(provider => ({
      name: provider,
      ...oauthService.getProviderInfo(provider)
    }));

    res.json({
      success: true,
      message: 'OAuth providers retrieved',
      data: { providers }
    });
  } catch (error) {
    logger.error('Error getting OAuth providers:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving OAuth providers'
    });
  }
});

// Validate redirect_url against Open Redirect phishing
function sanitizeRedirectUrl(url) {
  if (!url || typeof url !== 'string') return '/';
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : []),
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : []),
      'http://localhost:3000'
    ].filter(Boolean).map(o => {
      try { return new URL(o).origin; } catch { return o; }
    });
    if (allowedOrigins.includes(parsed.origin)) {
      return trimmed;
    }
  } catch {
    // Fallback to '/'
  }
  return '/';
}

// @desc    Initiate OAuth authentication
// @route   GET /api/oauth/:provider/auth
// @access  Public
router.get('/:provider/auth', oauthLimiter, trackSecurityEvent('oauth_initiate'), async (req, res) => {
  try {
    const { provider } = req.params;
    const safeRedirectUrl = sanitizeRedirectUrl(req.query.redirect_url);

    // Validate provider
    if (!oauthService.isProviderEnabled(provider)) {
      return res.status(400).json({
        success: false,
        message: 'OAuth provider not supported or not enabled'
      });
    }

    let authData;

    switch (provider) {
    case 'google':
      authData = await oauthService.getGoogleAuthUrl(safeRedirectUrl);
      break;
    case 'facebook':
      authData = await oauthService.getFacebookAuthUrl(safeRedirectUrl);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Unsupported OAuth provider'
      });
    }

    logger.info(`OAuth authentication initiated for provider: ${provider}`);

    res.json({
      success: true,
      message: 'OAuth authentication URL generated',
      data: {
        authUrl: authData.authUrl,
        state: authData.state,
        provider
      }
    });
  } catch (error) {
    logger.error('Error initiating OAuth authentication:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating OAuth authentication'
    });
  }
});

// @desc    Handle OAuth callback and authenticate user
// @route   POST /api/oauth/:provider/callback
// @access  Public
router.post('/:provider/callback', oauthLimiter, trackSecurityEvent('oauth_callback'), async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error } = req.body;

    // Check for OAuth error
    if (error) {
      logger.warn(`OAuth error from ${provider}:`, error);
      return res.status(400).json({
        success: false,
        message: 'OAuth authentication failed',
        error: error
      });
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing required OAuth parameters'
      });
    }

    // Validate provider
    if (!oauthService.isProviderEnabled(provider)) {
      return res.status(400).json({
        success: false,
        message: 'OAuth provider not supported or not enabled'
      });
    }

    let oauthInfo;

    // Verify OAuth token based on provider
    switch (provider) {
    case 'google':
      oauthInfo = await oauthService.verifyGoogleToken(code, state);
      break;
    case 'facebook':
      oauthInfo = await oauthService.verifyFacebookToken(code, state);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Unsupported OAuth provider'
      });
    }

    if (!oauthInfo.providerId) {
      return res.status(401).json({ success: false, message: 'Invalid OAuth identity' });
    }
    // The linked provider identity takes precedence over an email that may change.
    let user = await User.findOne({ oauthAccounts: { $elemMatch: {
      provider, providerId: oauthInfo.providerId
    } } });
    if (!user && oauthInfo.email) {
      if (oauthInfo.emailVerified !== true) {
        return res.status(403).json({ success: false, code: 'VERIFIED_EMAIL_REQUIRED', message: 'Verify your provider email or link this account after signing in' });
      }
      user = await User.findOne({ email: oauthInfo.email.trim().toLowerCase() });
    }

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is unavailable' });
      }
      if (user.twoFactor?.isEnabled) {
        return res.json({
          success: true,
          requiresTwoFactor: true,
          tempToken: jwtService.generateTempToken(user),
          user: { id: user._id, username: user.username, email: user.email },
          redirectUrl: oauthInfo.originalUrl
        });
      }
      // Existing user - link OAuth account and login
      await oauthService.linkOAuthAccount(user, oauthInfo);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = user.getSignedJwtToken();

      logger.info(`OAuth login successful for existing user: ${user.email} via ${provider}`);

      res.json({
        success: true,
        message: 'OAuth authentication successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          country: user.country || 'República Dominicana',
          countryCode: user.countryCode || 'DO',
          preferredLocale: user.preferredLocale || 'es-DO',
          preferredCurrency: user.preferredCurrency || 'DOP',
          oauthAccounts: publicOAuthAccounts(user)
        },
        redirectUrl: oauthInfo.originalUrl
      });
    } else {
      // New user - create account and link OAuth
      if (!oauthInfo.email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required for account creation',
          code: 'EMAIL_REQUIRED'
        });
      }

      // Generate username from email
      const candidate = oauthInfo.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 22);
      const baseUsername = candidate.length >= 3 ? candidate : `persona${candidate}`;
      let username = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create new user with localized psychology
      const rawCountryCode = String(req.body?.countryCode || oauthInfo.countryCode || '').toUpperCase();
      const rawLocale = String(oauthInfo.locale || '').toUpperCase();
      const countryCode = rawCountryCode || (rawLocale.includes('ES') ? 'ES' : rawLocale.includes('MX') ? 'MX' : rawLocale.includes('US') ? 'US' : rawLocale.includes('CO') ? 'CO' : rawLocale.includes('AR') ? 'AR' : 'DO');
      const country = countryCode === 'ES' ? 'España' : countryCode === 'MX' ? 'México' : countryCode === 'US' ? 'Estados Unidos' : countryCode === 'CO' ? 'Colombia' : countryCode === 'AR' ? 'Argentina' : 'República Dominicana';
      const preferredLocale = countryCode === 'ES' ? 'es-ES' : countryCode === 'MX' ? 'es-MX' : countryCode === 'US' ? 'en-US' : countryCode === 'CO' ? 'es-CO' : countryCode === 'AR' ? 'es-AR' : 'es-DO';
      const preferredCurrency = countryCode === 'ES' ? 'EUR' : countryCode === 'MX' ? 'MXN' : countryCode === 'US' ? 'USD' : countryCode === 'CO' ? 'COP' : countryCode === 'AR' ? 'ARS' : 'DOP';

      const userData = {
        username,
        email: oauthInfo.email,
        firstName: oauthInfo.firstName || 'User',
        lastName: oauthInfo.lastName || '',
        avatar: oauthInfo.avatar || 'default-avatar.png',
        country,
        countryCode,
        preferredLocale,
        preferredCurrency,
        isEmailVerified: oauthInfo.emailVerified || false,
        password: crypto.randomBytes(48).toString('base64url'),
        lastLogin: new Date()
      };

      user = new User(userData);

      // Link OAuth account
      await oauthService.linkOAuthAccount(user, oauthInfo);

      await user.save();

      // Generate JWT token
      const token = user.getSignedJwtToken();

      logger.info(`OAuth registration successful for new user: ${user.email} via ${provider}`);

      res.status(201).json({
        success: true,
        message: 'OAuth registration successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          country: user.country || 'República Dominicana',
          countryCode: user.countryCode || 'DO',
          preferredLocale: user.preferredLocale || 'es-DO',
          preferredCurrency: user.preferredCurrency || 'DOP',
          oauthAccounts: publicOAuthAccounts(user)
        },
        isNewUser: true,
        redirectUrl: oauthInfo.originalUrl
      });
    }
  } catch (error) {
    logger.error('Error handling OAuth callback:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing OAuth authentication'
    });
  }
});

// @desc    Link OAuth account to existing user
// @route   POST /api/oauth/:provider/link
// @access  Private
router.post('/:provider/link', protect, oauthLimiter, trackSecurityEvent('oauth_link'), async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.body;
    const user = req.user;

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing required OAuth parameters'
      });
    }

    // Validate provider
    if (!oauthService.isProviderEnabled(provider)) {
      return res.status(400).json({
        success: false,
        message: 'OAuth provider not supported or not enabled'
      });
    }

    // Check if account is already linked
    const existingAccount = oauthService.getOAuthAccount(user, provider);
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: `${provider} account is already linked to this user`
      });
    }

    let oauthInfo;

    // Verify OAuth token based on provider
    switch (provider) {
    case 'google':
      oauthInfo = await oauthService.verifyGoogleToken(code, state);
      break;
    case 'facebook':
      oauthInfo = await oauthService.verifyFacebookToken(code, state);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Unsupported OAuth provider'
      });
    }

    // Check if OAuth account is already linked to another user
    {
      const existingUser = await User.findOne({
        _id: { $ne: user._id },
        oauthAccounts: { $elemMatch: { provider, providerId: oauthInfo.providerId } }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: `This ${provider} account is already linked to another user`
        });
      }
    }

    // Link OAuth account
    await oauthService.linkOAuthAccount(user, oauthInfo);
    await user.save();

    logger.info(`OAuth account linked: ${provider} for user ${user.username}`);

    res.json({
      success: true,
      message: `${provider} account linked successfully`,
      data: {
        oauthAccounts: publicOAuthAccounts(user)
      }
    });
  } catch (error) {
    logger.error('Error linking OAuth account:', error);
    res.status(500).json({
      success: false,
      message: 'Error linking OAuth account'
    });
  }
});

// @desc    Unlink OAuth account from user
// @route   DELETE /api/oauth/:provider/unlink
// @access  Private
router.delete('/:provider/unlink', protect, oauthLimiter, trackSecurityEvent('oauth_unlink'), async (req, res) => {
  try {
    const { provider } = req.params;
    const user = req.user;

    // Validate provider
    if (!oauthService.isProviderEnabled(provider)) {
      return res.status(400).json({
        success: false,
        message: 'OAuth provider not supported or not enabled'
      });
    }

    // Check if account is linked
    const existingAccount = oauthService.getOAuthAccount(user, provider);
    if (!existingAccount) {
      return res.status(400).json({
        success: false,
        message: `${provider} account is not linked to this user`
      });
    }

    // Ensure user has a password if unlinking all OAuth accounts
    const remainingOAuthAccounts = user.oauthAccounts.filter(acc => acc.provider !== provider);
    if (remainingOAuthAccounts.length === 0 && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unlink last OAuth account without setting a password first',
        code: 'REQUIRES_PASSWORD'
      });
    }

    // Unlink OAuth account
    await oauthService.unlinkOAuthAccount(user, provider);
    await user.save();

    logger.info(`OAuth account unlinked: ${provider} for user ${user.username}`);

    res.json({
      success: true,
      message: `${provider} account unlinked successfully`,
      data: {
        oauthAccounts: publicOAuthAccounts(user)
      }
    });
  } catch (error) {
    logger.error('Error unlinking OAuth account:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlinking OAuth account'
    });
  }
});

// @desc    Get user's linked OAuth accounts
// @route   GET /api/oauth/accounts
// @access  Private
router.get('/accounts', protect, async (req, res) => {
  try {
    const user = req.user;

    const linkedAccounts = (user.oauthAccounts || []).map(account => ({
      provider: account.provider,
      email: account.email,
      linkedAt: account.linkedAt,
      lastUsed: account.lastUsed,
      ...oauthService.getProviderInfo(account.provider)
    }));

    const availableProviders = oauthService.getEnabledProviders()
      .filter(provider => !linkedAccounts.find(acc => acc.provider === provider))
      .map(provider => ({
        provider,
        ...oauthService.getProviderInfo(provider)
      }));

    res.json({
      success: true,
      message: 'OAuth accounts retrieved',
      data: {
        linkedAccounts,
        availableProviders
      }
    });
  } catch (error) {
    logger.error('Error getting OAuth accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving OAuth accounts'
    });
  }
});

// @desc    Refresh OAuth access token
// @route   POST /api/oauth/:provider/refresh
// @access  Private
router.post('/:provider/refresh', protect, async (req, res) => {
  try {
    const { provider } = req.params;
    const user = req.user;

    // Validate provider
    if (!oauthService.isProviderEnabled(provider)) {
      return res.status(400).json({
        success: false,
        message: 'OAuth provider not supported or not enabled'
      });
    }

    // Get OAuth account
    const oauthAccount = oauthService.getOAuthAccount(user, provider);
    if (!oauthAccount) {
      return res.status(400).json({
        success: false,
        message: `${provider} account is not linked to this user`
      });
    }

    // Check if refresh is needed
    if (!oauthService.needsTokenRefresh(oauthAccount)) {
      return res.json({
        success: true,
        message: 'Token is still valid',
        data: {
          expiresAt: oauthAccount.expiresAt
        }
      });
    }

    let refreshResult;

    // Refresh token based on provider
    switch (provider) {
    case 'google':
      if (!oauthAccount.refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'No refresh token available for Google account'
        });
      }
      refreshResult = await oauthService.refreshGoogleToken(oauthAccount.refreshToken);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Token refresh not supported for this provider'
      });
    }

    // Update OAuth account with new tokens
    const accountIndex = user.oauthAccounts.findIndex(acc => acc.provider === provider);
    user.oauthAccounts[accountIndex].accessToken = refreshResult.accessToken;
    user.oauthAccounts[accountIndex].expiresAt = refreshResult.expiresAt;
    if (refreshResult.refreshToken) {
      user.oauthAccounts[accountIndex].refreshToken = refreshResult.refreshToken;
    }

    await user.save();

    logger.info(`OAuth token refreshed for ${provider} account of user ${user.username}`);

    res.json({
      success: true,
      message: 'OAuth token refreshed successfully',
      data: {
        expiresAt: refreshResult.expiresAt
      }
    });
  } catch (error) {
    logger.error('Error refreshing OAuth token:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing OAuth token'
    });
  }
});

module.exports = router;
