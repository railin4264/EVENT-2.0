import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useOrganizerReliability } from '../useOrganizerReliability';
import { apiClient } from '../../services/apiClient';
let mockUser: { id: string } | null = { id: 'account-a' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn(), put: jest.fn() } }));
const get = apiClient.get as jest.Mock, put = apiClient.put as jest.Mock;
const stats = { scheduled: 2, cancelled: 0, markedCompleted: 1, withCheckIns: 1, cancellationRate: 0, reviews: { count: 1, average: 4 }, methodology: 'Prueba' };
let current: ReturnType<typeof useOrganizerReliability>, root: TestRenderer.ReactTestRenderer;
const Harness = ({ isPublic = true }: { isPublic?: boolean }) => { current = useOrganizerReliability('host', 'event', isPublic); return null; };
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); mockUser = { id: 'account-a' }; get.mockImplementation(async (path: string) => ({ data: { success: true, data: path.endsWith('/review') ? { eligible: true, review: null, reason: null } : stats } })); put.mockResolvedValue({ data: { success: true } }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
test('private events do not fetch reputation or own attendance', async () => {
  await act(async () => { root = TestRenderer.create(<Harness isPublic={false} />); });
  expect(get).not.toHaveBeenCalled(); expect(current.stats).toBeNull();
});
test('guest can read aggregated stats but cannot write reviews', async () => {
  mockUser = null; await act(async () => { root = TestRenderer.create(<Harness />); });
  expect(current.stats?.withCheckIns).toBe(1); expect(get).toHaveBeenCalledTimes(1);
  await act(async () => { await current.save(5, ''); }); expect(put).not.toHaveBeenCalled();
});
test('eligible explicit save persists one review and reports API failures', async () => {
  await act(async () => { root = TestRenderer.create(<Harness />); });
  put.mockRejectedValueOnce(new Error('Sin conexión'));
  await act(async () => { await current.save(4, 'Organización'); });
  expect(current.saved).toBe(false); expect(current.error).toBe('Sin conexión');
  await act(async () => { await current.save(4, 'Organización'); });
  expect(current.saved).toBe(true); expect(put).toHaveBeenCalledWith('/organizer-reputation/events/event/review', { rating: 4, comment: 'Organización' });
});
test('late responses cannot restore a previous accounts review', async () => {
  let finish!: (value: unknown) => void;
  get.mockImplementationOnce(async () => ({ data: { success: true, data: stats } })).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => { root = TestRenderer.create(<Harness />); });
  mockUser = null;
  await act(async () => { root.update(<Harness />); finish({ data: { success: true, data: { eligible: true, review: { rating: 5, comment: 'Privado' } } } }); });
  expect(current.own).toBeNull(); await act(async () => { await current.save(4, ''); }); expect(put).not.toHaveBeenCalled();
});
