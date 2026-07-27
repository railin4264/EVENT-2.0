/**
 * Tests para autenticación
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4'; // Menos rounds para tests más rápidos

// NOTE: JWT_SECRET / JWT_REFRESH_SECRET are set by tests/setup.js (loaded
// first as a setupFile). Do NOT override them here — overriding causes a
// secret mismatch with the cached server instance (maxWorkers:1) and 401s.

let mongoServer;
let app;

describe('Auth API', () => {
  beforeAll(async () => {
    // MONGODB_URI is provided by jest.globalSetup (single shared mongod).
    // Importar app después de configurar variables
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
