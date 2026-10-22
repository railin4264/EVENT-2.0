import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import LoginScreen from '../../../app/(auth)/login';
import RegisterScreen from '../../../app/(auth)/register';
let mockDark = true;
const mockLogin = jest.fn(), mockRegister = jest.fn();
jest.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: mockDark }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login: mockLogin, register: mockRegister, verifyTwoFactor: jest.fn() }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), canGoBack: () => false }), useLocalSearchParams: () => ({}) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
test.each([true, false])('login renders its credential fields in dark=%s without submitting automatically', async dark => {
  mockDark = dark;
  await act(async () => { root = TestRenderer.create(<LoginScreen />); });
  expect(root.root.findAllByType(TextInput).some(node => node.props.autoComplete === 'email')).toBe(true);
  expect(root.root.findAllByType(TextInput).some(node => node.props.secureTextEntry === true)).toBe(true);
  expect(mockLogin).not.toHaveBeenCalled();
});
test.each([true, false])('registration keeps the first step editable in dark=%s without creating an account', async dark => {
  mockDark = dark;
  await act(async () => { root = TestRenderer.create(<RegisterScreen />); });
  expect(root.root.findAllByType(TextInput).length).toBeGreaterThanOrEqual(3);
  expect(mockRegister).not.toHaveBeenCalled();
});
