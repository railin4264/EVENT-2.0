import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { NotificationsProvider, useNotifications } from '../NotificationsContext';
let mockAuth = { user: { _id: 'owner-a' }, token: 'token-a' };
const mockFetch = jest.fn(), mockCount = jest.fn();
jest.mock('../AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../services/notificationsService', () => ({ notificationsService: { getNotifications: (...args: unknown[]) => mockFetch(...args), getUnreadCount: (...args: unknown[]) => mockCount(...args) } }));
jest.mock('../../services/socketService', () => ({ socketService: { connect: jest.fn(), disconnect: jest.fn(), leaveNotificationRoom: jest.fn(), updateUserPresence: jest.fn() } }));
let snapshot: ReturnType<typeof useNotifications>;
function Probe() { snapshot = useNotifications(); return null; }
test('an old accounts late notification response cannot populate the current session', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  let finish!: (value: unknown) => void;
  mockFetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ success: true, notifications: [{ _id: 'b-note', title: 'B' }] });
  mockCount.mockResolvedValue({ success: true, count: 0 });
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<NotificationsProvider><Probe /></NotificationsProvider>); });
  mockAuth = { user: { _id: 'owner-b' }, token: 'token-b' };
  await act(async () => tree.update(<NotificationsProvider><Probe /></NotificationsProvider>));
  await act(async () => finish({ success: true, notifications: [{ _id: 'a-private', title: 'Private A' }] }));
  expect(snapshot!.notifications.map(item => item._id)).toEqual(['b-note']);
  await act(async () => tree.unmount());
});
