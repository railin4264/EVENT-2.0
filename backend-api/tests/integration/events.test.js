const request = require('supertest');

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Events API Tests', () => {
  let authToken = null;
  let testEvent = null;

  // Login before tests
  beforeAll(async () => {
    const loginRes = await request(API_URL)
      .post('/api/auth/register')
      .send({
        email: `eventtest${Date.now()}@test.com`,
        password: 'Test123456!',
        username: `eventuser${Date.now()}`,
        firstName: 'Event',
        lastName: 'Tester'
      });

    authToken = loginRes.body.token;
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        category: 'technology',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: {
          type: 'Point',
          coordinates: [-99.1332, 19.4326],
          address: 'Ciudad de México, CDMX, México'
        },
        maxAttendees: 100,
        price: 0,
        isPublic: true
      };

      const res = await request(API_URL)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.event).toBeDefined();
      expect(res.body.event.title).toBe(eventData.title);

      testEvent = res.body.event;
    });

    it('should not create event without authentication', async () => {
      const res = await request(API_URL)
        .post('/api/events')
        .send({
          title: 'Unauthorized Event',
          description: 'This should fail'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should not create event with invalid data', async () => {
      const res = await request(API_URL)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '', // Empty title should fail
          description: 'Invalid event'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/events', () => {
    it('should get all events', async () => {
      const res = await request(API_URL)
        .get('/api/events')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.events).toBeDefined();
      expect(Array.isArray(res.body.events)).toBe(true);
    });

    it('should filter events by category', async () => {
      const res = await request(API_URL)
        .get('/api/events?category=technology')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.events).toBeDefined();
    });
  });

  describe('GET /api/events/:id', () => {
    it('should get event by ID', async () => {
      const res = await request(API_URL)
        .get(`/api/events/${testEvent._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.event).toBeDefined();
      expect(res.body.event._id).toBe(testEvent._id);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(API_URL)
        .get(`/api/events/${fakeId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update event', async () => {
      const updateData = {
        title: 'Updated Test Event',
        description: 'Updated description'
      };

      const res = await request(API_URL)
        .put(`/api/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.event.title).toBe(updateData.title);
    });

    it('should not update event without authentication', async () => {
      const res = await request(API_URL)
        .put(`/api/events/${testEvent._id}`)
        .send({ title: 'Unauthorized Update' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/events/:id/join', () => {
    it('should join event', async () => {
      const res = await request(API_URL)
        .post(`/api/events/${testEvent._id}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete event', async () => {
      const res = await request(API_URL)
        .delete(`/api/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 for already deleted event', async () => {
      const res = await request(API_URL)
        .delete(`/api/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});
