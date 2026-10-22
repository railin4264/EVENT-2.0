jest.mock('../../contexts/ThemeContext', () => { const actual = jest.requireActual('../../contexts/ThemeContext'); return { ...actual, useTheme: () => ({ theme: actual.darkTheme }) }; });
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import PartnersScreen from '../PartnersScreen';
import { apiClient } from '../../services/apiClient';
let mockOwner = 'sponsor1';
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mockOwner }, isAuthenticated: true }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
const get = apiClient.get as jest.Mock, post = apiClient.post as jest.Mock;
let root: TestRenderer.ReactTestRenderer;
const need = { _id: 'need1', title: 'Buscamos sonido', description: 'Equipo para el coro', kind: 'in_kind', status: 'open', canManage: false, proposals: [], resource: { title: 'El coro', audience: 3, audienceLabel: 'inscripciones confirmadas' } };
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); mockOwner = 'sponsor1';
  get.mockImplementation((path: string) => Promise.resolve({ data: { success: true, data: path.endsWith('/needs') ? [need] : path.endsWith('/mine') ? { needs: [], spaces: [] } : path.endsWith('/targets') ? [{ _id: 'event1', title: 'Mi evento', type: 'event' }] : [] } }));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); });
const create = async () => { await act(async () => { root = TestRenderer.create(<PartnersScreen />); }); };
const input = (label: string) => root.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === label)!;
const button = (label: string) => root.root.findAllByType(TouchableOpacity).find(n => n.findAllByType(Text).some(t => t.props.children === label))!;
test('templates fill the native draft without publishing any request', async () => {
  await create();
  await act(async () => { button('Hidratación para el encuentro').props.onPress(); });
  expect(input('Título de convocatoria').props.value).toBe('Hidratación para el encuentro');
  expect(input('Qué necesitas y qué ofreces').props.value).toContain('Coordinar cantidades');
  expect(post).not.toHaveBeenCalled();
});
test('proposal failure stays an error and never claims the proposal was sent', async () => {
  post.mockRejectedValue({ response: { data: { message: 'La convocatoria se cerró.' } } });
  await create(); await act(async () => input('Tu propuesta').props.onChangeText('Aportamos el equipo'));
  await act(async () => button('Enviar propuesta').props.onPress());
  expect(post).toHaveBeenCalledWith('/partners/needs/need1/proposals', { note: 'Aportamos el equipo' });
  expect(JSON.stringify(root.toJSON())).toContain('La convocatoria se cerró.');
  expect(JSON.stringify(root.toJSON())).not.toContain('Propuesta enviada.');
});
test('a completed request from a previous account cannot populate the next account', async () => {
  let finish!: (value: unknown) => void;
  post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await create(); await act(async () => input('Tu propuesta').props.onChangeText('Aportamos el equipo'));
  await act(async () => button('Enviar propuesta').props.onPress());
  mockOwner = 'account2'; await act(async () => root.update(<PartnersScreen />));
  await act(async () => { finish({ data: { success: true } }); });
  expect(JSON.stringify(root.toJSON())).not.toContain('Propuesta enviada.');
  expect(input('Tu propuesta').props.value).toBe('');
});
