/**
 * Two-Factor Authentication Tests for EventConnect 2.0
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const twoFactorService = require('../src/services/twoFactorService');
const User = require('../src/models/User');

process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';
// NOTE: JWT_SECRET / JWT_REFRESH_SECRET are set by tests/setup.js (loaded
// first as a setupFile). Do NOT override them here — overriding causes a
// secret mismatch with the cached server instance (maxWorkers:1) and 401s.


// Mock speakeasy for consistent testing
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'TEST_SECRET_BASE32_VALUE_FOR_TESTING',
    otpauth_url: 'otpauth://totp/EventConnect%20(test@example.com)?secret=TEST_SECRET_BASE32_VALUE_FOR_TESTING&issuer=eventconnect.com'
  })),
  totp: {
    verify: jest.fn()
  }
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,TEST_QR_CODE'))
}));

let mongoServer;
let app;

async function createTestUser(data = {}) {
  const user = await User.create({
    username: data.username || `testuser_${Date.now()}`,
    email: data.email || `test_${Date.now()}@example.com`,
    password: data.password || 'Test123456!',
    firstName: data.firstName || 'Test',
    lastName: data.lastName || 'User',
    birthDate: data.birthDate || new Date('1990-01-01'),
    ...data
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
}

describe('Two-Factor Authentication', () => {
  beforeAll(async () => {
    // MONGODB_URI is provided by jest.globalSetup (single shared mongod).
    const server = require('../src/server');
    app = server.app || server;
  });

  afterAll(async () => {
    // setup.js disconnects mongoose; globalSetup stops the shared mongod
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });
  describe('TwoFactorService', () => {
    describe('generateSecret', () => {
      it('should generate a secret with QR code', async () => {
        const result = await twoFactorService.generateSecret('test@example.com');

        expect(result).toHaveProperty('secret');
        expect(result).toHaveProperty('qrCode');
        expect(result).toHaveProperty('manualEntryKey');
        expect(result.qrCode).toBe('data:image/png;base64,TEST_QR_CODE');
      });
    });

    describe('verifyToken', () => {
      const speakeasy = require('speakeasy');

      beforeEach(() => {
        speakeasy.totp.verify.mockClear();
      });

      it('should verify valid TOTP token', () => {
        speakeasy.totp.verify.mockReturnValue(true);

        const result = twoFactorService.verifyToken('123456', 'TEST_SECRET');
        expect(result).toBe(true);
        expect(speakeasy.totp.verify).toHaveBeenCalledWith({
          secret: 'TEST_SECRET',
          encoding: 'base32',
          token: '123456',
          window: 2,
          time: expect.any(Number)
        });
      });

      it('should reject invalid TOTP token', () => {
        speakeasy.totp.verify.mockReturnValue(false);

        const result = twoFactorService.verifyToken('000000', 'TEST_SECRET');
        expect(result).toBe(false);
      });

      it('should reject malformed tokens', () => {
        const result1 = twoFactorService.verifyToken('12345', 'TEST_SECRET'); // Too short
        const result2 = twoFactorService.verifyToken('1234567', 'TEST_SECRET'); // Too long
        const result3 = twoFactorService.verifyToken('12345a', 'TEST_SECRET'); // Non-numeric

        expect(result1).toBe(false);
        expect(result2).toBe(false);
        expect(result3).toBe(false);
      });

      it('should handle missing parameters', () => {
        const result1 = twoFactorService.verifyToken(null, 'TEST_SECRET');
        const result2 = twoFactorService.verifyToken('123456', null);

        expect(result1).toBe(false);
        expect(result2).toBe(false);
      });
    });

    describe('generateBackupCodes', () => {
      it('should generate default number of backup codes', () => {
        const codes = twoFactorService.generateBackupCodes();
        expect(codes).toHaveLength(8);
        codes.forEach(code => {
          expect(code).toMatch(/^[A-F0-9]{8}$/);
        });
      });

      it('should generate custom number of backup codes', () => {
        const codes = twoFactorService.generateBackupCodes(5);
        expect(codes).toHaveLength(5);
      });

      it('should generate unique codes', () => {
        const codes = twoFactorService.generateBackupCodes(10);
        const uniqueCodes = new Set(codes);
        expect(uniqueCodes.size).toBe(10);
      });
    });

    describe('verifyBackupCode', () => {
      const mockBackupCodes = [
        { code: 'ABCD1234', used: false, generatedAt: new Date() },
        { code: 'EFGH5678', used: true, usedAt: new Date(), generatedAt: new Date() },
        { code: 'IJKL9012', used: false, generatedAt: new Date() }
      ];

      it('should verify valid unused backup code', () => {
        const result = twoFactorService.verifyBackupCode('ABCD1234', mockBackupCodes);

        expect(result.valid).toBe(true);
        expect(result.remainingCodes[0].used).toBe(true);
        expect(result.remainingCodes[0].usedAt).toBeDefined();
      });

      it('should reject already used backup code', () => {
        const result = twoFactorService.verifyBackupCode('EFGH5678', mockBackupCodes);
        expect(result.valid).toBe(false);
      });

      it('should reject non-existent backup code', () => {
        const result = twoFactorService.verifyBackupCode('XXXXXXXX', mockBackupCodes);
        expect(result.valid).toBe(false);
      });

      it('should handle malformed input', () => {
        const result1 = twoFactorService.verifyBackupCode(null, mockBackupCodes);
        const result2 = twoFactorService.verifyBackupCode('ABCD1234', null);

        expect(result1.valid).toBe(false);
        expect(result2.valid).toBe(false);
      });
    });
  });

  describe('2FA Routes', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      const result = await createTestUser({
        email: '2fa-test@example.com',
        username: '2fatest'
      });
      testUser = result.user;
      authToken = result.token;
    });

    describe('POST /api/2fa/setup', () => {
      it('should initiate 2FA setup for user', async () => {
        const response = await request(app)
          .post('/api/2fa/setup')
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status !== 200) console.error('2FA setup failed:', response.body);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.qrCode).toBeDefined();
        expect(response.body.data.manualEntryKey).toBeDefined();
        expect(response.body.data.setupToken).toBeDefined();

        // Verify user was updated
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.twoFactor.tempSecret).toBeDefined();
        expect(updatedUser.twoFactor.setupToken).toBeDefined();
        expect(updatedUser.twoFactor.isEnabled).toBe(false);
      });

      it('should reject setup if 2FA already enabled', async () => {
        // Enable 2FA for user
        testUser.twoFactor = {
          isEnabled: true,
          secret: 'TEST_SECRET',
          enabledAt: new Date()
        };
        await testUser.save();

        const response = await request(app)
          .post('/api/2fa/setup')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('2FA is already enabled for this account');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/2fa/setup');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/2fa/verify-setup', () => {
      let setupToken;

      beforeEach(async () => {
        // Setup 2FA for testing
        const setupResponse = await request(app)
          .post('/api/2fa/setup')
          .set('Authorization', `Bearer ${authToken}`);

        setupToken = setupResponse.body.data.setupToken;
      });

      it('should complete 2FA setup with valid token', async () => {
        const speakeasy = require('speakeasy');
        speakeasy.totp.verify.mockReturnValue(true);

        const response = await request(app)
          .post('/api/2fa/verify-setup')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: '123456',
            setupToken: setupToken
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.backupCodes).toBeDefined();
        expect(response.body.data.backupCodes).toHaveLength(8);

        // Verify user 2FA was enabled
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.twoFactor.isEnabled).toBe(true);
        expect(updatedUser.twoFactor.secret).toBeDefined();
        expect(updatedUser.twoFactor.backupCodes).toHaveLength(8);
        expect(updatedUser.twoFactor.tempSecret).toBeUndefined();
      });

      it('should reject setup with invalid token', async () => {
        const speakeasy = require('speakeasy');
        speakeasy.totp.verify.mockReturnValue(false);

        const response = await request(app)
          .post('/api/2fa/verify-setup')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: '000000',
            setupToken: setupToken
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid TOTP token');
      });

      it('should reject setup with invalid setup token', async () => {
        const response = await request(app)
          .post('/api/2fa/verify-setup')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: '123456',
            setupToken: 'invalid_token'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid or expired setup token');
      });

      it('should validate TOTP token format', async () => {
        const response = await request(app)
          .post('/api/2fa/verify-setup')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: '12345', // Invalid format
            setupToken: setupToken
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
      });
    });

    describe('POST /api/2fa/verify', () => {
      beforeEach(async () => {
        // Setup completed 2FA for user
        testUser.twoFactor = {
          isEnabled: true,
          secret: 'TEST_SECRET_FOR_VERIFICATION',
          enabledAt: new Date(),
          backupCodes: [
            { code: 'ABCD1234', used: false, generatedAt: new Date() }
          ]
        };
        await testUser.save();
      });

      it('should verify valid 2FA token', async () => {
        const speakeasy = require('speakeasy');
        speakeasy.totp.verify.mockReturnValue(true);

        const response = await request(app)
          .post('/api/2fa/verify')
          .send({
            token: '123456',
            userId: testUser._id.toString()
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined(); // JWT token
        expect(response.body.user.email).toBe(testUser.email);
      });

      it('should reject invalid 2FA token', async () => {
        const speakeasy = require('speakeasy');
        speakeasy.totp.verify.mockReturnValue(false);

        const response = await request(app)
          .post('/api/2fa/verify')
          .send({
            token: '000000',
            userId: testUser._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid TOTP token');
      });

      it('should reject request without userId', async () => {
        const response = await request(app)
          .post('/api/2fa/verify')
          .send({
            token: '123456'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('User ID is required');
      });

      it('should reject request for user without 2FA', async () => {
        const userWithout2FA = await createTestUser({
          email: 'no2fa@example.com'
        });

        const response = await request(app)
          .post('/api/2fa/verify')
          .send({
            token: '123456',
            userId: userWithout2FA.user._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid request');
      });
    });

    describe('POST /api/2fa/verify-backup', () => {
      beforeEach(async () => {
        // Setup completed 2FA with backup codes
        testUser.twoFactor = {
          isEnabled: true,
          secret: 'TEST_SECRET_FOR_VERIFICATION',
          enabledAt: new Date(),
          backupCodes: [
            { code: 'ABCD1234', used: false, generatedAt: new Date() },
            { code: 'EFGH5678', used: true, usedAt: new Date(), generatedAt: new Date() }
          ]
        };
        await testUser.save();
      });

      it('should verify valid backup code', async () => {
        const response = await request(app)
          .post('/api/2fa/verify-backup')
          .send({
            code: 'ABCD1234',
            userId: testUser._id.toString()
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined(); // JWT token
        expect(response.body.remainingBackupCodes).toBe(0); // One was used

        // Verify code was marked as used
        const updatedUser = await User.findById(testUser._id);
        const usedCode = updatedUser.twoFactor.backupCodes.find(c => c.code === 'ABCD1234');
        expect(usedCode.used).toBe(true);
        expect(usedCode.usedAt).toBeDefined();
      });

      it('should reject already used backup code', async () => {
        const response = await request(app)
          .post('/api/2fa/verify-backup')
          .send({
            code: 'EFGH5678', // Already used
            userId: testUser._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid backup code');
      });

      it('should reject non-existent backup code', async () => {
        const response = await request(app)
          .post('/api/2fa/verify-backup')
          .send({
            code: 'XXXXXXXX',
            userId: testUser._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid backup code');
      });

      it('should validate backup code format', async () => {
        const response = await request(app)
          .post('/api/2fa/verify-backup')
          .send({
            code: '1234', // Invalid format
            userId: testUser._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
      });
    });

    describe('GET /api/2fa/status', () => {
      it('should return 2FA status for user without 2FA', async () => {
        const response = await request(app)
          .get('/api/2fa/status')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isEnabled).toBe(false);
        expect(response.body.data.hasBackupCodes).toBe(false);
        expect(response.body.data.remainingBackupCodes).toBe(0);
      });

      it('should return 2FA status for user with 2FA enabled', async () => {
        testUser.twoFactor = {
          isEnabled: true,
          secret: 'TEST_SECRET',
          enabledAt: new Date(),
          backupCodes: [
            { code: 'ABCD1234', used: false, generatedAt: new Date() },
            { code: 'EFGH5678', used: true, usedAt: new Date(), generatedAt: new Date() }
          ]
        };
        await testUser.save();

        const response = await request(app)
          .get('/api/2fa/status')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isEnabled).toBe(true);
        expect(response.body.data.hasBackupCodes).toBe(true);
        expect(response.body.data.remainingBackupCodes).toBe(1); // One unused
        expect(response.body.data.enabledAt).toBeDefined();
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/2fa/status');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/2fa/disable', () => {
      beforeEach(async () => {
        // Setup completed 2FA
        testUser.twoFactor = {
          isEnabled: true,
          secret: 'TEST_SECRET_FOR_DISABLE',
          enabledAt: new Date()
        };
        await testUser.save();
      });

      it('should disable 2FA with valid token', async () => {
        const speakeasy = require('speakeasy');
        speakeasy.totp.verify.mockReturnValue(true);

        const response = await request(app)
          .post('/api/2fa/disable')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: '123456'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('2FA disabled successfully');

        // Verify 2FA was disabled
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.twoFactor.isEnabled).toBe(false);
        expect(updatedUser.twoFactor.disabledAt).toBeDefined();
      });

      it('should reject disable with invalid token', async () => {
        const speakeasy = require('speakeasy');
        speakeasy.totp.verify.mockReturnValue(false);

        const response = await request(app)
          .post('/api/2fa/disable')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: '000000'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid TOTP token');
      });

      it('should reject disable if 2FA not enabled', async () => {
        const userWithout2FA = await createTestUser({
          email: 'nodisable@example.com'
        });

        const response = await request(app)
          .post('/api/2fa/disable')
          .set('Authorization', `Bearer ${userWithout2FA.token}`)
          .send({
            token: '123456'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('2FA is not enabled for this account');
      });
    });
  });
});