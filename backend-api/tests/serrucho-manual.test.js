const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Serrucho = require('../src/models/Serrucho');
const jwtService = require('../src/services/jwtService');
const { app } = require('../src/server');

let owner, contributor, stranger, admin, others, event;
const tokens = new Map();
const call = (method, path = '', user) => {
  const operation = request(app)[method](`/api/serrucho${path}`);
  return user ? operation.set('Authorization', `Bearer ${tokens.get(user.id)}`) : operation;
};
const create = (body = {}, user = owner) => call('post', '', user).send({ eventId: event.id, title: 'Gastos del grupo',
  perPersonAmount: 100, targetParticipants: 4, targetAmount: 400, currency: 'DOP',
  paymentInstructions: { bankName: 'Banco privado del grupo', accountNumber: 'CUENTA-RESERVADA', rncOrCedula: 'DOCUMENTO-RESERVADO' }, ...body });
const join = (pool, user, body = {}) => call('post', `/${pool.shareCode}/join`, user).send(body);
const confirm = (pool, participant, user = owner) => call('put', `/${pool.shareCode}/confirm/${participant._id}`, user);

beforeAll(async () => {
  const users = await User.create(['owner', 'contributor', 'stranger', 'admin', 'a', 'b', 'c', 'd'].map(name => ({
    username: `manual_pool_${name}`, email: `manual-pool-${name}@example.com`, password: 'TestPassword1!',
    firstName: name, birthDate: new Date('1990-01-01'), role: name === 'admin' ? 'admin' : 'user',
    ...(name === 'owner' ? { phone: '+18095550001' } : {}) })));
  [owner, contributor, stranger, admin, ...others] = users;
  for (const user of users) tokens.set(user.id, jwtService.generateTokenPair(user).accessToken);
  await Serrucho.init();
});
beforeEach(async () => {
  await Promise.all([Serrucho.deleteMany({}), Event.deleteMany({})]);
  event = await Event.create({ title: 'Evento del grupo', description: 'Descripción reservada que no debe salir por la vista de aportes',
    category: 'music', createdBy: owner._id, status: 'published', date: new Date(Date.now() + 86400000),
    price: { amount: 100, currency: 'DOP' }, location: { type: 'Point', coordinates: [-69.991234, 18.998765], address: 'DIRECCIÓN-RESERVADA' } });
});

test('creator begins with a pending commitment, never an automatic payment or custodial balance', async () => {
  const result = await create();
  expect(result.status).toBe(201);
  expect(result.body.data).toMatchObject({ totalCollected: 0, committedAmount: 100, progressPercent: 0,
    participantCount: 1, participantsCount: 1, paymentMode: 'manual_record', canManage: true, isParticipant: true, status: 'open' });
  expect(result.body.data.participants[0]).toMatchObject({ paid: false, paymentStatus: 'pending', paidAt: null, confirmedBy: null });
  expect(result.body.data.shareCode).toMatch(/^coro-[a-f0-9]{24}$/);
  expect(result.body.data.paymentNotice).toMatch(/no cobra, custodia ni verifica/);
});

test('arbitrary voucher, paid flags and identity do not confirm money; only creator/admin can manually confirm', async () => {
  const pool = (await create()).body.data;
  const contribution = await join(pool, contributor, { amount: 400, voucherRef: 'REFERENCIA-NO-VERIFICADA', paid: true, user: owner.id,
    paymentStatus: 'confirmed', confirmedBy: owner.id });
  expect(contribution.status).toBe(200);
  expect(contribution.body.data).toMatchObject({ totalCollected: 0, status: 'open', committedAmount: 500 });
  const own = contribution.body.data.participants.find(p => p.isSelf);
  expect(own).toMatchObject({ user: contributor.id, paymentStatus: 'submitted', paid: false, confirmedBy: null });
  expect((await confirm(pool, own, contributor)).status).toBe(403);
  expect((await confirm(pool, own, stranger)).status).toBe(403);
  const confirmed = await confirm(pool, own);
  expect(confirmed.status).toBe(200);
  expect(confirmed.body.data).toMatchObject({ totalCollected: 400, status: 'completed', progressPercent: 100 });
  expect(confirmed.body.data.participants.find(p => p._id === own._id)).toMatchObject({ paid: true, paymentStatus: 'confirmed', confirmedBy: owner.id });
  const timestamp = confirmed.body.data.participants.find(p => p._id === own._id).confirmedAt;
  const repeated = await confirm(pool, own, admin);
  expect(repeated.body.data.totalCollected).toBe(400);
  expect(repeated.body.data.participants.find(p => p._id === own._id).confirmedAt).toBe(timestamp);
  expect((await join(pool, stranger)).status).toBe(409);
});

test('legacy auto-paid records and completed flags are not presented as verified confirmations', async () => {
  const legacy = await Serrucho.create({ event: event._id, creator: owner._id, title: 'Registro anterior', targetAmount: 100,
    perPersonAmount: 100, targetParticipants: 2, status: 'completed', shareCode: 'coro-abcdef', participants: [
      { user: owner._id, name: 'Anfitrión', amount: 100, paid: true, paidAt: new Date(), voucherRef: 'Voucher antiguo' }
    ] });
  expect(legacy.totalCollected).toBe(0);
  const publicView = await call('get', `/${legacy.shareCode}`);
  expect(publicView.body.data).toMatchObject({ totalCollected: 0, progressPercent: 0, status: 'open' });
  expect(publicView.body.data.participants[0]).toMatchObject({ paid: false, paymentStatus: 'submitted' });
  const confirmed = await confirm(legacy, legacy.participants[0], admin);
  expect(confirmed.body.data).toMatchObject({ totalCollected: 100, status: 'completed' });
});

test('public previews hide bank, phone, voucher, personal identities, description and secret coordinates', async () => {
  await Event.updateOne({ _id: event._id }, { $set: { isSecretLocation: true } });
  const pool = (await create()).body.data;
  await join(pool, contributor, { phone: '+18095559999', voucherRef: 'COMPROBANTE-PRIVADO' });
  for (const viewer of [null, stranger]) {
    const result = await call('get', `/${pool.shareCode}`, viewer);
    expect(result.status).toBe(200);
    const data = result.body.data;
    expect(data.paymentInstructions).toBeUndefined();
    expect(data.participants.every(p => !p._id && !p.user && !p.phone && !p.voucherRef && /^Participante \d+$/.test(p.name))).toBe(true);
    expect(data.event.location).toBeUndefined();
    expect(data.event.description).toBeUndefined();
    expect(JSON.stringify(data)).not.toMatch(/CUENTA-RESERVADA|DOCUMENTO-RESERVADO|COMPROBANTE-PRIVADO|1809555|DIRECCIÓN-RESERVADA|69\.991234/);
    expect(result.headers['cache-control']).toBe('private, no-store');
  }
  const participantView = (await call('get', `/${pool.shareCode}`, contributor)).body.data;
  expect(participantView.paymentInstructions.accountNumber).toBe('CUENTA-RESERVADA');
  expect(participantView.participants.find(p => p.isSelf).voucherRef).toBe('COMPROBANTE-PRIVADO');
  expect(participantView.participants.find(p => !p.isSelf).phone).toBeUndefined();
  const managerView = (await call('get', `/${pool.shareCode}`, owner)).body.data;
  expect(managerView.participants.find(p => p.user === contributor.id).phone).toBe('+18095559999');
});

test('private, unpublished and age-restricted event details cannot be discovered through a pool', async () => {
  await Event.updateOne({ _id: event._id }, { $set: { isPrivate: true } });
  expect((await create({}, stranger)).status).toBe(404);
  const pool = (await create()).body.data;
  expect((await call('get', `/${pool.shareCode}`)).status).toBe(404);
  expect((await call('get', `/${pool.shareCode}`, stranger)).status).toBe(404);
  expect((await join(pool, stranger)).status).toBe(404);
  expect((await call('get', `/${pool.shareCode}`, admin)).status).toBe(200);
  await Event.updateOne({ _id: event._id }, { $set: { isPrivate: false, ageRestriction: { minAge: 99 } } });
  expect((await call('get', `/${pool.shareCode}`)).status).toBe(404);
  expect((await call('get', `/${pool.shareCode}`, stranger)).status).toBe(404);
  await Event.updateOne({ _id: event._id }, { $set: { status: 'draft' } });
  expect((await call('get', `/${pool.shareCode}`)).status).toBe(404);
  expect((await create()).status).toBe(404);
});

test('expired pools refuse new joins but allow authorized reconciliation of late external payments', async () => {
  const pool = (await create()).body.data;
  await Serrucho.updateOne({ shareCode: pool.shareCode }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await join(pool, contributor)).status).toBe(410);
  const view = await call('get', `/${pool.shareCode}`, owner);
  expect(view.body.data).toMatchObject({ isExpired: true, status: 'expired', canJoin: false });
  const own = view.body.data.participants[0];
  const confirmation = await confirm(pool, own);
  expect(confirmation.status).toBe(200);
  expect(confirmation.body.data).toMatchObject({ isExpired: true, totalCollected: 100, status: 'expired' });
  expect(confirmation.body.data.participants[0]).toMatchObject({ confirmedAfterExpiry: true, paymentStatus: 'confirmed' });
  expect((await join(pool, owner)).status).toBe(200);
});

test('concurrent duplicate joins are idempotent; distinct joins cannot overbook the final slot', async () => {
  const pool = (await create({ targetParticipants: 2, targetAmount: 200 })).body.data;
  const repeats = await Promise.all(Array.from({ length: 4 }, () => join(pool, contributor)));
  expect(repeats.every(result => result.status === 200)).toBe(true);
  expect((await Serrucho.findOne({ shareCode: pool.shareCode })).participants).toHaveLength(2);
  const fresh = (await create({ targetParticipants: 2, targetAmount: 200 })).body.data;
  const competing = await Promise.all(others.map(user => join(fresh, user)));
  expect(competing.filter(result => result.status === 200)).toHaveLength(1);
  expect(competing.filter(result => result.status === 409)).toHaveLength(3);
  const saved = await Serrucho.findOne({ shareCode: fresh.shareCode });
  expect(saved.participants).toHaveLength(2);
  expect(new Set(saved.participants.map(p => String(p.user))).size).toBe(2);
});

test('concurrent manual confirmations preserve both contributions and count each only once', async () => {
  const pool = (await create({ targetParticipants: 2, targetAmount: 200 })).body.data;
  await join(pool, contributor);
  const participants = (await call('get', `/${pool.shareCode}`, owner)).body.data.participants;
  const confirmations = await Promise.all(participants.flatMap(participant => [confirm(pool, participant), confirm(pool, participant)]));
  expect(confirmations.every(result => result.status === 200)).toBe(true);
  const result = await call('get', `/${pool.shareCode}`, owner);
  expect(result.body.data).toMatchObject({ totalCollected: 200, confirmedParticipantsCount: 2, status: 'completed' });
  expect((await Serrucho.findOne({ shareCode: pool.shareCode })).totalCollected).toBe(200);
});

test('submitted evidence can be updated only on the caller record and never reverts confirmation or duplicates a person', async () => {
  const pool = (await create()).body.data;
  await join(pool, contributor, { amount: 123.45 });
  const updated = await join(pool, contributor, { voucherRef: 'Evidencia nueva' });
  expect(updated.status).toBe(200);
  const own = updated.body.data.participants.find(p => p.isSelf);
  expect(own).toMatchObject({ amount: 123.45, paymentStatus: 'submitted', paid: false });
  expect((await join(pool, contributor, { amount: 100 })).status).toBe(409);
  await confirm(pool, own);
  const result = await join(pool, contributor, { voucherRef: 'Otra evidencia', paid: false });
  expect(result.body.data.participants.find(p => p.isSelf)).toMatchObject({ paid: true, paymentStatus: 'confirmed', voucherRef: 'Evidencia nueva' });
  expect(result.body.data.participantCount).toBe(2);
});

test('cancelled groups cannot be resurrected by joining or confirming and guest joins require authentication', async () => {
  const pool = (await create()).body.data;
  expect((await join(pool, null, { name: 'Invitado', phone: '+18095550000' })).status).toBe(401);
  await Serrucho.updateOne({ shareCode: pool.shareCode }, { $set: { status: 'cancelled' } });
  expect((await join(pool, contributor)).status).toBe(409);
  expect((await confirm(pool, pool.participants[0])).status).toBe(409);
  expect((await call('get', `/${pool.shareCode}`)).body.data.status).toBe('cancelled');
});

test.each([
  ['perPersonAmount', 0], ['perPersonAmount', -1], ['perPersonAmount', 'Infinity'], ['perPersonAmount', true],
  ['perPersonAmount', 1.001], ['perPersonAmount', 100000001], ['targetAmount', 0], ['targetAmount', 50],
  ['targetParticipants', 1], ['targetParticipants', 51], ['targetParticipants', 2.5], ['targetParticipants', null],
  ['currency', 'US'], ['currency', null], ['paymentInstructions', []], ['title', 'x'.repeat(121)],
  ['expiresAt', '2020-01-01T00:00:00Z'], ['expiresAt', 'tomorrow']
])('invalid %s=%j returns 400 rather than inventing a default or saving an invalid record', async (key, value) => {
  const result = await create({ [key]: value });
  expect(result.status).toBe(400);
  expect(await Serrucho.countDocuments({})).toBe(0);
});

test.each([0, -1, 'Infinity', null, [], {}, 1.001, 100000001])('invalid contribution amount %j returns 400 without joining', async amount => {
  const pool = (await create()).body.data;
  expect((await join(pool, contributor, { amount })).status).toBe(400);
  expect((await Serrucho.findOne({ shareCode: pool.shareCode })).participants).toHaveLength(1);
});

test('malformed IDs, links and contribution fields return controlled 400 responses', async () => {
  const pool = (await create()).body.data;
  expect((await create({ eventId: 'invalid' })).status).toBe(400);
  expect((await call('post', '', owner)).status).toBe(400);
  expect((await call('get', '/invalid')).status).toBe(400);
  expect((await call('put', `/${pool.shareCode}/confirm/invalid`, owner)).status).toBe(400);
  for (const fields of [{ phone: {} }, { voucherRef: 'x'.repeat(301) }, { paymentMethod: 'crypto' }, { paymentMethod: null }]) {
    expect((await join(pool, contributor, fields)).status).toBe(400);
  }
});
