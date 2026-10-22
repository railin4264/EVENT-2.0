import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import PasswordRecoveryScreen from '../PasswordRecoveryScreen';
import { authService } from '../../services/AuthService';
let mockToken: string | undefined;
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => false }), useLocalSearchParams: () => ({ token: mockToken }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../services/AuthService', () => ({ authService: { forgotPassword: jest.fn(), resetPassword: jest.fn() } }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); mockToken = undefined; (authService.forgotPassword as jest.Mock).mockResolvedValue({ success: true }); (authService.resetPassword as jest.Mock).mockResolvedValue({ success: true }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
function text() { return root.root.findAllByType(Text).map(node => React.Children.toArray(node.props.children).filter(value => typeof value === 'string').join('')).join(' '); }
async function field(label: string, value: string) { await act(async () => root.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!.props.onChangeText(value)); }
async function press(label: string) { await act(async () => root.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(child => child.props.children === label))!.props.onPress()); }
test('recovery calls the real service and uses the same account-neutral confirmation', async () => {
  await act(async () => { root = TestRenderer.create(<PasswordRecoveryScreen />); });
  await field('Correo electrónico', '  Person@Example.com  '); await press('Enviar enlace');
  expect(authService.forgotPassword).toHaveBeenCalledWith('person@example.com'); expect(text()).toContain('Si existe una cuenta');
});
test('server failure never claims that an email was sent', async () => {
  (authService.forgotPassword as jest.Mock).mockResolvedValue({ success: false });
  await act(async () => { root = TestRenderer.create(<PasswordRecoveryScreen />); });
  await field('Correo electrónico', 'person@example.com'); await press('Enviar enlace');
  expect(text()).toContain('No pudimos procesar'); expect(text()).not.toContain('Si existe una cuenta');
});
test('invalid reset links cannot submit a password', async () => {
  mockToken = 'invalid'; await act(async () => { root = TestRenderer.create(<PasswordRecoveryScreen reset />); });
  expect(root.root.findAllByType(TextInput)).toHaveLength(0); expect(authService.resetPassword).not.toHaveBeenCalled();
});
test('reset validates matching passwords and sends a valid token to the backend', async () => {
  mockToken = 'a'.repeat(64); await act(async () => { root = TestRenderer.create(<PasswordRecoveryScreen reset />); });
  await field('Nueva contraseña', 'NewPass9!'); await field('Repite tu contraseña', 'Different9!'); await press('Guardar contraseña');
  expect(authService.resetPassword).not.toHaveBeenCalled();
  await field('Repite tu contraseña', 'NewPass9!'); await press('Guardar contraseña');
  expect(authService.resetPassword).toHaveBeenCalledWith(mockToken, 'NewPass9!'); expect(text()).toContain('Contraseña actualizada');
});
