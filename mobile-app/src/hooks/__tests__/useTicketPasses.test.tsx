import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useTicketPasses } from '../useTicketPasses';
import { ticketService } from '../../services/TicketService';
let mockUser: { id: string } | null = { id: 'alice' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/TicketService', () => ({ ticketService: { getOwnedPasses: jest.fn() } }));
let current: ReturnType<typeof useTicketPasses>, root: TestRenderer.ReactTestRenderer;
const Harness = () => { current = useTicketPasses(); return null; };
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); mockUser = { id: 'alice' }; });
afterEach(async () => { if (root) await act(async () => root.unmount()); });

test('a late response from a different account cannot reveal its QR', async () => {
  let finish!: (value: unknown) => void;
  (ticketService.getOwnedPasses as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ tickets: [{ id: 'bob-ticket' }], offline: false, savedAt: 1 });
  await act(async () => { root = TestRenderer.create(<Harness />); });
  const aliceGuard = (ticketService.getOwnedPasses as jest.Mock).mock.calls[0][1];
  mockUser = { id: 'bob' };
  await act(async () => { root.update(<Harness />); });
  expect(aliceGuard()).toBe(false);
  await act(async () => { finish({ tickets: [{ id: 'alice-secret' }], offline: true, savedAt: 1 }); });
  expect(current.tickets).toEqual([{ id: 'bob-ticket' }]);
});

test('logout removes all visible tickets and cannot request saved passes anonymously', async () => {
  (ticketService.getOwnedPasses as jest.Mock).mockResolvedValue({ tickets: [{ id: 'alice-secret' }], offline: true, savedAt: 1 });
  await act(async () => { root = TestRenderer.create(<Harness />); });
  expect(current.tickets).toHaveLength(1);
  mockUser = null;
  await act(async () => { root.update(<Harness />); });
  expect(current.tickets).toEqual([]);
  expect(ticketService.getOwnedPasses).toHaveBeenCalledTimes(1);
});
