const mongoose = require('mongoose');
const request = require('supertest');
const { app } = require('../src/server');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const jwtService = require('../src/services/jwtService');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/eventconnect');
  const [adult, minor] = await User.create([
    { username: 'test_adult_2', email: 'adult2@test.com', firstName: 'Adult', password: 'Password1!', birthDate: new Date('1990-01-01') },
    { username: 'test_minor_2', email: 'minor2@test.com', firstName: 'Minor', password: 'Password1!', birthDate: new Date('2012-01-01') }
  ]);
  const tokens = [adult, minor].map(u => jwtService.generateTokenPair(u).accessToken);

  await Event.create([
    { title: 'Santiago Dominicana', description: 'Evento público de prueba geográfica aislada', category: 'music', date: new Date(Date.now() + 5*86400000), createdBy: adult._id, location: { type: 'Point', coordinates: [-70.697, 19.4517], address: 'Santiago', city: 'Santiago', country: 'República Dominicana', countryCode: 'do' }, timeZone: 'UTC', status: 'published', isFeatured: true },
    { title: 'Capital Dominicana', description: 'Evento público de prueba geográfica aislada', category: 'music', date: new Date(Date.now() + 5*86400000), createdBy: adult._id, location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Santo Domingo', city: 'Santo Domingo', country: 'República Dominicana', countryCode: 'DO' }, timeZone: 'UTC', status: 'published' }
  ]);

  const items = res => res.body.events || res.body.data || [];
  for (const r of ['/api/events', '/api/events/featured', '/api/events/trending', '/api/events/for-you']) {
    const res = await request(app).get(r + '?countryCode=do&limit=12').set(r.endsWith('for-you') ? { Authorization: 'Bearer ' + tokens[1] } : {});
    console.log(r, 'status:', res.status, 'body:', res.body ? Object.keys(res.body) : null, 'titles:', items(res).map(i => i.title));
  }
  await Event.deleteMany({ title: { $in: ['Santiago Dominicana', 'Capital Dominicana'] } });
  await User.deleteMany({ _id: { $in: [adult._id, minor._id] } });
  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
