/**
 * OAuth Service for EventConnect 2.0
 * Handles Google, Facebook, and other OAuth providers
 */

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class OAuthService {
  constructor() {
    // Google OAuth client
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    // Facebook OAuth configuration
    this.facebookConfig = {
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      redirectUri: process.env.FACEBOOK_REDIRECT_URI,
      apiUrl: 'https://graph.facebook.com/v18.0'
    };

    // State parameter cache TTL (10 minutes)
    this.stateTTL = 600;
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
      const stateData = {
        provider,
        originalUrl,
        timestamp: Date.now()
      };

      // Store state in cache
      await cacheService.set(`oauth_state:${state}`, stateData, this.stateTTL);

      logger.debug(`OAuth state generated for ${provider}: ${state}`);
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
  async verifyState(state) {
    try {
      if (!state) {
        return null;
      }

      const stateData = await cacheService.get(`oauth_state:${state}`);
      if (!stateData) {
        return null;
      }

      // Check if state is not older than TTL
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > this.stateTTL * 1000) {
        await cacheService.del(`oauth_state:${state}`);
        return null;
      }

      // Remove state after verification (single use)
      await cacheService.del(`oauth_state:${state}`);

      return stateData;
    } catch (error) {
      logger.error('Error verifying OAuth state:', error);
      return null;
    }
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

      const authUrl = this.googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        state: state,
        prompt: 'consent' // Force consent screen to get refresh token
      });

      logger.info('Google OAuth URL generated');
      return { authUrl, state };
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
      const stateData = await this.verifyState(state);
      if (!stateData || stateData.provider !== 'google') {
        throw new Error('Invalid OAuth state');
      }

      // Exchange code for tokens
      const { tokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(tokens);

      // Verify the ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID
      });

      const payload = ticket.getPayload();

      // Get additional user info from Google API
      const userInfoResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`
      );

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
      logger.error('Error verifying Google token:', error);
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
      this.googleClient.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.googleClient.refreshAccessToken();

      return {
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        refreshToken: credentials.refresh_token || refreshToken // Keep old refresh token if new one not provided
      };
    } catch (error) {
      logger.error('Error refreshing Google token:', error);
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
      const stateData = await this.verifyState(state);
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
      logger.error('Error verifying Facebook token:', error);
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
        enabled: !!process.env.GOOGLE_OAUTH_CLIENT_ID
      },
      facebook: {
        name: 'Facebook',
        icon: 'facebook',
        color: '#4267b2',
        enabled: !!process.env.FACEBOOK_APP_ID
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

      // Remove existing account for this provider
      user.oauthAccounts = user.oauthAccounts.filter(
        account => account.provider !== oauthInfo.provider
      );

      // Add new OAuth account
      const oauthAccount = {
        provider: oauthInfo.provider,
        providerId: oauthInfo.providerId,
        email: oauthInfo.email,
        accessToken: oauthInfo.accessToken,
        refreshToken: oauthInfo.refreshToken,
        expiresAt: oauthInfo.expiresAt,
        linkedAt: new Date(),
        lastUsed: new Date()
      };

      user.oauthAccounts.push(oauthAccount);

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

      const initialCount = user.oauthAccounts.length;
      user.oauthAccounts = user.oauthAccounts.filter(
        account => account.provider !== provider
      );

      if (user.oauthAccounts.length === initialCount) {
        throw new Error('OAuth account not found');
      }

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
    if (!user.oauthAccounts) {
      return null;
    }

    return user.oauthAccounts.find(account => account.provider === provider) || null;
  }

  /**
   * Check if access token needs refresh
   * @param {Object} oauthAccount - OAuth account object
   * @returns {boolean} Whether token needs refresh
   */
  needsTokenRefresh(oauthAccount) {
    if (!oauthAccount.expiresAt) {
      return false;
    }

    // Refresh if token expires in the next 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return oauthAccount.expiresAt <= fiveMinutesFromNow;
  }
}

// Create singleton instance
const oauthService = new OAuthService();

module.exports = oauthService;