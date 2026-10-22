const { getTribeAccess } = require('../src/utils/tribeAccess');

test('a missing populated user never gives a guest the deleted member permissions', () => {
  const tribe = { creator: null, settings: { privacy: 'private', membership: 'approval_required' },
    members: [{ user: null, role: 'admin', status: 'active' }], joinRequests: [{ user: null, status: 'pending' }] };
  expect(getTribeAccess(tribe, undefined)).toMatchObject({ isMember: false, isAdmin: false,
    canManageRequests: false, canViewContent: false, hasPendingRequest: false, joinRequestStatus: 'none' });
});

test('a ban wins over a duplicate active legacy membership, except for explicit creator/platform exceptions', () => {
  const tribe = { creator: 'creator', settings: { privacy: 'secret' }, members: [
    { user: 'member', status: 'active', role: 'admin' }, { user: 'member', status: 'banned', role: 'member' }
  ] };
  expect(getTribeAccess(tribe, 'member')).toMatchObject({ isBanned: true, isMember: false, canManageRequests: false, canDiscover: false });
  expect(getTribeAccess(tribe, 'creator')).toMatchObject({ isMember: true, canManageRequests: true, canDiscover: true });
  expect(getTribeAccess(tribe, 'member', 'admin')).toMatchObject({ isBanned: false, isMember: true, canManageRequests: true });
});
