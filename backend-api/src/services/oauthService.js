/**
 * OAuth Service for EventConnect 2.0
 * Handles Google, Facebook, and other OAuth providers
 */

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const OAuthState = require('../models/OAuthState');

class OAuthService {
  constructor() {
    // Google OAuth client
    this.googleClient = this.createGoogleClient();

    // Facebook OAuth configuration
    this.facebookConfig = {
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      redirectUri: process.env.FACEBOOK_REDIRECT_URI,
      apiUrl: 'https://graph.facebook.com/v18.0'
    };

    // State validity (10 minutes); Mongo also expires consumed/abandoned records.
    this.stateTTL = 600;
  }

  createGoogleClient() {
    return new OAuth2Client({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI
    });
  }

  /**
   * Generate OAuth state parameter for security
   * @param {string} provider - OAuth provider name
   * @param {string} originalUrl - Original URL to redirect after auth
   * @returns {string} State parameter
   */
  async generateState(provider, originalUrl = null) {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      await OAuthState.create({
        _id: crypto.createHash('sha256').update(state).digest('hex'),
        provider,
        originalUrl: originalUrl || '/',
        expiresAt: new Date(Date.now() + this.stateTTL * 1000)
      });

      logger.debug(`OAuth state generated for ${provider}`);
      return state;
    } catch (error) {
      logger.error('Error generating OAuth state:', error);
      throw new Error('Failed to generate OAuth state');
    }
  }

  /**
   * Verify OAuth state parameter
   * @param {string} state - State parameter to verify
   * @returns {Object|null} State data or null if invalid
   */
  async verifyState(state, provider) {
    try {
      if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state)) {
        return null;
      }

      return await OAuthState.findOneAndDelete({
        _id: crypto.createHash('sha256').update(state).digest('hex'),
        ...(provider ? { provider } : {}),
        expiresAt: { $gt: new Date() }
      }).lean();
    } catch (error) {
      logger.error('Error verifying OAuth state:', error);
      return null;
    }
  }

  isConfigured(provider) {
    if (provider === 'google') {
      return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REDIRECT_URI);
    }
    if (provider === 'facebook') {
      return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
    }
    return false;
  }

  // Google OAuth Methods

  /**
   * Get Google OAuth authorization URL
   * @param {string} originalUrl - Original URL to redirect after auth
   * @returns {Object} Authorization URL and state
   */
  async getGoogleAuthUrl(originalUrl = null) {
    try {
      const state = await this.generateState('google', originalUrl);

      if (!this.isConfigured('google')) {
        if (process.env.NODE_ENV !== 'development') throw new Error('Google OAuth is not configured');
        logger.info('Google credentials not configured in .env; providing simulated multi-account Google selection');
        return {
          authUrl: '/oauth/google/dev-select?state=' + state + '&redirect=' + encodeURIComponent(originalUrl || '/'),
          state,
          devMode: true
        };
      }

      const authUrl = this.googleClient.generateAuthUrl({
        scope: ['openid', 'profile', 'email'],
        state: state,
        prompt: 'select_account'
      });

      logger.info('Google OAuth URL generated');
      return { authUrl, state, devMode: false };
    } catch (error) {
      logger.error('Error generating Google OAuth URL:', error);
      throw new Error('Failed to generate Google OAuth URL');
    }
  }

  /**
   * Verify Google OAuth token and get user info
   * @param {string} code - Authorization code from Google
   * @param {string} state - State parameter for verification
   * @returns {Object} User information from Google
   */
  async verifyGoogleToken(code, state) {
    try {
      // Verify state parameter
      const stateData = await this.verifyState(state, 'google');
      if (!stateData || stateData.provider !== 'google') {
        throw new Error('Invalid OAuth state');
      }

      if (typeof code === 'string' && code.startsWith('dev_google_')) {
        // The simulated picker trusts a client-supplied email: outside local development
        // without real credentials it would let anyone sign in as any account.
        if (process.env.NODE_ENV !== 'development' || this.isConfigured('google')) {
          throw new Error('Simulated Google sign-in is disabled');
        }
        const encoded = code.replace('dev_google_', '');
        let devData = {};
        try {
          devData = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
        } catch {
          devData = { email: 'dev_user@gmail.com', name: 'Usuario Google' };
        }
        const email = (devData.email || 'google_user@gmail.com').toLowerCase();
        const firstName = devData.firstName || devData.name?.split(' ')[0] || 'Google';
        const lastName = devData.lastName || devData.name?.split(' ').slice(1).join(' ') || 'User';
        const locale = devData.locale || 'es-DO';
        const sub = 'dev_google_sub_' + Buffer.from(email).toString('hex').slice(0, 16);
        logger.info('Simulated Google OAuth account selected: ' + email);
        return {
          provider: 'google',
          providerId: sub,
          email,
          emailVerified: true,
          firstName,
          lastName,
          fullName: (firstName + ' ' + lastName).trim(),
          avatar: devData.avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(firstName)),
          locale,
          countryCode: devData.countryCode || (locale.includes('ES') ? 'ES' : locale.includes('MX') ? 'MX' : locale.includes('CO') ? 'CO' : locale.includes('AR') ? 'AR' : locale.includes('US') ? 'US' : 'DO'),
          accessToken: 'mock_google_access_token',
          refreshToken: 'mock_google_refresh_token',
          expiresAt: new Date(Date.now() + 3600 * 1000),
          raw: { sub, email, email_verified: true, name: (firstName + ' ' + lastName).trim() },
          originalUrl: stateData.originalUrl
        };
      }

      // Exchange code for tokens
      const client = this.createGoogleClient();
      const { tokens } = await client.getToken(code);

      // Verify the ID token
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID
      });

      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new Error('Google identity requires a verified email');
      }

      const userInfo = {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        firstName: payload.given_name,
        lastName: payload.family_name,
        fullName: payload.name,
        avatar: payload.picture,
        locale: payload.locale,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        raw: payload,
        originalUrl: stateData.originalUrl
      };

      logger.info(`Google OAuth verification successful for user: ${userInfo.email}`);
      return userInfo;
    } catch (error) {
      // Provider errors can contain request URLs, authorization codes or tokens.
      logger.warn('Google OAuth verification failed');
      throw new Error('Failed to verify Google token');
    }
  }

  /**
   * Refresh Google access token
   * @param {string} refreshToken - Google refresh token
   * @returns {Object} New access token info
   */
  async refreshGoogleToken(refreshToken) {
    try {
      const client = this.createGoogleClient();
      client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await client.refreshAccessToken();

      return {
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        refreshToken: credentials.refresh_token || refreshToken // Keep old refresh token if new one not provided
      };
    } catch (error) {
      logger.warn('Google OAuth token refresh failed');
      throw new Error('Failed to refresh Google token');
    }
  }

  // Facebook OAuth Methods

  /**
   * Get Facebook OAuth authorization URL
   * @param {string} originalUrl - Original URL to redirect after auth
   * @returns {Object} Authorization URL and state
   */
  async getFacebookAuthUrl(originalUrl = null) {
    try {
      const state = await this.generateState('facebook', originalUrl);

      const params = new URLSearchParams({
        client_id: this.facebookConfig.clientId,
        redirect_uri: this.facebookConfig.redirectUri,
        scope: 'email,public_profile',
        response_type: 'code',
        state: state
      });

      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

      logger.info('Facebook OAuth URL generated');
      return { authUrl, state };
    } catch (error) {
      logger.error('Error generating Facebook OAuth URL:', error);
      throw new Error('Failed to generate Facebook OAuth URL');
    }
  }

  /**
   * Verify Facebook OAuth token and get user info
   * @param {string} code - Authorization code from Facebook
   * @param {string} state - State parameter for verification
   * @returns {Object} User information from Facebook
   */
  async verifyFacebookToken(code, state) {
    try {
      // Verify state parameter
      const stateData = await this.verifyState(state, 'facebook');
      if (!stateData || stateData.provider !== 'facebook') {
        throw new Error('Invalid OAuth state');
      }

      // Exchange code for access token
      const tokenResponse = await axios.get(`${this.facebookConfig.apiUrl}/oauth/access_token`, {
        params: {
          client_id: this.facebookConfig.clientId,
          client_secret: this.facebookConfig.clientSecret,
          redirect_uri: this.facebookConfig.redirectUri,
          code: code
        }
      });

      const { access_token, expires_in } = tokenResponse.data;

      // Get user information
      const userResponse = await axios.get(`${this.facebookConfig.apiUrl}/me`, {
        params: {
          fields: 'id,name,email,first_name,last_name,picture.width(200).height(200),locale,verified',
          access_token: access_token
        }
      });

      const userData = userResponse.data;

      const userInfo = {
        provider: 'facebook',
        providerId: userData.id,
        email: userData.email,
        emailVerified: userData.verified,
        firstName: userData.first_name,
        lastName: userData.last_name,
        fullName: userData.name,
        avatar: userData.picture?.data?.url,
        locale: userData.locale,
        accessToken: access_token,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        raw: userData,
        originalUrl: stateData.originalUrl
      };

      logger.info(`Facebook OAuth verification successful for user: ${userInfo.email || userInfo.providerId}`);
      return userInfo;
    } catch (error) {
      logger.warn('Facebook OAuth verification failed');
      throw new Error('Failed to verify Facebook token');
    }
  }

  // Generic OAuth Methods

  /**
   * Get OAuth provider information
   * @param {string} provider - Provider name
   * @returns {Object} Provider configuration
   */
  getProviderInfo(provider) {
    const providers = {
      google: {
        name: 'Google',
        icon: 'google',
        color: '#db4437',
        // The simulated account picker exists only for local development.
        enabled: this.isConfigured('google') || process.env.NODE_ENV === 'development',
        devMode: !this.isConfigured('google')
      },
      facebook: {
        name: 'Facebook',
        icon: 'facebook',
        color: '#4267b2',
        enabled: this.isConfigured('facebook')
      }
    };

    return providers[provider] || null;
  }

  /**
   * Get all enabled OAuth providers
   * @returns {Array} List of enabled providers
   */
  getEnabledProviders() {
    const providers = ['google', 'facebook'];
    return providers.filter(provider => {
      const info = this.getProviderInfo(provider);
      return info && info.enabled;
    });
  }

  /**
   * Validate OAuth provider
   * @param {string} provider - Provider name
   * @returns {boolean} Whether provider is valid and enabled
   */
  isProviderEnabled(provider) {
    const info = this.getProviderInfo(provider);
    return info && info.enabled;
  }

  /**
   * Create or update OAuth account link
   * @param {Object} user - User document
   * @param {Object} oauthInfo - OAuth information
   * @returns {Object} Updated OAuth accounts
   */
  async linkOAuthAccount(user, oauthInfo) {
    try {
      if (!user.oauthAccounts) {
        user.oauthAccounts = [];
      }

      const existing = user.oauthAccounts.find(account => account.provider === oauthInfo.provider);
      const oauthAccount = {
        provider: oauthInfo.provider,
        providerId: oauthInfo.providerId,
        email: oauthInfo.email,
        expiresAt: oauthInfo.expiresAt,
        lastUsed: new Date()
      };
      if (oauthInfo.accessToken) oauthAccount.accessToken = oauthInfo.accessToken;
      // Google often omits this on subsequent logins. Preserve the existing
      // refresh credential, including when it was excluded from the query.
      if (oauthInfo.refreshToken) oauthAccount.refreshToken = oauthInfo.refreshToken;
      if (existing) {
        Object.assign(existing, oauthAccount);
      } else {
        user.oauthAccounts.push({ ...oauthAccount, linkedAt: new Date() });
      }

      // Update user profile if not already set
      if (!user.avatar && oauthInfo.avatar) {
        user.avatar = oauthInfo.avatar;
      }

      if (!user.firstName && oauthInfo.firstName) {
        user.firstName = oauthInfo.firstName;
      }

      if (!user.lastName && oauthInfo.lastName) {
        user.lastName = oauthInfo.lastName;
      }

      logger.info(`OAuth account linked: ${oauthInfo.provider} for user ${user.username}`);
      return user.oauthAccounts;
    } catch (error) {
      logger.error('Error linking OAuth account:', error);
      throw new Error('Failed to link OAuth account');
    }
  }

  /**
   * Unlink OAuth account
   * @param {Object} user - User document
   * @param {string} provider - Provider to unlink
   * @returns {Object} Updated OAuth accounts
   */
  async unlinkOAuthAccount(user, provider) {
    try {
      if (!user.oauthAccounts) {
        throw new Error('No OAuth accounts found');
      }

      const existing = user.oauthAccounts.find(account => account.provider === provider);
      if (!existing) {
        throw new Error('OAuth account not found');
      }
      // Mongoose records a targeted pull instead of replacing other providers'
      // subdocuments whose credentials were deliberately not selected.
      user.oauthAccounts.pull(existing._id);

      logger.info(`OAuth account unlinked: ${provider} for user ${user.username}`);
      return user.oauthAccounts;
    } catch (error) {
      logger.error('Error unlinking OAuth account:', error);
      throw error;
    }
  }

  /**
   * Get OAuth account for provider
   * @param {Object} user - User document
   * @param {string} provider - Provider name
   * @returns {Object|null} OAuth account or null
   */
  getOAuthAccount(user, provider) {
    if (!user) return null;
    return (
      user.oauthAccounts?.find(acc => acc.provider === provider) ||
      (user.oauth?.[provider]?.id ? { provider, ...user.oauth[provider] } : null)
    );
  }

  /**
   * Check if access token needs refresh
   * @param {Object} oauthAccount - OAuth account object
   * @returns {boolean} Whether token needs refresh
   */
  needsTokenRefresh(oauthAccount) {
    return Boolean(
      oauthAccount?.expiresAt &&
      new Date(oauthAccount.expiresAt) <= new Date(Date.now() + 5 * 60 * 1000)
    );
  }
}

// Create singleton instance
const oauthService = new OAuthService();

module.exports = oauthService;
