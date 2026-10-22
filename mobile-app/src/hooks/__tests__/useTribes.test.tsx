import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useTribe, useTribes } from '../useTribes';
import { tribesService, type Tribe } from '../../services/tribesService';

let mockUser = { id: 'account-a', _id: 'account-a' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/tribesService', () => ({ tribesService: {
  getTribe: jest.fn(), getTribes: jest.fn(), getJoinRequests: jest.fn(), joinTribe: jest.fn(), leaveTribe: jest.fn(),
  cancelJoinRequest: jest.fn(), approveJoinRequest: jest.fn(), rejectJoinRequest: jest.fn(),
} }));
let root: TestRenderer.ReactTestRenderer;
let current: ReturnType<typeof useTribe>;
const member = { _id: 'tribe-1', name: 'Private A', members: [{ user: 'account-a', role: 'member', status: 'active' }],
  isPrivate: true, isMember: true, canViewContent: true, canManageRequests: false } as Tribe;
const outsider = { ...member, name: 'Public summary B', members: [], isMember: false, canViewContent: false, canRequestJoin: true } as Tribe;
const Harness = () => { current = useTribe('tribe-1'); return null; };
const deferred = <T,>() => { let resolve!: (_value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockUser = { id: 'account-a', _id: 'account-a' };
  (tribesService.getTribe as jest.Mock).mockResolvedValue({ success: true, tribe: member });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); jest.resetAllMocks(); });

it('preserves same-account details during refresh and ignores stale responses after an account switch', async () => {
  await act(async () => { root = TestRenderer.create(<Harness />); });
  const old = deferred<any>(); const next = deferred<any>();
  (tribesService.getTribe as jest.Mock).mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  let refresh!: Promise<boolean>;
  act(() => { refresh = current.fetchTribe('tribe-1'); });
  expect(current.tribe?.name).toBe('Private A');
  mockUser = { id: 'account-b', _id: 'account-b' };
  await act(async () => { root.update(<Harness />); });
  expect(current.tribe).toBeNull();
  await act(async () => { old.resolve({ success: true, tribe: member }); await refresh; });
  expect(current.tribe).toBeNull();
  await act(async () => { next.resolve({ success: true, tribe: outsider }); });
  expect(current.tribe?.name).toBe('Public summary B');
  expect(current.tribe?.members).toEqual([]);
});

it('locks duplicate membership mutations until the request and refresh finish', async () => {
  (tribesService.getTribe as jest.Mock).mockResolvedValueOnce({ success: true, tribe: outsider }).mockResolvedValue({ success: true, tribe: member });
  const join = deferred<any>();
  (tribesService.joinTribe as jest.Mock).mockReturnValue(join.promise);
  await act(async () => { root = TestRenderer.create(<Harness />); });
  let first: any; let second: any;
  act(() => { first = current.joinTribe('tribe-1'); second = current.joinTribe('tribe-1'); });
  expect(await second).toMatchObject({ success: false });
  expect(tribesService.joinTribe).toHaveBeenCalledTimes(1);
  await act(async () => { join.resolve({ success: true, status: 'joined', message: 'Listo' }); await first; });
  expect(current.tribe?.isMember).toBe(true);
  expect(current.actionLoading).toBe(false);
});

it('immediately removes private content after leaving even if the refresh fails', async () => {
  await act(async () => { root = TestRenderer.create(<Harness />); });
  (tribesService.leaveTribe as jest.Mock).mockResolvedValue({ success: true, message: 'Saliste' });
  (tribesService.getTribe as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await current.leaveTribe('tribe-1'); });
  expect(current.tribe).toMatchObject({ isMember: false, canViewContent: false, members: [], joinRequests: [] });
});

it('does not refetch the catalogue in a loading-state effect loop', async () => {
  (tribesService.getTribes as jest.Mock).mockResolvedValue({ success: true, tribes: [outsider] });
  const ListHarness = () => { useTribes(); return null; };
  await act(async () => { root = TestRenderer.create(<ListHarness />); });
  await act(async () => { root.update(<ListHarness />); });
  expect(tribesService.getTribes).toHaveBeenCalledTimes(1);
});

it('loads and manages requests for an active moderator using the capability contract', async () => {
  const moderator = { ...member, userRole: 'moderator', canManageRequests: true,
    members: [{ user: 'account-a', status: 'active', role: 'moderator' }] };
  (tribesService.getTribe as jest.Mock).mockResolvedValue({ success: true, tribe: moderator });
  (tribesService.getJoinRequests as jest.Mock).mockResolvedValueOnce({ success: true, joinRequests: [{ user: { _id: 'applicant' }, status: 'pending' }] })
    .mockResolvedValue({ success: true, joinRequests: [] });
  (tribesService.approveJoinRequest as jest.Mock).mockResolvedValue({ success: true, message: 'Aprobado' });
  await act(async () => { root = TestRenderer.create(<Harness />); });
  expect(current.tribe?.joinRequests).toHaveLength(1);
  await act(async () => { await current.approveRequest('applicant'); });
  expect(tribesService.approveJoinRequest).toHaveBeenCalledWith('tribe-1', 'applicant');
  expect(current.tribe?.joinRequests).toEqual([]);
});

it('does not fetch moderation data using an inactive administrator record', async () => {
  (tribesService.getTribe as jest.Mock).mockResolvedValue({ success: true, tribe: { ...member, userRole: 'admin', canManageRequests: true,
    members: [{ user: 'account-a', status: 'inactive', role: 'admin' }] } });
  await act(async () => { root = TestRenderer.create(<Harness />); });
  expect(tribesService.getJoinRequests).not.toHaveBeenCalled();
});
