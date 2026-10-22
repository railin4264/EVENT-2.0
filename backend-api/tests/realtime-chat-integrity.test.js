const http = require('http');
const express = require('express');
const request = require('supertest');
const { io: connect } = require('../../eventconnect-frontend/node_modules/socket.io-client');
const socketService = require('../src/services/socketService');
const User = require('../src/models/User');
const Chat = require('../src/models/Chat');
const Message = require('../src/models/Message');
const jwt = require('../src/services/jwtService');
const app = express(); app.use(express.json()); app.use('/chat', require('../src/routes/chat'));
let server, url, alice, bob, outsider, chat; const clients = [];
const once = (socket, name) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timed out: ${name}`)), 4000); socket.once(name, value => { clearTimeout(timer); resolve(value); }); });
async function client(user) { const socket = connect(url, { autoConnect: false, auth: { token: jwt.generateAccessToken({ id: user.id }) }, transports: ['websocket'], reconnection: false }); clients.push(socket); const ready = once(socket, 'connect'); socket.connect(); await ready; return socket; }
async function joined(socket) { socket.emit('joinChat', { chatId: chat.chatId }); for (let i = 0; i < 100; i++) { if (socketService.io.sockets.sockets.get(socket.id)?.rooms.has(chat.chatId)) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw new Error('Room not joined'); }
beforeAll(async () => {
  [alice, bob, outsider] = await User.create(['alice','bob','outsider'].map(name => ({ username: `socket_${name}`, email: `${name}@example.test`, password: 'Password!2026', firstName: name })));
  chat = await Chat.create({ chatId: 'canonical-room-not-mongo-id', type: 'direct', participants: [{ user: alice.id }, { user: bob.id }] });
  server = http.createServer(app); app.set('io', socketService.initialize(server));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); url = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => {
  clients.splice(0).forEach(socket => socket.disconnect());
  for (let attempt = 0; attempt < 100; attempt++) {
    const online = await User.countDocuments({ _id: { $in: [alice.id, bob.id, outsider.id] }, isOnline: true });
    if (!socketService.connectedUsers.size && !online) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
});
afterAll(async () => { clients.forEach(socket => socket.disconnect()); socketService.shutdown(); await new Promise(resolve => server.close(resolve)); });
test('HTTP persists the message once and the canonical Socket.IO room receives it', async () => {
  const a = await client(alice), b = await client(bob); await joined(a); await joined(b);
  const delivery = once(b, 'newMessage'); const notification = once(b, 'newNotification');
  const r = await request(app).post(`/chat/${chat.chatId}/messages`).set('Authorization', `Bearer ${jwt.generateAccessToken({ id: alice.id })}`).send({ content: 'Mensaje real de integración', messageType: 'text' });
  expect(r.status).toBe(201); const received = await delivery; expect(received.chatId).toBe(chat.chatId); expect(received.message._id).toBe(r.body.data._id);
  expect(await Message.countDocuments({ chatId: chat.chatId })).toBe(1);
  const notice = await notification; expect(notice.data.chatId).toBe(chat.chatId); expect(notice.actionUrl).toBe(`/messages?chatId=${chat.id}`); expect(await require('../src/models/Notification').countDocuments({ recipient: bob.id, type: 'message' })).toBe(1);
  const history = await request(app).get(`/chat/${chat.id}/messages`).set('Authorization', `Bearer ${jwt.generateAccessToken({ id: bob.id })}`);
  expect(history.status).toBe(200); expect(history.body.data[0]._id).toBe(r.body.data._id);
});
test('non-participants cannot join, mark messages read or query history', async () => {
  const o = await client(outsider); const denied = once(o, 'error'); o.emit('joinChat', { chatId: chat.chatId }); expect((await denied).message).toContain('acceso');
  expect(socketService.io.sockets.sockets.get(o.id).rooms.has(chat.chatId)).toBe(false);
  const message = await Message.findOne({ chatId: chat.chatId }); const read = once(o, 'error'); o.emit('markAsRead', { chatId: chat.chatId, messageId: message.id }); expect((await read).message).toContain('acceso');
  const token = jwt.generateAccessToken({ id: outsider.id });
  expect((await request(app).put(`/chat/${chat.id}/messages/${message.id}/read`).set('Authorization', `Bearer ${token}`)).status).toBe(403);
  expect((await request(app).get(`/chat/${chat.id}/messages`).set('Authorization', `Bearer ${token}`)).status).toBe(403);
});
test('typing only broadcasts from joined members and excludes account information', async () => {
  const a = await client(alice), b = await client(bob); await joined(a); await joined(b);
  const notice = once(b, 'userTyping'); a.emit('typing', { chatId: chat.chatId }); const data = await notice;
  expect(data.userId).toBe(alice.id); expect(data.user.email).toBeUndefined(); expect(data.user.settings).toBeUndefined(); expect(data.user.password).toBeUndefined();
  const o = await client(outsider); let received = false; const spy = () => { received = true; }; b.on('userTyping', spy); o.emit('typing', { chatId: chat.chatId }); o.emit('typing');
  await new Promise(resolve => setTimeout(resolve, 100)); b.off('userTyping', spy); expect(received).toBe(false);
});
test('invalid credentials cannot establish an authenticated connection', async () => {
  const socket = connect(url, { autoConnect: false, auth: { token: 'invalid' }, transports: ['websocket'], reconnection: false }); clients.push(socket); const error = once(socket, 'connect_error'); socket.connect(); expect((await error).message).toContain('Authentication error'); expect(socket.connected).toBe(false);
});
