const express = require('express');
const request = require('supertest');
const { makeCache, invalidateCache } = require('../src/middleware/cache');

test('personalized reads bypass stale permissions while public responses keep their cache', async () => {
  invalidateCache();
  let allowed = true;
  const app = express();
  app.get('/events', (req, res, next) => {
    if (req.headers.authorization) req.user = { id: req.headers.authorization, age: Number(req.query.age || 20) };
    next();
  }, makeCache(30), (req, res) => res.json({ owner: req.user?.id || 'public', page: req.query.page || '1', allowed }));
  const first = await request(app).get('/events').set('Authorization', 'alice');
  expect(first.body.owner).toBe('alice');
  expect(first.headers['cache-control']).toBe('private, no-store');
  allowed = false;
  const refreshed = await request(app).get('/events').set('Authorization', 'alice');
  expect(refreshed.headers['x-cache']).toBe('BYPASS');
  expect(refreshed.body.allowed).toBe(false);
  expect((await request(app).get('/events').set('Authorization', 'bob')).body.owner).toBe('bob');
  expect((await request(app).get('/events')).body.owner).toBe('public');
  expect((await request(app).get('/events')).headers['x-cache']).toBe('HIT');
  expect((await request(app).get('/events?page=2')).headers['x-cache']).toBe('MISS');
  expect((await request(app).get('/events?page=2').set('Authorization', 'alice')).body.page).toBe('2');
});
