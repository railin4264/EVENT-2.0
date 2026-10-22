import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useNotificationPreferences } from '../useNotificationPreferences';
import { apiClient } from '../../services/apiClient';
let mockUser = { id: 'account-a' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn(), put: jest.fn() } }));
const get = apiClient.get as jest.Mock;
const put = apiClient.put as jest.Mock;
let current: ReturnType<typeof useNotificationPreferences>;
let root: TestRenderer.ReactTestRenderer;
const Harness = () => { current = useNotificationPreferences(); return null; };
const deferred = <T,>() => { let resolve!: (_value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const response = (notifications = {}) => ({ data: { success: true, settings: { notifications } } });
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  mockUser = { id: 'account-a' };
  get.mockResolvedValue(response());
});
afterEach(async () => { if (root) await act(async () => root.unmount()); });

test('all opt-ins remain false and disabled until server settings load', async () => {
  const request = deferred<any>();
  get.mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<Harness />); });
  expect(current.ready).toBe(false);
  expect(current.values).toEqual({ push: false, email: false, friendPlans: false, shareAttendance: false });
  await act(async () => { await current.save('friendPlans', true); });
  expect(put).not.toHaveBeenCalled();
  await act(async () => { request.resolve(response({ email: true })); });
  expect(current.ready).toBe(true);
  expect(current.values.email).toBe(true);
  expect(current.values.friendPlans).toBe(false);
});

test('sends only the changed consent field and prevents duplicate saves', async () => {
  get.mockResolvedValue(response({ email: true }));
  const request = deferred<any>();
  put.mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<Harness />); });
  let pending!: Promise<void>;
  await act(async () => { pending = current.save('friendPlans', true); await current.save('shareAttendance', true); });
  expect(put).toHaveBeenCalledTimes(1);
  expect(put).toHaveBeenCalledWith('/users/me/notifications', { friendPlans: true });
  await act(async () => { request.resolve({ data: { success: true, notifications: { email: true, friendPlans: true } } }); await pending; });
  expect(current.values).toMatchObject({ email: true, friendPlans: true, shareAttendance: false, push: false });
});

test('failed writes roll back consent and preserve other preferences', async () => {
  get.mockResolvedValue(response({ email: true }));
  put.mockRejectedValue({ response: { data: { message: 'No se guardó' } } });
  await act(async () => { root = TestRenderer.create(<Harness />); });
  await act(async () => { await current.save('shareAttendance', true); });
  expect(current.values.shareAttendance).toBe(false);
  expect(current.values.email).toBe(true);
  expect(current.error).toBe('No se guardó');
  expect(current.saving).toBe(false);
});

test('old account settings cannot replace another account or enable its opt-ins', async () => {
  const request = deferred<any>();
  get.mockReturnValueOnce(request.promise).mockResolvedValue(response());
  await act(async () => { root = TestRenderer.create(<Harness />); });
  mockUser = { id: 'account-b' };
  await act(async () => { root.update(<Harness />); });
  await act(async () => { request.resolve(response({ friendPlans: true, shareAttendance: true })); });
  expect(current.values.friendPlans).toBe(false);
  expect(current.values.shareAttendance).toBe(false);
});

test('old saves and handlers cannot write or update a newly signed-in account', async () => {
  const request = deferred<any>();
  put.mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<Harness />); });
  const oldSave = current.save;
  let pending!: Promise<void>;
  await act(async () => { pending = current.save('shareAttendance', true); });
  mockUser = { id: 'account-b' };
  await act(async () => { root.update(<Harness />); });
  await act(async () => { await oldSave('friendPlans', true); request.resolve({ data: { success: true, notifications: { shareAttendance: true } } }); await pending; });
  expect(put).toHaveBeenCalledTimes(1);
  expect(current.values.shareAttendance).toBe(false);
});
