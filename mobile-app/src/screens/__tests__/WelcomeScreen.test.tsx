import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import WelcomeScreen from '../../../app/(auth)/welcome';
import { eventAuthReturn, isPublicEventRoute } from '../../utils/eventAuthReturn';

const mockPush = jest.fn(), mockReplace = jest.fn();
let mockAuthenticated = false;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: mockAuthenticated }) }));
jest.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: true }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockPush.mockClear(); mockReplace.mockClear(); mockAuthenticated = false;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); });
async function mount() { await act(async () => { root = TestRenderer.create(<WelcomeScreen />); }); }
function press(label: string) {
  const button = root.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(text => text.props.children === label));
  expect(button).toBeTruthy();
  return act(async () => { button!.props.onPress(); });
}

test('exploration opens public discovery rather than registration', async () => {
  await mount(); await press('Explorar eventos');
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)/discover');
  expect(mockPush).not.toHaveBeenCalled();
  expect(isPublicEventRoute(['(tabs)', 'discover'])).toBe(true);
});
test('account creation remains separate and counters are not fabricated', async () => {
  await mount(); await press('Crear una cuenta');
  expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  const text = JSON.stringify(root.toJSON());
  expect(text).not.toContain('10,000'); expect(text).not.toContain('15K+'); expect(text).not.toContain('500+');
});
test('private actions preserve their exact destination through login', async () => {
  await mount(); await press('Crear evento');
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(auth)/login', params: { returnTo: '/create-event' } });
  await press('Encontrar mi tribu');
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(auth)/login', params: { returnTo: '/tribes/discover' } });
  expect(eventAuthReturn('/create-event')).toBe('/create-event');
  expect(eventAuthReturn('/tribes/discover')).toBe('/tribes/discover');
  expect(eventAuthReturn('https://evil.example')).toBe('/(tabs)');
});
test('signed-in creators reach their tools directly', async () => {
  mockAuthenticated = true;
  await mount(); await press('Crear evento');
  expect(mockPush).toHaveBeenCalledWith('/create-event');
});
test('legal documents are available before registration', async () => {
  await mount(); await press('Términos'); expect(mockPush).toHaveBeenLastCalledWith('/legal/terms');
  await press('Privacidad'); expect(mockPush).toHaveBeenLastCalledWith('/legal/privacy');
  expect(isPublicEventRoute(['legal', '[document]'])).toBe(true);
  expect(isPublicEventRoute(['create-event'])).toBe(false);
});
