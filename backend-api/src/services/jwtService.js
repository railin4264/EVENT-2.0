const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');

class JWTService {
  constructor() {
    // JWT configuration
    this.accessTokenSecret = process.env.JWT_SECRET || this.generateSecret();

    if (!process.env.JWT_REFRESH_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('FATAL: JWT_REFRESH_SECRET is required in production');
        process.exit(1);
      }
      logger.warn('JWT_REFRESH_SECRET not set — generating ephemeral secret. All refresh tokens will be invalidated on restart.');
    }
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.generateSecret();
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    // Token rotation settings
    this.rotationEnabled = process.env.JWT_ROTATION_ENABLED === 'true';
    this.rotationInterval = parseInt(process.env.JWT_ROTATION_INTERVAL) || 24; // hours

    logger.info('JWT Service initialized with rotation:', this.rotationEnabled);
  }

  /**
   * Generate a cryptographically secure secret
   * @returns {string} - Generated secret
   */
  generateSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @param {Object} options - Token options
   * @returns {string} - Signed JWT
   */
  generateAccessToken(payload, options = {}) {
    const tokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(16).toString('hex') // Unique token ID
    };

    return jwt.sign(tokenPayload, this.accessTokenSecret, {
      expiresIn: options.expiresIn || this.accessTokenExpiry,
      issuer: 'eventconnect-api',
      audience: 'eventconnect-clients'
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} - Signed refresh token
   */
  generateRefreshToken(payload) {
    const tokenPayload = {
      ...payload,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(16).toString('hex')
    };

    return jwt.sign(tokenPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'eventconnect-api',
      audience: 'eventconnect-clients'
    });
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - User object
   * @returns {Object} - Token pair
   */
  generateTokenPair(user) {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role || 'user'
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({
      id: user._id.toString()
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiry: this.accessTokenExpiry,
      refreshTokenExpiry: this.refreshTokenExpiry
    };
  }

  /**
   * Verify access token
   * @param {string} token - Token to verify
   * @returns {Object} - Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'eventconnect-api',
        audience: 'eventconnect-clients'
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token to verify
   * @returns {Object} - Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'eventconnect-api',
        audience: 'eventconnect-clients'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} - New token pair
   */
  async refreshTokens(refreshToken) {
    try {
      // Verify the refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Find the user
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if refresh token is in user's valid tokens list
      if (!user.refreshTokens.includes(refreshToken)) {
        throw new Error('Invalid refresh token');
      }

      // Remove the old refresh token
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);

      // Generate new token pair
      const tokens = this.generateTokenPair(user);

      // Store new refresh token
      user.refreshTokens.push(tokens.refreshToken);

      // Limit the number of refresh tokens (security measure)
      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();

      logger.info(`Tokens refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.warn('Token refresh failed:', error.message);
      throw error;
    }
  }

  /**
   * Revoke refresh token
   * @param {string} userId - User ID
   * @param {string} refreshToken - Token to revoke
   */
  async revokeRefreshToken(userId, refreshToken) {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
        await user.save();
        logger.info(`Refresh token revoked for user: ${user.email}`);
      }
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   */
  async revokeAllRefreshTokens(userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = [];
        await user.save();
        logger.info(`All refresh tokens revoked for user: ${user.email}`);
      }
    } catch (error) {
      logger.error('Error revoking all refresh tokens:', error);
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(batchSize = 100) {
    try {
      let processed = 0;
      let lastId = null;

      while (true) {
        const query = { 'refreshTokens.0': { $exists: true } };
        if (lastId) query._id = { $gt: lastId };

        const users = await User.find(query).sort({ _id: 1 }).limit(batchSize);
        if (users.length === 0) break;

        for (const user of users) {
          const validTokens = user.refreshTokens.filter(token => {
            try {
              this.verifyRefreshToken(token);
              return true;
            } catch {
              logger.debug(`Removing expired/invalid token for user: ${user.email}`);
              return false;
            }
          });

          if (validTokens.length !== user.refreshTokens.length) {
            user.refreshTokens = validTokens;
            await user.save();
          }
        }

        processed += users.length;
        lastId = users[users.length - 1]._id;

        if (users.length < batchSize) break;
      }

      logger.info(`Expired tokens cleanup completed — ${processed} users processed`);
    } catch (error) {
      logger.error('Error during token cleanup:', error);
    }
  }

  /**
   * Get token information
   * @param {string} token - Token to analyze
   * @returns {Object} - Token information
   */
  getTokenInfo(token) {
    try {
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        return { valid: false, error: 'Invalid token format' };
      }

      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.payload.exp && decoded.payload.exp < now;

      return {
        valid: !isExpired,
        expired: isExpired,
        payload: decoded.payload,
        header: decoded.header,
        expiresAt: decoded.payload.exp ? new Date(decoded.payload.exp * 1000) : null,
        issuedAt: decoded.payload.iat ? new Date(decoded.payload.iat * 1000) : null,
        timeToExpiry: decoded.payload.exp ? Math.max(0, decoded.payload.exp - now) : null
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Rotate JWT secrets (for enhanced security)
   * This should be called periodically in production
   */
  rotateSecrets() {
    if (!this.rotationEnabled) {
      logger.warn('JWT secret rotation is disabled');
      return;
    }

    logger.info('Rotating JWT secrets...');

    // Store old secrets temporarily for token validation during transition
    this.oldAccessTokenSecret = this.accessTokenSecret;
    this.oldRefreshTokenSecret = this.refreshTokenSecret;

    // Generate new secrets
    this.accessTokenSecret = this.generateSecret();
    this.refreshTokenSecret = this.generateSecret();

    // Schedule cleanup of old secrets after some time
    setTimeout(() => {
      delete this.oldAccessTokenSecret;
      delete this.oldRefreshTokenSecret;
      logger.info('Old JWT secrets cleaned up');
    }, 60 * 60 * 1000); // 1 hour

    logger.info('JWT secrets rotated successfully');
  }

  /**
   * Verify token with fallback to old secret (during rotation)
   * @param {string} token - Token to verify
   * @param {string} type - Token type ('access' or 'refresh')
   * @returns {Object} - Decoded payload
   */
  verifyTokenWithFallback(token, type = 'access') {
    const secret = type === 'access' ? this.accessTokenSecret : this.refreshTokenSecret;
    const oldSecret = type === 'access' ? this.oldAccessTokenSecret : this.oldRefreshTokenSecret;

    try {
      return jwt.verify(token, secret, {
        issuer: 'eventconnect-api',
        audience: 'eventconnect-clients'
      });
    } catch (error) {
      if (oldSecret && error.name === 'JsonWebTokenError') {
        // Try with old secret during rotation period
        try {
          return jwt.verify(token, oldSecret, {
            issuer: 'eventconnect-api',
            audience: 'eventconnect-clients'
          });
        } catch (oldError) {
          throw error; // Throw original error
        }
      }
      throw error;
    }
  }
}

module.exports = new JWTService();