const request = require('supertest');
const mongoose = require('mongoose');

// Test config
const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Auth API Tests', () => {
  let authToken = null;
  let testUser = null;

  const testUserData = {
    email: `test${Date.now()}@eventconnect.test`,
    password: 'Test123456!',
    username: `testuser${Date.now()}`,
    firstName: 'Test',
    lastName: 'User'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(API_URL)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUserData.email);

      authToken = res.body.token;
      testUser = res.body.user;
    });

    it('should not register user with existing email', async () => {
      const res = await request(API_URL)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should not register user with invalid email', async () => {
      const res = await request(API_URL)
        .post('/api/auth/register')
        .send({
          ...testUserData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should not login with incorrect password', async () => {
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUserData.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user with valid token', async () => {
      const res = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user._id).toBe(testUser._id);
    });

    it('should not get user without token', async () => {
      const res = await request(API_URL)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should not get user with invalid token', async () => {
      const res = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(API_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
