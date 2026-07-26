/**
 * Two-Factor Authentication Service for EventConnect 2.0
 * Provides TOTP (Time-based One-Time Password) functionality
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class TwoFactorService {
  constructor() {
    this.serviceName = process.env.APP_NAME || 'EventConnect';
    this.issuer = process.env.JWT_ISSUER || 'eventconnect.com';
  }

  /**
   * Generate a new secret for TOTP
   * @param {string} userEmail - User's email for QR code label
   * @returns {Object} Secret and QR code data
   */
  async generateSecret(userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${userEmail})`,
        issuer: this.issuer,
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      logger.info(`2FA secret generated for user: ${userEmail}`);

      return {
        secret: secret.base32,
        tempSecret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        otpauthUrl: secret.otpauth_url
      };
    } catch (error) {
      logger.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify TOTP token
   * @param {string} token - 6-digit TOTP token
   * @param {string} secret - User's TOTP secret
   * @param {number} window - Time window tolerance (default: 2)
   * @returns {boolean} Verification result
   */
  verifyToken(token, secret, window = 2) {
    try {
      if (!token || !secret) {
        return false;
      }

      // Remove any spaces or formatting from token
      const cleanToken = token.toString().replace(/\s+/g, '');

      if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
        return false;
      }

      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: window,
        time: Math.floor(Date.now() / 1000)
      });

      logger.debug(`2FA token verification: ${verified ? 'SUCCESS' : 'FAILED'}`);
      return verified;
    } catch (error) {
      logger.error('Error verifying 2FA token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for 2FA
   * @param {number} count - Number of backup codes to generate
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes(count = 8) {
    const codes = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    logger.info(`Generated ${count} backup codes`);
    return codes;
  }

  /**
   * Verify backup code
   * @param {string} code - Backup code to verify
   * @param {Array} userBackupCodes - User's stored backup codes
   * @returns {Object} Verification result and remaining codes
   */
  verifyBackupCode(code, userBackupCodes) {
    try {
      if (!code || !Array.isArray(userBackupCodes)) {
        return { valid: false, remainingCodes: userBackupCodes };
      }

      const cleanCode = code.toString().toUpperCase().replace(/\s+/g, '');
      const codeIndex = userBackupCodes.findIndex(
        storedCode => storedCode.code === cleanCode && !storedCode.used
      );

      if (codeIndex === -1) {
        return { valid: false, remainingCodes: userBackupCodes };
      }

      // Mark code as used
      const updatedCodes = [...userBackupCodes];
      updatedCodes[codeIndex].used = true;
      updatedCodes[codeIndex].usedAt = new Date();

      logger.info('Backup code used successfully');
      return { valid: true, remainingCodes: updatedCodes };
    } catch (error) {
      logger.error('Error verifying backup code:', error);
      return { valid: false, remainingCodes: userBackupCodes };
    }
  }

  /**
   * Rate limiting for 2FA attempts
   * @param {string} userId - User ID
   * @param {string} type - Type of attempt ('totp' or 'backup')
   * @returns {Object} Rate limit status
   */
  async checkRateLimit(userId, type = 'totp') {
    try {
      const key = `2fa_attempts:${type}:${userId}`;
      const maxAttempts = type === 'totp' ? 5 : 3; // Lower limit for backup codes
      const windowMs = 15 * 60 * 1000; // 15 minutes

      const currentAttempts = await cacheService.get(key, 0);

      if (currentAttempts >= maxAttempts) {
        const ttl = await cacheService.client?.ttl?.(cacheService.formatKey(key)) || 0;
        return {
          allowed: false,
          attemptsRemaining: 0,
          resetTime: new Date(Date.now() + (ttl * 1000))
        };
      }

      return {
        allowed: true,
        attemptsRemaining: maxAttempts - currentAttempts,
        resetTime: null
      };
    } catch (error) {
      logger.error('Error checking 2FA rate limit:', error);
      // Allow on error to prevent lockout due to cache issues
      return { allowed: true, attemptsRemaining: 5, resetTime: null };
    }
  }

  /**
   * Record failed 2FA attempt
   * @param {string} userId - User ID
   * @param {string} type - Type of attempt ('totp' or 'backup')
   */
  async recordFailedAttempt(userId, type = 'totp') {
    try {
      const key = `2fa_attempts:${type}:${userId}`;
      const windowSeconds = 15 * 60; // 15 minutes

      const currentAttempts = await cacheService.get(key, 0);
      await cacheService.set(key, currentAttempts + 1, windowSeconds);

      logger.warn(`Failed 2FA attempt recorded for user ${userId}, type: ${type}`);
    } catch (error) {
      logger.error('Error recording failed 2FA attempt:', error);
    }
  }

  /**
   * Clear 2FA rate limiting for user
   * @param {string} userId - User ID
   */
  async clearRateLimit(userId) {
    try {
      await cacheService.del(`2fa_attempts:totp:${userId}`);
      await cacheService.del(`2fa_attempts:backup:${userId}`);
      logger.info(`2FA rate limit cleared for user: ${userId}`);
    } catch (error) {
      logger.error('Error clearing 2FA rate limit:', error);
    }
  }

  /**
   * Generate temporary 2FA setup token
   * @param {string} userId - User ID
   * @param {string} tempSecret - Temporary secret for setup
   * @returns {string} Setup token
   */
  async generateSetupToken(userId, tempSecret) {
    try {
      const setupData = {
        userId,
        tempSecret,
        timestamp: Date.now()
      };

      const token = crypto.randomBytes(32).toString('hex');
      const key = `2fa_setup:${token}`;

      // Store setup data for 10 minutes
      await cacheService.set(key, setupData, 600);

      logger.info(`2FA setup token generated for user: ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating 2FA setup token:', error);
      throw new Error('Failed to generate setup token');
    }
  }

  /**
   * Verify 2FA setup token
   * @param {string} token - Setup token
   * @returns {Object|null} Setup data or null if invalid
   */
  async verifySetupToken(token) {
    try {
      const key = `2fa_setup:${token}`;
      const setupData = await cacheService.get(key);

      if (!setupData) {
        return null;
      }

      // Check if token is not older than 10 minutes
      const tokenAge = Date.now() - setupData.timestamp;
      if (tokenAge > 600000) { // 10 minutes
        await cacheService.del(key);
        return null;
      }

      return setupData;
    } catch (error) {
      logger.error('Error verifying 2FA setup token:', error);
      return null;
    }
  }

  /**
   * Complete 2FA setup and clean up temporary data
   * @param {string} token - Setup token
   */
  async completeSetup(token) {
    try {
      const key = `2fa_setup:${token}`;
      await cacheService.del(key);
      logger.info('2FA setup completed and temporary data cleaned');
    } catch (error) {
      logger.error('Error completing 2FA setup:', error);
    }
  }

  /**
   * Generate recovery code for 2FA reset
   * @param {string} userId - User ID
   * @returns {string} Recovery code
   */
  async generateRecoveryCode(userId) {
    try {
      const recoveryCode = crypto.randomBytes(16).toString('hex').toUpperCase();
      const key = `2fa_recovery:${recoveryCode}`;

      // Store recovery code for 24 hours
      await cacheService.set(key, { userId, timestamp: Date.now() }, 86400);

      logger.info(`2FA recovery code generated for user: ${userId}`);
      return recoveryCode;
    } catch (error) {
      logger.error('Error generating 2FA recovery code:', error);
      throw new Error('Failed to generate recovery code');
    }
  }

  /**
   * Verify and consume recovery code
   * @param {string} code - Recovery code
   * @returns {Object|null} Recovery data or null if invalid
   */
  async verifyRecoveryCode(code) {
    try {
      const key = `2fa_recovery:${code}`;
      const recoveryData = await cacheService.get(key);

      if (!recoveryData) {
        return null;
      }

      // Delete recovery code after use (single use)
      await cacheService.del(key);

      logger.info(`2FA recovery code used for user: ${recoveryData.userId}`);
      return recoveryData;
    } catch (error) {
      logger.error('Error verifying 2FA recovery code:', error);
      return null;
    }
  }

  /**
   * Get 2FA statistics for monitoring
   * @returns {Object} 2FA usage statistics
   */
  async getStatistics() {
    try {
      const stats = {
        activeSetups: 0,
        failedAttempts: 0,
        recoveryCodesGenerated: 0,
        timestamp: new Date()
      };

      // Count active setups
      const setupKeys = await cacheService.getKeysPattern('2fa_setup:*');
      stats.activeSetups = setupKeys.length;

      // Count failed attempts
      const attemptKeys = await cacheService.getKeysPattern('2fa_attempts:*');
      stats.failedAttempts = attemptKeys.length;

      // Count recovery codes
      const recoveryKeys = await cacheService.getKeysPattern('2fa_recovery:*');
      stats.recoveryCodesGenerated = recoveryKeys.length;

      return stats;
    } catch (error) {
      logger.error('Error getting 2FA statistics:', error);
      return {
        activeSetups: 0,
        failedAttempts: 0,
        recoveryCodesGenerated: 0,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Create singleton instance
const twoFactorService = new TwoFactorService();

module.exports = twoFactorService;