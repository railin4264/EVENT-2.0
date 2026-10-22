const request = require('supertest');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const User = require('../src/models/User');
const Tribe = require('../src/models/Tribe');
const Event = require('../src/models/Event');
const Notification = require('../src/models/Notification');
const jwtService = require('../src/services/jwtService');
const { invalidateCache } = require('../src/middleware/cache');
const { app } = require('../src/server');

let owner, member, outsider, moderator, admin, applicants;
const tokens = new Map();
const call = (method, path, user) => {
  const operation = request(app)[method](`/api/tribes${path}`);
  return user ? operation.set('Authorization', `Bearer ${tokens.get(user.id)}`) : operation;
};
const seed = (settings = {}, extra = {}) => Tribe.create({ name: 'Comunidad aislada',
  description: 'Una comunidad de prueba para validar acceso real', category: 'music', creator: owner._id,
  location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Lugar de prueba' },
  members: [{ user: owner._id, role: 'admin', status: 'active' }, { user: member._id, role: 'member', status: 'active' }],
  settings: { privacy: 'public', membership: 'open', ...settings },
  socialLinks: { whatsapp: 'https://example.com/contacto-reservado' }, welcomeMessage: 'Bienvenida interna reservada',
  posts: [{ author: owner._id, content: 'Contenido del muro reservado', comments: [{ user: member._id, content: 'Comentario reservado' }] }],
  joinRequests: [{ user: outsider._id, message: 'Presentación privada del solicitante', status: 'pending' }], ...extra });
const expectPublicCard = tribe => {
  expect(tribe).toMatchObject({ canViewContent: false, canManageRequests: false, pendingRequestsCount: 0, socialLinks: {}, welcomeMessage: '' });
  expect(tribe.members || []).toEqual([]);
  expect(tribe.posts || []).toEqual([]);
  expect(tribe.events || []).toEqual([]);
  expect(tribe.joinRequests || []).toEqual([]);
  expect(JSON.stringify(tribe)).not.toMatch(/Contenido del muro reservado|Comentario reservado|contacto-reservado|Presentación privada/);
};

beforeAll(async () => {
  const names = ['owner', 'member', 'outsider', 'moderator', 'admin', 'a', 'b', 'c', 'd'];
  const users = await User.create(names.map(name => ({ username: `tribe_access_${name}`, email: `tribe-access-${name}@example.com`,
    firstName: name, password: 'TestPassword1!', role: name === 'admin' ? 'admin' : 'user', birthDate: new Date('1990-01-01') })));
  [owner, member, outsider, moderator, admin, ...applicants] = users;
  for (const user of users) tokens.set(user.id, jwtService.generateTokenPair(user).accessToken);
  await Tribe.init();
});
beforeEach(async () => { await Promise.all([Tribe.deleteMany({}), Event.deleteMany({}), Notification.deleteMany({})]); invalidateCache(); });

test('public walls stay readable while contacts, membership lists and requests remain reserved', async () => {
  const tribe = await seed();
  const response = await call('get', `/${tribe.id}`);
  expect(response.status).toBe(200);
  expect(response.body.tribe).toMatchObject({ canViewContent: true, isMember: false, canJoin: false,
    canManageRequests: false, members: [], socialLinks: {}, pendingRequestsCount: 0, joinRequests: [] });
  expect(response.body.tribe.posts[0].content).toBe('Contenido del muro reservado');
  const authenticated = await call('get', `/${tribe.id}`, member);
  expect(authenticated.body.tribe.members).toHaveLength(2);
  expect(authenticated.body.tribe.socialLinks.whatsapp).toContain('contacto-reservado');
  expect(authenticated.headers['cache-control']).toBe('private, no-store');
});

test.each([{ privacy: 'private' }, { privacy: 'public', membership: 'approval_required' }])(
  'private/approval cards hide content in detail, lists and nearby, including pending applicants: %j', async settings => {
    const tribe = await seed(settings);
    for (const user of [null, outsider]) {
      const detail = await call('get', `/${tribe.id}`, user);
      expect(detail.status).toBe(200);
      expectPublicCard(detail.body.tribe);
      const list = await call('get', '/', user);
      expectPublicCard(list.body.tribes[0]);
      const nearby = await call('get', '/nearby?lat=18.48&lng=-69.93', user);
      expectPublicCard(nearby.body.tribes[0]);
      expect((await call('get', `/${tribe.id}/posts`, user)).status).toBe(user ? 403 : 401);
    }
    const detail = await call('get', `/${tribe.id}`, member);
    expect(detail.body.tribe).toMatchObject({ canViewContent: true, isMember: true });
    expect(detail.body.tribe.posts).toHaveLength(1);
  }
);

test('secret tribes cannot be discovered by outsiders but remain available to active members, creator and platform admin', async () => {
  const tribe = await seed({ privacy: 'secret', membership: 'invite_only' });
  for (const user of [null, outsider]) {
    expect((await call('get', `/${tribe.id}`, user)).status).toBe(404);
    expect((await call('get', '/', user)).body.tribes).toEqual([]);
    expect((await call('get', '/?search=Comunidad', user)).body.tribes).toEqual([]);
    expect((await call('get', '/nearby?lat=18.48&lng=-69.93', user)).body.tribes).toEqual([]);
  }
  for (const user of [member, owner, admin]) {
    expect((await call('get', `/${tribe.id}`, user)).status).toBe(200);
    expect((await call('get', '/', user)).body.tribes.map(t => t._id)).toContain(tribe.id);
    expect((await call('get', '/nearby?lat=18.48&lng=-69.93', user)).body.tribes.map(t => t._id)).toContain(tribe.id);
  }
});

test.each([{ privacy: 'secret', membership: 'open' }, { privacy: 'public', membership: 'invite_only' },
  { privacy: 'private', membership: 'invite_only' }])('invite-only policy never permits direct enrollment: %j', async settings => {
  const tribe = await seed(settings, { joinRequests: [] });
  const result = await call('post', `/${tribe.id}/join`, outsider).send({});
  expect(result.status).toBe(403);
  expect(result.body.message).toMatch(/invitación/);
  const saved = await Tribe.findById(tribe.id);
  expect(saved.members).toHaveLength(2);
  expect(saved.joinRequests).toHaveLength(0);
});

test.each(['inactive', 'banned'])('stale %s admin/moderator roles cannot moderate, read private walls or delete content', async status => {
  const tribe = await seed({ privacy: 'private' }, { members: [
    { user: owner._id, role: 'admin', status: 'active' }, { user: moderator._id, role: 'admin', status }
  ] });
  const paths = [['get', '/requests'], ['post', `/requests/${outsider.id}/approve`], ['post', `/requests/${outsider.id}/reject`],
    ['put', ''], ['delete', ''], ['delete', `/posts/${tribe.posts[0].id}`], ['get', '/posts'], ['get', '/stories']];
  for (const [method, path] of paths) expect((await call(method, `/${tribe.id}${path}`, moderator).send({ name: 'Nombre nuevo' })).status).toBe(403);
  const detail = await call('get', `/${tribe.id}`, moderator);
  expectPublicCard(detail.body.tribe);
  expect(detail.body.tribe).toMatchObject({ userRole: null, isMember: false, isBanned: status === 'banned' });
  expect((await Tribe.findById(tribe.id)).joinRequests[0].status).toBe('pending');
});

test('active moderators can manage requests; creator/platform admin exceptions remain explicit', async () => {
  const tribe = await seed({ privacy: 'private' }, { members: [
    { user: owner._id, role: 'admin', status: 'banned' }, { user: moderator._id, role: 'moderator', status: 'active' }
  ] });
  for (const user of [owner, moderator, admin]) {
    expect((await call('get', `/${tribe.id}/requests`, user)).status).toBe(200);
    expect((await call('get', `/${tribe.id}`, user)).body.tribe.canManageRequests).toBe(true);
  }
  expect((await call('post', `/${tribe.id}/requests/${outsider.id}/approve`, moderator)).status).toBe(200);
  expect((await call('get', `/${tribe.id}`, outsider)).body.tribe.canViewContent).toBe(true);
});

test('approving a legacy pending request for an existing active administrator preserves that role', async () => {
  const tribe = await seed({ privacy: 'private' }, { members: [
    { user: owner._id, role: 'admin', status: 'active' }, { user: outsider._id, role: 'admin', status: 'active' }
  ] });
  expect((await call('post', `/${tribe.id}/requests/${outsider.id}/approve`, owner)).status).toBe(200);
  const saved = await Tribe.findById(tribe.id);
  expect(saved.members.find(m => String(m.user) === outsider.id).role).toBe('admin');
  expect(saved.joinRequests[0].status).toBe('approved');
});

test('a banned member cannot erase the ban by leaving/rejoining, including public interaction', async () => {
  const tribe = await seed({}, { members: [{ user: owner._id, role: 'admin', status: 'active' },
    { user: outsider._id, role: 'moderator', status: 'banned' }] });
  for (const path of ['/leave', '/join', `/posts/${tribe.posts[0].id}/like`]) {
    expect((await call('post', `/${tribe.id}${path}`, outsider)).status).toBe(403);
  }
  expect((await Tribe.findById(tribe.id)).members.find(m => String(m.user) === outsider.id).status).toBe('banned');
});

test('inactive memberships follow approval again and never recover their former moderator role', async () => {
  const tribe = await seed({ privacy: 'private' }, { joinRequests: [], members: [
    { user: owner._id, role: 'admin', status: 'active' }, { user: outsider._id, role: 'moderator', status: 'inactive' }
  ] });
  const join = await call('post', `/${tribe.id}/join`, outsider).send({ message: 'Solicito ingresar nuevamente' });
  expect(join.body).toMatchObject({ status: 'pending', isMember: false, hasPendingRequest: true });
  await call('post', `/${tribe.id}/requests/${outsider.id}/approve`, owner);
  expect((await Tribe.findById(tribe.id)).members.find(m => String(m.user) === outsider.id)).toMatchObject({ role: 'member', status: 'active' });
});

test('request, reject, reapply, approve and cancel are repeatable without duplicate membership/history', async () => {
  const tribe = await seed({ privacy: 'private' }, { joinRequests: [] });
  const joining = await Promise.all(Array.from({ length: 4 }, () => call('post', `/${tribe.id}/join`, outsider).send({ message: 'Hola comunidad' })));
  expect(joining.every(r => r.status === 200 && r.body.status === 'pending')).toBe(true);
  expect((await Tribe.findById(tribe.id)).joinRequests).toHaveLength(1);
  for (let i = 0; i < 2; i++) expect((await call('post', `/${tribe.id}/requests/${outsider.id}/reject`, owner)).body.status).toBe('rejected');
  expect((await call('get', `/${tribe.id}`, outsider)).body.tribe.joinRequestStatus).toBe('rejected');
  await call('post', `/${tribe.id}/join`, outsider).send({ message: 'Una nueva presentación' });
  let saved = await Tribe.findById(tribe.id);
  expect(saved.joinRequests).toHaveLength(1);
  expect(saved.joinRequests[0].reviewedAt).toBeUndefined();
  for (let i = 0; i < 2; i++) expect((await call('post', `/${tribe.id}/requests/${outsider.id}/approve`, owner)).status).toBe(200);
  saved = await Tribe.findById(tribe.id);
  expect(saved.members.filter(m => String(m.user) === outsider.id)).toHaveLength(1);
  expect(saved.joinRequests[0].status).toBe('approved');
  for (let i = 0; i < 2; i++) expect((await call('delete', `/${tribe.id}/join-request`, outsider)).status).toBe(200);
  expect((await Tribe.findById(tribe.id)).joinRequests[0].status).toBe('approved');
  const newUser = applicants[0];
  await call('post', `/${tribe.id}/join`, newUser);
  for (let i = 0; i < 2; i++) expect((await call('delete', `/${tribe.id}/join-request`, newUser)).status).toBe(200);
  expect((await call('post', `/${tribe.id}/requests/${newUser.id}/approve`, owner)).status).toBe(404);
});

test('concurrent distinct applications and approvals preserve all applicants and unrelated content', async () => {
  const tribe = await seed({ privacy: 'private' }, { joinRequests: [] });
  const requests = await Promise.all(applicants.map(user => call('post', `/${tribe.id}/join`, user).send({ message: user.username })));
  expect(requests.map(r => r.status)).toEqual([200, 200, 200, 200]);
  expect((await Tribe.findById(tribe.id)).joinRequests).toHaveLength(4);
  const approvals = await Promise.all(applicants.map(user => call('post', `/${tribe.id}/requests/${user.id}/approve`, owner)));
  expect(approvals.map(r => r.status)).toEqual([200, 200, 200, 200]);
  const saved = await Tribe.findById(tribe.id);
  expect(saved.members).toHaveLength(6);
  expect(new Set(saved.members.map(m => String(m.user))).size).toBe(6);
  expect(saved.joinRequests.every(r => r.status === 'approved')).toBe(true);
  expect(saved.posts[0].content).toBe('Contenido del muro reservado');
  expect((await call('get', `/${tribe.id}/requests`, owner)).body.requests).toEqual([]);
});

test('competing approve/cancel never creates a member while leaving a pending request', async () => {
  const tribe = await seed({ privacy: 'private' });
  const results = await Promise.all([call('post', `/${tribe.id}/requests/${outsider.id}/approve`, owner), call('delete', `/${tribe.id}/join-request`, outsider)]);
  expect(results[1].status).toBe(200);
  expect([200, 404]).toContain(results[0].status);
  const saved = await Tribe.findById(tribe.id);
  expect(saved.joinRequests.filter(r => r.status === 'pending')).toHaveLength(0);
  expect(saved.members.filter(m => String(m.user) === outsider.id)).toHaveLength(results[0].status === 200 ? 1 : 0);
});

test('private, draft, age-restricted and secret-location events cannot leak through tribe detail', async () => {
  const tribe = await seed();
  const createEvent = extra => Event.create({ title: 'Evento asociado', description: 'Evento aislado para control de acceso', category: 'music',
    date: new Date(Date.now() + 3600000), createdBy: owner._id, status: 'published',
    location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Lugar reservado' }, ...extra });
  const events = await Promise.all([createEvent({}), createEvent({ isPrivate: true }), createEvent({ status: 'draft' }),
    createEvent({ isSecretLocation: true }), createEvent({ ageRestriction: { minAge: 99 } })]);
  // A creator's events are not an association. Only explicit legacy references
  // may populate this summary; creating a linking feature is outside this fix.
  expect((await call('get', `/${tribe.id}`, member)).body.tribe.events).toEqual([]);
  await Tribe.collection.updateOne({ _id: tribe._id }, { $set: { events: events.map(event => event._id) } });
  const detail = await call('get', `/${tribe.id}`, member);
  expect(detail.body.tribe.events.map(e => e._id)).toEqual([events[0].id]);
  expect((await call('get', `/${tribe.id}`, outsider)).body.tribe.events).toEqual([]);
});

test('invalid IDs and oversized/non-text presentations return 400, without membership writes', async () => {
  const tribe = await seed({ privacy: 'private' }, { joinRequests: [] });
  expect((await call('post', '/invalid/join', outsider)).status).toBe(400);
  for (const message of ['x'.repeat(501), { bad: 'input' }]) {
    expect((await call('post', `/${tribe.id}/join`, outsider).send({ message })).status).toBe(400);
  }
  expect((await Tribe.findById(tribe.id)).joinRequests).toHaveLength(0);
});

test('requests scope filters before pagination/count and never reveals unrelated or invite-only queues', async () => {
  // Newer unrelated entries fill the ordinary discovery page.
  const own = await seed({ privacy: 'private' }, { createdAt: new Date('2020-01-01'), name: 'Solicitud propia antigua' });
  const managed = await seed({ privacy: 'secret', membership: 'invite_only' }, { name: 'Cola moderable antigua', createdAt: new Date('2020-01-02'),
    members: [{ user: owner._id, role: 'admin', status: 'active' }, { user: outsider._id, role: 'moderator', status: 'active' }],
    joinRequests: [{ user: applicants[0]._id, status: 'pending' }] });
  await seed({ privacy: 'private' }, { name: 'Cola de otra persona', joinRequests: [{ user: applicants[0]._id, status: 'pending' }] });
  await seed({ privacy: 'public', membership: 'invite_only' }, { name: 'Invitación externa antigua' });
  await seed({ privacy: 'secret', membership: 'invite_only' }, { name: 'Secreta externa antigua' });
  await seed({ privacy: 'private' }, { name: 'Moderador inactivo', members: [{ user: outsider._id, role: 'moderator', status: 'inactive' }],
    joinRequests: [{ user: applicants[0]._id, status: 'pending' }] });
  expect((await call('get', '/?scope=requests')).status).toBe(401);
  expect((await call('get', '/?scope=invalid', outsider)).status).toBe(400);
  const first = await call('get', '/?scope=requests&limit=1', outsider);
  expect(first.status).toBe(200);
  expect(first.body.pagination).toMatchObject({ total: 2, pages: 2, limit: 1, page: 1 });
  const second = await call('get', '/?scope=requests&limit=1&page=2', outsider);
  expect(new Set([...first.body.tribes, ...second.body.tribes].map(t => t._id))).toEqual(new Set([own.id, managed.id]));
  const ownCard = second.body.tribes.find(t => t._id === own.id);
  expect(ownCard).toMatchObject({ hasPendingRequest: true, canManageRequests: false, pendingRequestsCount: 0 });
  expect(first.body.tribes[0]).toMatchObject({ canManageRequests: true, pendingRequestsCount: 1 });
});
