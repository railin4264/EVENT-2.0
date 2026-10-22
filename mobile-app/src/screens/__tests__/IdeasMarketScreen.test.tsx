import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import IdeasMarketScreen from '../IdeasMarketScreen';
import { apiClient } from '../../services/apiClient';
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' }, token: 'token' }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
const get = apiClient.get as jest.Mock, put = apiClient.put as jest.Mock, post = apiClient.post as jest.Mock;
let root: TestRenderer.ReactTestRenderer;
const press = (text: string) => root.root.findAllByType(TouchableOpacity).find(b => b.findAllByType(Text).some(t => t.props.children === text))!;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  get.mockImplementation((path: string) => Promise.resolve({ data: { data: path === '/ideas' ? [{ _id: 'idea', title: 'Pintar juntos' }] : path === '/events' ? [] : path.endsWith('/conditions') ? { own: { maxBudget: 500, currency: 'DOP' }, summary: { ready: false } } : { proposals: [], canAccept: true } } }));
  put.mockResolvedValue({ data: { success: true } });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); });
const create = async () => { await act(async () => { root = TestRenderer.create(<IdeasMarketScreen />); }); await act(async () => { press('Pintar juntos').props.onPress(); }); };
test('loads saved conditions without recording attendance or writing automatically', async () => {
  await create(); expect(root.root.findByProps({ accessibilityLabel: 'Presupuesto máximo' }).props.value).toBe('500');
  expect(put).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).toContain('Aún no hay suficientes respuestas');
});
test('saving conditions explicitly sends budget and currency without RSVP', async () => {
  await create();
  await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText('350,50'));
  await act(async () => { press('Guardar mis condiciones').props.onPress(); });
  expect(put).toHaveBeenCalledWith('/ideas/idea/conditions', { maxBudget: 350.5, currency: 'DOP' });
  expect(post).not.toHaveBeenCalled();
});
test('failed withdrawal displays error rather than saved confirmation', async () => {
  put.mockRejectedValue({ response: { data: { message: 'Sin conexión' } } });
  await create(); await act(async () => { press('Eliminar mis respuestas').props.onPress(); });
  expect(JSON.stringify(root.toJSON())).toContain('Sin conexión');
  expect(JSON.stringify(root.toJSON())).not.toContain('Guardado correctamente');
});

test('offers a separate expired archive without saving or enrolling anyone', async () => {
  await create();
  await act(async () => { press('Vencidas').props.onPress(); });
  expect(get).toHaveBeenCalledWith('/ideas', { params: { limit: 50, status: 'expired' } });
  expect(post).not.toHaveBeenCalled();
  expect(put).not.toHaveBeenCalled();
});
