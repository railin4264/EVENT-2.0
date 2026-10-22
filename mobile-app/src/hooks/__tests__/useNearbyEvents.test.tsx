import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as Location from 'expo-location';
import { eventService } from '../../services';
import { useNearbyEvents } from '../useNearbyEvents';

jest.mock('expo-location', () => ({ Accuracy: { Balanced: 3 }, requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn() }));
jest.mock('../../services', () => ({ eventService: { getNearbyEvents: jest.fn() } }));
let state: ReturnType<typeof useNearbyEvents>;
function Harness({ owner = 'guest' }: { owner?: string }) { state = useNearbyEvents(owner); return null; }
let root: TestRenderer.ReactTestRenderer;
const permission = Location.requestForegroundPermissionsAsync as jest.Mock;
const position = Location.getCurrentPositionAsync as jest.Mock;
const nearby = eventService.getNearbyEvents as jest.Mock;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  permission.mockResolvedValue({ status: 'granted' });
  position.mockResolvedValue({ coords: { latitude: 18.5, longitude: -69.9 } });
  nearby.mockResolvedValue([]);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); jest.useRealTimers(); });
async function mount(owner = 'guest') { await act(async () => { root = TestRenderer.create(<Harness owner={owner} />); }); }

test('opening the home never requests a location or invents nearby events', async () => {
  await mount();
  expect(permission).not.toHaveBeenCalled(); expect(nearby).not.toHaveBeenCalled();
  expect(state.status).toBe('idle'); expect(state.events).toEqual([]);
});
test('denied permission remains optional and never queries the backend', async () => {
  permission.mockResolvedValue({ status: 'denied' });
  await mount(); await act(async () => { await state.locate(); });
  expect(state.status).toBe('denied'); expect(state.events).toEqual([]); expect(nearby).not.toHaveBeenCalled();
});
test('uses actual coordinates and excludes secret or invalid map locations', async () => {
  const visible = { _id: 'public', location: { coordinates: [-69.9, 18.5] } };
  nearby.mockResolvedValue([visible, { _id: 'secret', isSecretLocation: true, location: { coordinates: [-69.9, 18.5] } }, { _id: 'bad', location: { coordinates: [999, 18.5] } }]);
  await mount(); await act(async () => { await state.locate(); });
  expect(nearby).toHaveBeenCalledWith(18.5, -69.9, 50, 30);
  expect(state.events).toEqual([visible]); expect(state.status).toBe('ready');
});
test('a failed lookup shows an error and a retry can return a genuine empty result', async () => {
  nearby.mockRejectedValueOnce(new Error('network'));
  await mount(); await act(async () => { await state.locate(); });
  expect(state.status).toBe('error'); expect(state.events).toEqual([]);
  await act(async () => { await state.locate(); });
  expect(state.status).toBe('ready'); expect(state.events).toEqual([]);
});
test('account changes invalidate pending GPS results, including a return to the same account', async () => {
  let resolvePosition!: (value: unknown) => void;
  position.mockReturnValueOnce(new Promise(resolve => { resolvePosition = resolve; }));
  await mount('a'); let pending!: Promise<void>;
  await act(async () => { pending = state.locate(); await Promise.resolve(); });
  await act(async () => root.update(<Harness owner="b" />));
  await act(async () => root.update(<Harness owner="a" />));
  await act(async () => { resolvePosition({ coords: { latitude: 1, longitude: 1 } }); await pending; });
  expect(state.status).toBe('idle'); expect(state.coordinates).toBeNull(); expect(nearby).not.toHaveBeenCalled();
});
test('a stalled GPS request times out with a recoverable state', async () => {
  jest.useFakeTimers();
  position.mockReturnValueOnce(new Promise(() => {}));
  await mount(); let pending!: Promise<void>;
  await act(async () => { pending = state.locate(); await Promise.resolve(); });
  await act(async () => { await jest.advanceTimersByTimeAsync(20001); await pending; });
  expect(state.status).toBe('error'); expect(state.message).toContain('GPS');
  expect(nearby).not.toHaveBeenCalled();
});
