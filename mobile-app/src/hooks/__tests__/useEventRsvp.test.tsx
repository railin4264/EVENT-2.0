import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useEventRsvp } from '../useEventRsvp';
import eventService from '../../services/EventService';
import type { Event } from '../../types';
let mockUser: { id: string } | null = { id: 'account-a' };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/EventService', () => ({ __esModule: true, default: { getEventById: jest.fn(), joinEvent: jest.fn(), leaveEvent: jest.fn() } }));
const id = 'a'.repeat(24);
const event = { _id: id, title: 'Public event', attendees: [], status: 'published', date: '2099-01-01' } as unknown as Event;
let current: ReturnType<typeof useEventRsvp>;
let root: TestRenderer.ReactTestRenderer;
const Harness = () => { current = useEventRsvp(id); return null; };
const deferred = <T,>() => { let resolve!: (_value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockUser = { id: 'account-a' };
  jest.resetAllMocks();
  (eventService.getEventById as jest.Mock).mockResolvedValue(event);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); });

test('a guest can read a public event without any RSVP mutation', async () => {
  mockUser = null;
  await act(async () => { root = TestRenderer.create(<Harness />); });
  expect(current.event?.title).toBe('Public event');
  await act(async () => { expect(await current.toggle()).toBe(false); });
  expect(eventService.joinEvent).not.toHaveBeenCalled();
});

test('synchronous double taps send one mutation and use authoritative returned attendance', async () => {
  const request = deferred<any>();
  (eventService.joinEvent as jest.Mock).mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<Harness />); });
  let first!: Promise<boolean>;
  await act(async () => { first = current.toggle(); await current.toggle(); });
  expect(eventService.joinEvent).toHaveBeenCalledTimes(1);
  await act(async () => { request.resolve({ success: true, event: { ...event, attendees: [{ user: 'account-a', status: 'confirmed' }] } }); await first; });
  expect(current.isAttending).toBe(true);
});

test('a rejected RSVP remains unjoined and releases the retry lock', async () => {
  (eventService.joinEvent as jest.Mock).mockResolvedValue({ success: false, message: 'Aforo completo' });
  await act(async () => { root = TestRenderer.create(<Harness />); });
  await act(async () => { await expect(current.toggle()).rejects.toThrow('Aforo completo'); });
  expect(current.isAttending).toBe(false);
  expect(current.actionLoading).toBe(false);
});

test('an old RSVP response never updates another account after logout/login', async () => {
  const request = deferred<any>();
  (eventService.joinEvent as jest.Mock).mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<Harness />); });
  let pending!: Promise<boolean>;
  await act(async () => { pending = current.toggle(); });
  mockUser = { id: 'account-b' };
  await act(async () => { root.update(<Harness />); });
  await act(async () => { request.resolve({ success: true, event: { ...event, isAttending: true } }); expect(await pending).toBe(false); });
  expect(current.isAttending).toBe(false);
});
