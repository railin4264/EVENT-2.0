import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { usePrivacyPreferences } from '../usePrivacyPreferences';
import { apiClient } from '../../services/apiClient';
let mockUser: { id: string } | null = { id: 'account-a' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn(), put: jest.fn() } }));
const get = apiClient.get as jest.Mock, put = apiClient.put as jest.Mock;
let current: ReturnType<typeof usePrivacyPreferences>, root: TestRenderer.ReactTestRenderer;
const Harness = () => { current = usePrivacyPreferences(); return null; };
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); mockUser = { id: 'account-a' };
  get.mockResolvedValue({ data: { success: true, settings: { privacy: { showProfile: true, showAttendedEvents: true, showLocation: false } } } }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
test('privacy persists a single field on the settings endpoint without requesting GPS', async () => {
  await act(async () => { root = TestRenderer.create(<Harness />); });
  put.mockResolvedValue({ data: { success: true, settings: { privacy: { showProfile: true, showAttendedEvents: true, showLocation: true } } } });
  await act(async () => { await current.save('showLocation', true); });
  expect(put).toHaveBeenCalledWith('/users/me/settings', { privacy: { showLocation: true } });
  expect(current.values.showLocation).toBe(true);
});
test('failed privacy writes restore the original visibility and expose the error', async () => {
  await act(async () => { root = TestRenderer.create(<Harness />); });
  put.mockRejectedValue(new Error('Sin conexión'));
  await act(async () => { await current.save('showProfile', false); });
  expect(current.values.showProfile).toBe(true); expect(current.error).toBe('Sin conexión');
});
test('changing accounts clears visibility and ignores a late response', async () => {
  let finish!: (value: unknown) => void; get.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => { root = TestRenderer.create(<Harness />); });
  mockUser = null;
  await act(async () => { root.update(<Harness />); finish({ data: { success: true, settings: { privacy: { showLocation: true } } } }); });
  expect(current.ready).toBe(false); expect(current.values.showLocation).toBe(false);
  await act(async () => { await current.save('showLocation', true); });
  expect(put).not.toHaveBeenCalled();
});
