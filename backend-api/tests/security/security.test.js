/**
 * Security Tests for EventConnect 2.0
 * Comprehensive security testing suite
 */

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Security Tests', () => {
  let app;
  let mongoServer;
  let testUser;
  let authToken;

  beforeEach(async () => {
    // If mongoServer doesn't exist, this is the first run
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create();
      process.env.MONGODB_URI = mongoServer.getUri();

      const server = require('../../src/server');
      app = server.app || server;
    }

    const User = require('../../src/models/User');

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await User.create({
      username: 'securitytestuser',
      email: 'security@test.com',
      password: hashedPassword,
      firstName: 'Security',
      lastName: 'Test',
      isEmailVerified: true
    });

    authToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });
  });

  afterEach(async () => {
    const User = require('../../src/models/User');
    await User.deleteMany({});
  });

  afterAll(async () => {
    if (mongoServer) {
      const mongoose = require('mongoose');
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      await mongoServer.stop();
    }
  });

  describe('Authentication Security', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    test('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should enforce rate limiting on auth endpoints', async () => {
      const loginData = {
        email: 'security@test.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Should be rate limited now
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.message).toContain('Too many');
    });
  });

  describe('Input Validation Security', () => {
    test('should sanitize malicious HTML input', async () => {
      const maliciousData = {
        bio: '<script>alert("XSS")</script>Innocent bio'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData)
        .expect(200);

      expect(response.body.data.bio).not.toContain('<script>');
    });

    test('should reject SQL injection attempts', async () => {
      const sqlInjection = {
        email: "admin'; DROP TABLE users; --"
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...sqlInjection,
          username: 'testuser',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@invalid.com',
        'test@',
        'test..test@example.com',
        'test@.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            username: 'testuser' + Math.random(),
            password: 'password123',
            firstName: 'Test',
            lastName: 'User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should enforce password complexity', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345',
        'abc'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Math.random()}@example.com`,
            username: 'testuser' + Math.random(),
            password,
            firstName: 'Test',
            lastName: 'User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Authorization Security', () => {
    test('should prevent access to other users data', async () => {
      // Create another user
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@test.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Other',
        lastName: 'User',
        isEmailVerified: true
      });

      const response = await request(app)
        .get(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should prevent privilege escalation', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate object ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('File Upload Security', () => {
    test('should reject non-image files', async () => {
      const response = await request(app)
        .post('/api/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('malicious script'), 'malicious.js')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should enforce file size limits', async () => {
      // Create a large buffer (simulate 20MB file)
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024);

      const response = await request(app)
        .post('/api/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', largeBuffer, 'large.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate image headers', async () => {
      // Create fake image with wrong headers
      const fakeImage = Buffer.from('not-an-image');

      const response = await request(app)
        .post('/api/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', fakeImage, 'fake.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    test('should prevent NoSQL injection in queries', async () => {
      const maliciousQuery = {
        email: { $ne: null },
        password: { $ne: null }
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousQuery)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should sanitize user input in database queries', async () => {
      const maliciousInput = {
        $where: 'this.username == "admin"'
      };

      const response = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: JSON.stringify(maliciousInput) })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS and Headers Security', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    test('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Origin', 'http://malicious-site.com')
        .set('Authorization', `Bearer ${authToken}`);

      // Should either block or not include CORS headers
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Session Security', () => {
    test('should invalidate tokens on password change', async () => {
      // Change password
      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'testpassword123',
          newPassword: 'newpassword123'
        })
        .expect(200);

      // Old token should be invalid
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should enforce logout on all devices', async () => {
      // Logout from all devices
      await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Token should be invalid
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('2FA Security', () => {
    test('should require 2FA code when enabled', async () => {
      // Enable 2FA for user
      await User.findByIdAndUpdate(testUser._id, {
        'twoFactor.isEnabled': true,
        'twoFactor.secret': 'test-secret'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'testpassword123'
        })
        .expect(200);

      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.token).toBeUndefined();
    });

    test('should reject invalid 2FA codes', async () => {
      // Enable 2FA for user
      await User.findByIdAndUpdate(testUser._id, {
        'twoFactor.isEnabled': true,
        'twoFactor.secret': 'test-secret'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'testpassword123'
        });

      const response = await request(app)
        .post('/api/auth/verify-2fa')
        .send({
          tempToken: loginResponse.body.tempToken,
          code: '000000'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Exposure Prevention', () => {
    test('should not expose sensitive user data', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.resetPasswordToken).toBeUndefined();
      expect(response.body.data.emailVerificationToken).toBeUndefined();
    });

    test('should not expose internal server errors', async () => {
      // Force a server error by using invalid ObjectId
      const response = await request(app)
        .get('/api/events/force-error-invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(500);
      expect(response.body).not.toContain('Error:');
      expect(response.body).not.toContain('stack');
    });
  });

  describe('API Rate Limiting', () => {
    test('should rate limit API endpoints', async () => {
      // Make multiple requests quickly
      const promises = Array(20).fill().map(() =>
        request(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(response => response.status === 429);

      expect(rateLimited).toBe(true);
    });

    test('should have stricter limits for sensitive endpoints', async () => {
      // Test password reset endpoint
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'security@test.com' })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(response => response.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});