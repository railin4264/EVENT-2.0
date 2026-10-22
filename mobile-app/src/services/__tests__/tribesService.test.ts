import { tribesService, type Tribe } from '../tribesService';
import { apiClient } from '../apiClient';
import { tribeAccess } from '../../utils/tribeAccess';

jest.mock('../apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
const fixture = (fields: Partial<Tribe> = {}) => ({ _id: 'tribe-1', name: 'Comunidad', members: [], settings: { privacy: 'public', membership: 'open' }, ...fields } as Tribe);
afterEach(() => jest.clearAllMocks());

it('normalizes both detail/list envelopes and request aliases without changing capability flags', async () => {
  const tribe = fixture({ canViewContent: false, canJoin: false, canRequestJoin: true });
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: tribe } });
  expect((await tribesService.getTribe('tribe-1')).tribe).toEqual(tribe);
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: [tribe] } });
  expect((await tribesService.getTribes()).tribes).toEqual([tribe]);
  for (const key of ['requests', 'joinRequests', 'data']) {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { success: true, [key]: [{ user: 'applicant' }] } });
    expect((await tribesService.getJoinRequests('tribe-1')).joinRequests).toEqual([{ user: 'applicant' }]);
  }
});

it('uses the canonical join, cancellation, approval and rejection routes', async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
  (apiClient.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
  await tribesService.joinTribe('tribe-1');
  await tribesService.cancelJoinRequest('tribe-1');
  await tribesService.approveJoinRequest('tribe-1', 'applicant');
  await tribesService.rejectJoinRequest('tribe-1', 'applicant');
  expect(apiClient.post).toHaveBeenCalledWith('/tribes/tribe-1/join', { message: '' });
  expect(apiClient.delete).toHaveBeenCalledWith('/tribes/tribe-1/join-request');
  expect(apiClient.post).toHaveBeenCalledWith('/tribes/tribe-1/requests/applicant/approve');
  expect(apiClient.post).toHaveBeenCalledWith('/tribes/tribe-1/requests/applicant/reject');
});

it('hides private content and allows a request without claiming invitation support', () => {
  const outsider = fixture({ isPrivate: true, settings: { privacy: 'private', membership: 'approval_required' }, canViewContent: false, canRequestJoin: true });
  expect(tribeAccess(outsider, 'outsider')).toMatchObject({ canViewContent: false, canManageRequests: false, action: 'request' });
  const invitation = { ...outsider, canRequestJoin: false, canJoin: false, settings: { privacy: 'private' as const, membership: 'invite_only' as const } };
  expect(tribeAccess(invitation, 'outsider')).toMatchObject({ action: 'invitation', actionLabel: 'Solo por invitación' });
});

it('honors pending, joined, rejected and banned states', () => {
  expect(tribeAccess(fixture({ hasPendingRequest: true }))).toMatchObject({ action: 'cancel', canJoin: false });
  expect(tribeAccess(fixture({ isMember: true }))).toMatchObject({ action: 'leave' });
  expect(tribeAccess(fixture({ joinRequestStatus: 'rejected', canRequestJoin: true, canJoin: false }))).toMatchObject({ action: 'request' });
  expect(tribeAccess(fixture({ isBanned: true, isMember: true, canViewContent: true, canManageRequests: true, userRole: 'admin' }))).toMatchObject({ action: 'blocked', canViewContent: false, canManageRequests: false });
  expect(tribeAccess(fixture({ joinRequestStatus: 'banned' }))).toMatchObject({ action: 'blocked', canViewContent: false, canJoin: false });
});

it('permits active moderators to manage requests but never elevates inactive administrators', () => {
  const moderator = fixture({ isMember: true, userRole: 'moderator', canManageRequests: true,
    members: [{ user: 'me', status: 'active', role: 'moderator', joinedAt: '' }] });
  expect(tribeAccess(moderator, 'me')).toMatchObject({ canManageRequests: true, isAdmin: false });
  const inactive = { ...moderator, userRole: 'admin' as const, isAdmin: true,
    members: [{ user: 'me', status: 'inactive' as const, role: 'admin' as const, joinedAt: '' }] };
  expect(tribeAccess(inactive, 'me')).toMatchObject({ isMember: false, canManageRequests: false, isAdmin: false });
});

it('uses visibility independently from membership approval in a public tribe', () => {
  const tribe = fixture({ settings: { privacy: 'public', membership: 'approval_required' }, canViewContent: true, canRequestJoin: true, canJoin: false });
  expect(tribeAccess(tribe)).toMatchObject({ isPrivate: false, canViewContent: true, action: 'request' });
});
