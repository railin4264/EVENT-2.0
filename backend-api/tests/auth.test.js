/**
 * Tests para autenticación
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

// Variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4'; // Menos rounds para tests más rápidos

// NOTE: JWT_SECRET / JWT_REFRESH_SECRET are set by tests/setup.js (loaded
// first as a setupFile). Do NOT override them here — overriding causes a
// secret mismatch with the cached server instance (maxWorkers:1) and 401s.

let app;

describe('Auth API', () => {
  beforeAll(async () => {
    // Exercise the real auth router against the isolated database without
    // loading unrelated uploads, payments, Socket.IO or external SDKs.
    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../src/routes/auth'));
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

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'Test123456!',
      username: 'testuser',
      name: 'Test User'
    };

    it('debería registrar un nuevo usuario', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email', validUser.email);
      expect(res.body.data).toHaveProperty('token');
    });

    it('debería rechazar email duplicado', async () => {
      // Primer registro
      await request(app)
        .post('/api/auth/register')
        .send(validUser);

      // Segundo registro con mismo email
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debería rechazar password débil', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: '123'
        });

      expect(res.status).toBe(400);
    });

    it('debería rechazar email inválido', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email'
        });

      expect(res.status).toBe(400);
    });

    it('registers a single display name without inventing a surname or requiring profile extras', async () => {
      const res = await request(app).post('/api/auth/register').send({
        ...validUser, name: 'Ana', birthDate: '2000-04-15', acceptTerms: true
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user).toMatchObject({ firstName: 'Ana', lastName: '', name: 'Ana', interests: [] });
      const login = await request(app).post('/api/auth/login').send({ email: validUser.email, password: validUser.password });
      expect(login.status).toBe(200);
      expect(login.body.data.user.name).toBe('Ana');
    });

    it('keeps first and last name clients compatible', async () => {
      const { name, ...identity } = validUser;
      const res = await request(app).post('/api/auth/register').send({ ...identity, firstName: 'Ana', lastName: 'Pérez' });
      expect(res.status).toBe(201);
      expect(res.body.data.user.name).toBe('Ana Pérez');
    });

    it('preserves optional profile fields without accepting privilege fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        ...validUser, interests: ['music'], phone: '+1 809 555 0100', role: 'admin', isEmailVerified: true
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user).toMatchObject({ interests: ['music'], role: 'user' });
      const user = await require('../src/models/User').findById(res.body.data.user.id);
      expect(user.phone).toBe('+1 809 555 0100');
    });

    it('returns validation errors instead of a server error for missing or oversized display names', async () => {
      const { name, ...identity } = validUser;
      for (const payload of [identity, { ...identity, name: 'a'.repeat(101) }]) {
        const res = await request(app).post('/api/auth/register').send(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'name' })]));
      }
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Crear usuario de prueba
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Test123456!',
          username: 'loginuser',
          name: 'Login User'
        });
    });

    it('debería iniciar sesión con credenciales válidas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test123456!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('debería rechazar password incorrecto', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('debería rechazar email inexistente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123456!'
        });

      expect(res.status).toBe(401);
    });
  });
});
