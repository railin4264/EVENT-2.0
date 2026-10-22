import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import AccountToolsScreen from '../AccountToolsScreen';
import { apiClient } from '../../services/apiClient';
let mockKind = 'support';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ kind: mockKind }), useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'account-a', email: 'demo@example.test' } }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { post: jest.fn() } }));
const post = apiClient.post as jest.Mock;
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); mockKind = 'support'; post.mockResolvedValue({ data: { success: true, data: { ticketNumber: 'TEST-001' } } }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
const create = async () => { await act(async () => { root = TestRenderer.create(<AccountToolsScreen />); }); };
const send = () => root.root.findAllByType(TouchableOpacity).find(button => button.props.onPress && button.props.disabled !== undefined)!;
test('support creates a real ticket only after explicit input and submit', async () => {
  await create(); expect(post).not.toHaveBeenCalled();
  await act(async () => { root.root.findAllByType(TextInput)[0].props.onChangeText('Un botón falla'); root.root.findAllByType(TextInput)[1].props.onChangeText('Descripción de prueba del problema.'); });
  await act(async () => { await send().props.onPress(); });
  expect(post).toHaveBeenCalledWith('/support/tickets', { subject: 'Un botón falla', message: 'Descripción de prueba del problema.', category: 'technical' });
  expect(JSON.stringify(root.toJSON())).toContain('TEST-001');
});
test('support failures remain errors and do not claim a submitted ticket', async () => {
  post.mockRejectedValue(new Error('Sin conexión')); await create();
  await act(async () => { root.root.findAllByType(TextInput)[0].props.onChangeText('Problema'); root.root.findAllByType(TextInput)[1].props.onChangeText('Descripción'); });
  await act(async () => { await send().props.onPress(); });
  expect(JSON.stringify(root.toJSON())).toContain('Sin conexión');
  expect(JSON.stringify(root.toJSON())).not.toContain('Solicitud registrada');
});
test('password instructions are requested explicitly without changing credentials or claiming delivery', async () => {
  mockKind = 'password'; await create(); expect(post).not.toHaveBeenCalled();
  await act(async () => { await send().props.onPress(); });
  expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'demo@example.test' });
  expect(JSON.stringify(root.toJSON())).toContain('No se ha cambiado tu contraseña');
});
