const request = require('supertest');
const User = require('../src/models/User');
const jwt = require('../src/services/jwtService');
const { app } = require('../src/server');
let tokenA, tokenB;
const data = { objective: 'Encontrar espacio', deliverables: 'Una presentación', measurement: 'Revisión manual', checklist: [false, true] };
const path = '/api/users/me/workspaces/partner-brief/personal';
beforeAll(async () => {
  const [a, b] = await User.create([
    { firstName: 'Workspace A', username: 'workspace_a', email: 'workspace-a@example.test', password: 'WorkspaceOnly!2026' },
    { firstName: 'Workspace B', username: 'workspace_b', email: 'workspace-b@example.test', password: 'WorkspaceOnly!2026' }
  ]);
  tokenA = jwt.generateTokenPair(a).accessToken; tokenB = jwt.generateTokenPair(b).accessToken;
});
test('private workspaces persist, reject stale writes and never cross account boundaries', async () => {
  expect((await request(app).get(path)).status).toBe(401);
  expect((await request(app).put(path).set('Authorization', `Bearer ${tokenA}`).send({ ownerId: '000000000000000000000000', data, version: 0 })).status).toBe(403);
  const saved = await request(app).put(path).set('Authorization', `Bearer ${tokenA}`).send({ data, version: 0 });
  expect(saved.status).toBe(200);
  const originalVersion = saved.body.data.version;
  expect(originalVersion).toMatch(/^[a-f0-9-]{36}$/);
  const own = await request(app).get(path).set('Authorization', `Bearer ${tokenA}`);
  expect(own.body.data.data).toEqual(data);
  expect(own.headers['cache-control']).toBe('private, no-store');
  const other = await request(app).get(path).set('Authorization', `Bearer ${tokenB}`);
  expect(other.body.data).toEqual({ data: null, version: 0 });
  expect((await request(app).put(path).set('Authorization', `Bearer ${tokenA}`).send({ data, version: 0 })).status).toBe(409);
  const updated = await request(app).put(path).set('Authorization', `Bearer ${tokenA}`).send({ data: { ...data, objective: 'Actualizado' }, version: originalVersion });
  expect(updated.status).toBe(200);
  const updatedVersion = updated.body.data.version;
  expect((await request(app).delete(`${path}?version=${originalVersion}`).set('Authorization', `Bearer ${tokenA}`)).status).toBe(409);
  expect((await request(app).delete(`${path}?version=${updatedVersion}`).set('Authorization', `Bearer ${tokenA}`)).status).toBe(200);
  const recreated = await request(app).put(path).set('Authorization', `Bearer ${tokenA}`).send({ data, version: 0 });
  expect(recreated.status).toBe(200);
  expect(recreated.body.data.version).not.toBe(originalVersion);
  expect((await request(app).put(path).set('Authorization', `Bearer ${tokenA}`).send({ data, version: originalVersion })).status).toBe(409);
  await request(app).delete(`${path}?version=${recreated.body.data.version}`).set('Authorization', `Bearer ${tokenA}`);
});
test('simultaneous creation cannot exceed the 20-slot quota or accept arbitrary objects', async () => {
  const results = await Promise.all(Array.from({ length: 23 }, (_, index) => request(app).put(`/api/users/me/workspaces/partner-brief/slot-${index}`).set('Authorization', `Bearer ${tokenB}`).send({ data, version: 0 })));
  expect(results.filter(result => result.status === 200)).toHaveLength(20);
  expect(results.filter(result => result.status === 409)).toHaveLength(3);
  expect((await request(app).put(path).set('Authorization', `Bearer ${tokenA}`).send({ version: 0, data: { ...data, unexpected: 'not allowed' } })).status).toBe(400);
});

test('explicit account deletion removes private workspaces and pending push receipts', async () => {
  const owner = await User.findOne({ username: 'workspace_b' });
  await require('../src/models/PushReceipt').create({ ticketId: 'private-device-ticket', token: 'ExpoPushToken[private]', recipient: owner._id, notification: new (require('mongoose').Types.ObjectId)(), checkAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
  await User.updateOne({ _id: owner._id }, { $set: { pushTokens: [{ token: 'ExpoPushToken[private]', platform: 'android' }], 'notificationSettings.pushEnabled': true, 'settings.notifications.push': true } });
  const response = await request(app).delete('/api/users/account').set('Authorization', `Bearer ${tokenB}`).send({ password: 'WorkspaceOnly!2026' });
  expect(response.status).toBe(200);
  const deleted = await User.findById(owner._id);
  expect(deleted.pushTokens).toHaveLength(0); expect(deleted.notificationSettings.pushEnabled).toBe(false);
  expect(await require('../src/models/UserWorkspace').findById(owner._id)).toBeNull();
  expect(await require('../src/models/PushReceipt').countDocuments({ recipient: owner._id })).toBe(0);
});
