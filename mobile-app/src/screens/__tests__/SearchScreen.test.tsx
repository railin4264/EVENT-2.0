import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import SearchScreen from '../SearchScreen';
import { apiClient } from '../../services/apiClient';
const mockPush = jest.fn();
let mockAuthenticated = false;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => false }), useLocalSearchParams: () => ({}) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: mockAuthenticated }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const person = { id: 'a'.repeat(24), type: 'user', title: 'Coro Ana', metadata: { isHost: true, role: 'creator', username: 'ana' } };
const tribe = { id: 'b'.repeat(24), type: 'tribe', title: 'Coro musical' };
let root: TestRenderer.ReactTestRenderer;
const payload = (results = [person, tribe]) => ({ success: true, results, pagination: { page: 1, total: results.length, hasMore: false } });
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.useFakeTimers(); jest.clearAllMocks(); mockAuthenticated = false; (apiClient.get as jest.Mock).mockResolvedValue({ data: payload() }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); jest.clearAllTimers(); jest.useRealTimers(); });
async function mount() { await act(async () => { root = TestRenderer.create(<SearchScreen />); }); }
async function query(value: string) { await act(async () => root.root.findByType(TextInput).props.onChangeText(value)); }
async function tick() { await act(async () => { jest.advanceTimersByTime(350); }); }
async function press(label: string) { await act(async () => root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label || node.findAllByType(Text).some(child => child.props.children === label))!.props.onPress()); }
function text() { return root.root.findAllByType(Text).map(node => React.Children.toArray(node.props.children).filter(value => typeof value === 'string').join('')).join(' '); }
test('debounces typed queries and tribe search opens the correct login return target', async () => {
  await mount(); await query('c'); await tick(); expect(apiClient.get).not.toHaveBeenCalled();
  await query('coro'); await tick(); await press('Tribus'); await tick();
  expect(apiClient.get).toHaveBeenLastCalledWith('/search', expect.objectContaining({ params: { q: 'coro', type: 'tribes', page: 1, limit: 12 } }));
  await press('Ver Tribu: Coro musical'); expect(mockPush).toHaveBeenCalledWith({ pathname: '/(auth)/login', params: { returnTo: `/tribe/${tribe.id}` } });
});
test('creator results link to user profiles rather than event pages', async () => {
  mockAuthenticated = true; await mount(); await query('coro'); await tick(); await press('Creadores y anfitriones'); await tick(); await press('Ver Creador: Coro Ana');
  expect(mockPush).toHaveBeenCalledWith(`/user/${person.id}`);
});
test('clearing the query prevents an old response from reappearing', async () => {
  let resolve: (_result: unknown) => void = () => {};
  (apiClient.get as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await mount(); await query('coro'); await tick(); await press('Limpiar búsqueda');
  await act(async () => resolve({ data: payload() }));
  expect(text()).not.toContain('Coro Ana'); expect(text()).toContain('Encuentra un plan');
});
test('connection errors are shown and can be retried', async () => {
  (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await mount(); await query('coro'); await tick(); expect(text()).toContain('No pudimos completar');
  await press('Reintentar'); await tick(); expect(text()).toContain('Coro Ana');
});
