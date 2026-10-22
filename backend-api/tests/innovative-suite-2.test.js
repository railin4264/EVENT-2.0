const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server');
const app = server.app || server;
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const EventAfter = require('../src/models/EventAfter');
const EventPlusOne = require('../src/models/EventPlusOne');
const EventSong = require('../src/models/EventSong');

describe('Suite 2: After-Party Radar, Plus-One Matcher & Crowd Playlist', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let testEvent;

  beforeEach(async () => {
    // Registrar usuario 1
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Carlos',
        lastName: 'Pérez',
        username: 'carlos_' + Math.random().toString(36).substring(7),
        email: 'carlos_' + Math.random().toString(36).substring(7) + '@example.com',
        password: 'Password123!'
      });
    user1Token = res1.body.token || res1.body.data?.token;
    user1Id = res1.body.data?.user?._id || res1.body.data?.user?.id;

    // Registrar usuario 2
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Ana',
        lastName: 'Gómez',
        username: 'ana_' + Math.random().toString(36).substring(7),
        email: 'ana_' + Math.random().toString(36).substring(7) + '@example.com',
        password: 'Password123!'
      });
    user2Token = res2.body.token || res2.body.data?.token;
    user2Id = res2.body.data?.user?._id || res2.body.data?.user?.id;

    // Crear evento de prueba
    testEvent = await Event.create({
      title: 'Festival de Jazz en el Malecón',
      description: 'Música en vivo junto al mar',
      category: 'music',
      date: new Date(Date.now() + 3600000),
      createdBy: user1Id,
      status: 'published',
      location: {
        type: 'Point',
        coordinates: [-69.89, 18.46],
        address: 'Malecón de Santo Domingo',
        city: 'Santo Domingo'
      },
      price: { amount: 0, currency: 'DOP' }
    });
  });

  afterEach(async () => {
    await EventAfter.deleteMany({});
    await EventPlusOne.deleteMany({});
    await EventSong.deleteMany({});
    if (testEvent) await Event.findByIdAndDelete(testEvent._id);
  });

  describe('Radar de Afters («¿Dónde es el After?»)', () => {
    it('debe permitir proponer un lugar de after y listar los votos', async () => {
      // Usuario 1 propone un after
      const createRes = await request(app)
        .post(`/api/events/${testEvent._id}/afters`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          spotName: 'Chimi El Puente',
          spotType: 'food',
          vibe: 'comida_tardia',
          address: 'Av. Venezuela',
          description: 'Los mejores chimis después del jazz'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.spotName).toBe('Chimi El Puente');
      const afterId = createRes.body.data._id;

      // Consultar afters
      const listRes = await request(app)
        .get(`/api/events/${testEvent._id}/afters`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].goingCount).toBe(1);

      // Usuario 2 vota que también va para allá
      const voteRes = await request(app)
        .post(`/api/events/${testEvent._id}/afters/${afterId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(voteRes.status).toBe(200);
      expect(voteRes.body.isGoing).toBe(true);
      expect(voteRes.body.goingCount).toBe(2);
    });
  });

  describe('Plus-One Matcher («Busco Acompañante & Boleta Extra»)', () => {
    it('debe permitir publicar boleta extra y coordinar con un interesado', async () => {
      // Usuario 1 publica que tiene boleta extra
      const postRes = await request(app)
        .post(`/api/events/${testEvent._id}/plus-ones`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'have_extra_ticket',
          title: 'Tengo 1 boleta extra al costo',
          description: 'Mi acompañante no puede ir',
          ticketPrice: 500,
          isFree: false
        });

      expect(postRes.status).toBe(201);
      const postId = postRes.body.data._id;

      // Usuario 2 envía solicitud de interés
      const interestRes = await request(app)
        .post(`/api/events/${testEvent._id}/plus-ones/${postId}/interest`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ message: '¡Hola! Me encantaría comprarte la boleta e ir juntos.' });

      expect(interestRes.status).toBe(200);
      expect(interestRes.body.success).toBe(true);

      // Usuario 1 acepta a Usuario 2
      const matchRes = await request(app)
        .post(`/api/events/${testEvent._id}/plus-ones/${postId}/match`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ targetUserId: user2Id });

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.post.status).toBe('matched');
      expect(String(matchRes.body.post.matchedWith)).toBe(String(user2Id));
    });
  });

  describe('Himno del Coro («Playlist Colaborativa»)', () => {
    it('debe permitir nominar canciones y acumular votos del público', async () => {
      // Usuario 1 nomina una canción
      const songRes = await request(app)
        .post(`/api/events/${testEvent._id}/songs`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Ojalá Que Llueva Café',
          artist: 'Juan Luis Guerra',
          spotifyUrl: 'https://open.spotify.com/track/123'
        });

      expect(songRes.status).toBe(201);
      expect(songRes.body.data.votesCount).toBe(1);
      const songId = songRes.body.data._id;

      // Usuario 2 vota por la canción
      const voteRes = await request(app)
        .post(`/api/events/${testEvent._id}/songs/${songId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(voteRes.status).toBe(200);
      expect(voteRes.body.hasVoted).toBe(true);
      expect(voteRes.body.votesCount).toBe(2);

      // Listar canciones ordenadas por votos
      const listRes = await request(app)
        .get(`/api/events/${testEvent._id}/songs`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].votesCount).toBe(2);
      expect(listRes.body.data[0].title).toBe('Ojalá Que Llueva Café');
    });
  });
});
