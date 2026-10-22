const request = require('supertest');
const mongoose = require('mongoose');
const sharp = require('sharp');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Memory = require('../src/models/EventMemory');
const Order = require('../src/models/Order');
const jwtService = require('../src/services/jwtService');
const { app } = require('../src/server');
let users, tokens, event, otherEvent, photo;
const bucketFiles = () => mongoose.connection.db.collection('privateMemories.files');
const bucketChunks = () => mongoose.connection.db.collection('privateMemories.chunks');
const albumPath = () => `/api/events/${event.id}/memories`;
const read = (url, user) => {
  const req = request(app).get(url);
  return user === undefined ? req : req.set('Authorization', `Bearer ${tokens[user]}`);
};
const upload = (user = 1) => request(app).post(albumPath()).set('Authorization', `Bearer ${tokens[user]}`)
  .field('caption', 'Nuestro recuerdo').attach('memoryImage', photo, { filename: 'private-gps-original.png', contentType: 'image/png' });

beforeAll(async () => {
  users = await User.create(['organizer', 'attendee', 'other'].map(name => ({ username: `private_${name}`,
    email: `private_${name}@example.com`, password: 'TestPassword1!', firstName: name, lastName: 'Album' })));
  tokens = users.map(user => jwtService.generateTokenPair(user).accessToken);
  photo = await sharp({ create: { width: 12, height: 8, channels: 3, background: '#19ad80' } })
    .withMetadata({ orientation: 6 }).png().toBuffer();
});
beforeEach(async () => {
  await Memory.deleteMany({});
  await Event.deleteMany({});
  await Order.deleteMany({});
  await bucketFiles().deleteMany({});
  await bucketChunks().deleteMany({});
  const base = { title: 'Álbum de prueba', description: 'Verificación del acceso privado a fotos de asistentes', category: 'music',
    date: new Date(Date.now() - 86400000), location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Prueba' } };
  event = await Event.create({ ...base, createdBy: users[0]._id, attendees: [{ user: users[1]._id, status: 'confirmed' }] });
  otherEvent = await Event.create({ ...base, createdBy: users[2]._id, isPrivate: true });
});

test('upload stores a real private image and responses never disclose public links or storage IDs', async () => {
  const created = await upload();
  expect(created.status).toBe(201);
  const memory = created.body.data;
  expect(memory.imageUrl).toBe(`/events/${event.id}/memories/${memory._id}/image`);
  expect(memory.imageAssetId).toBeUndefined();
  expect(memory.imageUnavailable).toBe(false);
  expect(memory.isOwner).toBe(true);
  expect(await bucketFiles().countDocuments()).toBe(1);
  const listing = await read(albumPath(), 1);
  expect(listing.headers['cache-control']).toContain('no-store');
  expect(listing.body.data[0].imageUrl).toBe(memory.imageUrl);
  expect(JSON.stringify(listing.body)).not.toMatch(/imageAssetId|private-gps-original|https?:|uploads\//);
  const file = await read(`/api${memory.imageUrl}`, 1);
  expect(file.status).toBe(200);
  expect(file.headers['content-type']).toMatch(/image\/jpeg/);
  expect(file.headers['cache-control']).toContain('no-store');
  expect(file.headers['x-content-type-options']).toBe('nosniff');
  const info = await sharp(file.body).metadata();
  expect(info.format).toBe('jpeg');
  expect(info.width).toBe(8);
  expect(info.height).toBe(12);
  expect(info.exif).toBeUndefined();
  expect(info.orientation).toBeUndefined();
});

test('copying the image URL cannot bypass authentication, event scope or participation', async () => {
  const memory = (await upload()).body.data;
  const url = `/api${memory.imageUrl}`;
  expect((await read(url)).status).toBe(401);
  expect((await read(url, 2)).status).toBe(403);
  expect((await read(url, 0)).status).toBe(200);
  expect((await read(`/api/events/${otherEvent.id}/memories/${memory._id}/image`, 2)).status).toBe(404);
  await Event.updateOne({ _id: event._id, 'attendees.user': users[1]._id }, { $set: { 'attendees.$.status': 'cancelled' } });
  expect((await read(url, 1)).status).toBe(403);
});

test('refunds revoke file access granted by a paid order', async () => {
  const memory = (await upload()).body.data;
  await Event.updateOne({ _id: event._id }, { $set: { attendees: [] } });
  const order = await Order.create({ orderNumber: 'PRIVATE-ALBUM-PAID', userId: users[1]._id, eventId: event._id,
    customerInfo: { firstName: 'Test', lastName: 'Buyer', email: users[1].email },
    items: [{ ticketId: new mongoose.Types.ObjectId(), quantity: 1, unitPrice: 0, totalPrice: 0 }],
    subtotal: 0, total: 0, status: 'confirmed', paymentStatus: 'succeeded' });
  expect((await read(`/api${memory.imageUrl}`, 1)).status).toBe(200);
  expect((await read(`/api/events/${event.id}`, 1)).body.event.isAttending).toBe(true);
  await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'refunded' } });
  expect((await read(`/api${memory.imageUrl}`, 1)).status).toBe(403);
  expect((await read(`/api/events/${event.id}`, 1)).body.event.isAttending).toBe(false);
});

test('public URL submissions are rejected and legacy links are withheld without deleting their records', async () => {
  const legacy = await Memory.create({ event: event._id, user: users[1]._id, imageUrl: 'https://public.example.com/original.jpg' });
  const submitted = await request(app).post(albumPath()).set('Authorization', `Bearer ${tokens[1]}`)
    .send({ imageUrl: 'https://public.example.com/new.jpg', caption: 'No público' });
  expect(submitted.status).toBe(400);
  const listing = await read(albumPath(), 1);
  expect(listing.body.data[0]).toMatchObject({ _id: legacy.id, imageUrl: '', imageUnavailable: true });
  expect(JSON.stringify(listing.body)).not.toContain('public.example.com');
  expect((await read(`${albumPath()}/${legacy.id}/image`, 1)).status).toBe(404);
  expect((await Memory.findById(legacy.id)).imageUrl).toContain('public.example.com');
});

test('removing a memory removes stored bytes; moderation immediately blocks subsequent reads', async () => {
  const memory = (await upload()).body.data;
  await Memory.updateOne({ _id: memory._id }, { $set: { isApproved: false } });
  expect((await read(`/api${memory.imageUrl}`, 1)).status).toBe(404);
  expect((await request(app).delete(`${albumPath()}/${memory._id}`).set('Authorization', `Bearer ${tokens[2]}`)).status).toBe(403);
  await Event.updateOne({ _id: event._id }, { $set: { attendees: [] } });
  expect((await request(app).delete(`${albumPath()}/${memory._id}`).set('Authorization', `Bearer ${tokens[1]}`)).status).toBe(200);
  expect(await bucketFiles().countDocuments()).toBe(0);
  expect(await bucketChunks().countDocuments()).toBe(0);
  expect((await read(`/api${memory.imageUrl}`, 0)).status).toBe(404);
});

test('invalid images, MIME spoofing, oversize files and long captions leave no stored artifacts', async () => {
  const attempt = (data, contentType = 'image/png', caption = '') => request(app).post(albumPath())
    .set('Authorization', `Bearer ${tokens[1]}`).field('caption', caption)
    .attach('memoryImage', data, { filename: 'photo.png', contentType });
  expect((await attempt(Buffer.from('<script>not an image</script>'))).status).toBe(400);
  expect((await attempt(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'))).status).toBe(400);
  expect((await attempt(photo, 'application/pdf')).status).toBe(400);
  expect((await attempt(Buffer.alloc(10 * 1024 * 1024 + 1))).status).toBe(413);
  expect((await attempt(photo, 'image/png', 'a'.repeat(201))).status).toBe(400);
  expect((await upload(2)).status).toBe(403);
  expect(await Memory.countDocuments()).toBe(0);
  expect(await bucketFiles().countDocuments()).toBe(0);
  expect(await bucketChunks().countDocuments()).toBe(0);
});

test('a database failure after upload cleans up the private file', async () => {
  const save = jest.spyOn(Memory.prototype, 'save').mockRejectedValueOnce(new Error('Simulated failure'));
  try { expect((await upload()).status).toBe(500); } finally { save.mockRestore(); }
  expect(await bucketFiles().countDocuments()).toBe(0);
  expect(await bucketChunks().countDocuments()).toBe(0);
  expect(await Memory.countDocuments()).toBe(0);
});
