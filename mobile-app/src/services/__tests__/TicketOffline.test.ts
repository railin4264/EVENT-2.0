import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { clearTicketPasses, minimalTicketPass, readTicketPasses, saveTicketPasses } from '../../utils/ticketPassStore';
import ticketService from '../TicketService';
import { apiClient } from '../apiClient';
import type { Ticket } from '../../types';

jest.mock('../apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));
const store = new Map<string, string>();
const id = 'a'.repeat(24) + ':' + 'b'.repeat(24);
const ticket = { id, _id: id, status: 'valid', validUntil: new Date(Date.now() + 86400000).toISOString(), qrCode: 'EC:' + id + ':' + 'c'.repeat(64), event: { _id: 'a'.repeat(24), title: 'Coro', date: new Date().toISOString(), attendees: [{ user: { email: 'secret@example.test' } }], location: { address: 'Private location' } }, price: 0, currency: 'DOP', user: { email: 'private@example.test' } } as unknown as Ticket;
beforeEach(() => {
  jest.clearAllMocks(); store.clear();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async key => store.get(key) || null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key, value) => { store.set(key, value); });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async key => { store.delete(key); });
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async key => store.get(key) || null);
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key, value) => { store.set(key, value); });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async key => { store.delete(key); });
});

test('stores a minimal signed pass securely and isolates accounts', async () => {
  await saveTicketPasses('alice', [{ ...ticket, quantity: 4 } as Ticket]);
  const cached = await readTicketPasses('alice');
  expect(cached.tickets).toHaveLength(1);
  expect(cached.tickets[0].event.attendees).toBeUndefined();
  expect(cached.tickets[0].event.location).toBeUndefined();
  expect(cached.tickets[0].user).toBeUndefined();
  expect(cached.tickets[0].data.quantity).toBe(4);
  expect((await readTicketPasses('bob')).tickets).toEqual([]);
  expect(JSON.stringify((AsyncStorage.setItem as jest.Mock).mock.calls)).not.toContain('EC:');
});

test('expired, cancelled, unsigned, and mismatched ticket codes cannot become passes', () => {
  for (const change of [{ status: 'cancelled' }, { status: 'used' }, { qrCode: id }, { qrCode: 'EC:DEMO' }, { validUntil: 'not-a-date' }, { validUntil: new Date(0).toISOString() }, { _id: 'd'.repeat(24) + ':' + 'e'.repeat(24) }]) {
    expect(minimalTicketPass({ ...ticket, ...change } as Ticket)).toBeNull();
  }
});

test('old snapshots and future timestamps cannot resurrect admissions', async () => {
  await saveTicketPasses('alice', [ticket]);
  const passKey = [...store.keys()].find(key => !key.endsWith('.index'))!;
  const entry = JSON.parse(store.get(passKey)!);
  for (const savedAt of [Date.now() - 8 * 86400000, Date.now() + 86400000]) {
    store.set(passKey, JSON.stringify({ ...entry, savedAt }));
    expect((await readTicketPasses('alice')).tickets).toEqual([]);
  }
});

test('logout deletion affects only the selected account', async () => {
  await saveTicketPasses('alice', [ticket]); await saveTicketPasses('bob', [ticket]);
  await clearTicketPasses('alice');
  expect((await readTicketPasses('alice')).tickets).toEqual([]);
  expect((await readTicketPasses('bob')).tickets).toHaveLength(1);
});

test('offline fallback requires a network failure; authorization failure purges the saved pass', async () => {
  await saveTicketPasses('alice', [ticket]);
  (apiClient.get as jest.Mock).mockRejectedValueOnce({ code: 'ERR_NETWORK' });
  await expect(ticketService.getOwnedPasses('alice')).resolves.toMatchObject({ offline: true, tickets: [expect.objectContaining({ id })] });
  (apiClient.get as jest.Mock).mockRejectedValueOnce({ response: { status: 403, data: { message: 'Denied' } } });
  await expect(ticketService.getOwnedPasses('alice')).rejects.toThrow('Denied');
  expect((await readTicketPasses('alice')).tickets).toEqual([]);
});

test('a changed session cannot save an in-flight server response', async () => {
  let active = true;
  (apiClient.get as jest.Mock).mockImplementation(async () => { active = false; return { data: { success: true, data: [ticket] } }; });
  await ticketService.getOwnedPasses('alice', () => active);
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});

test('logout during a secure storage write removes the late QR too', async () => {
  let started!: () => void, finish!: () => void;
  const writing = new Promise<void>(resolve => { started = resolve; });
  const release = new Promise<void>(resolve => { finish = resolve; });
  (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(async (key, value) => {
    started(); await release; store.set(key, value);
  });
  const saving = saveTicketPasses('alice', [ticket]);
  await writing;
  await clearTicketPasses('alice');
  finish(); await saving;
  expect([...store.values()].some(value => value.includes('EC:'))).toBe(false);
  expect((await readTicketPasses('alice')).tickets).toEqual([]);
});
