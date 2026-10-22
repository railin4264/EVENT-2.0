import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, TouchableOpacity } from 'react-native';
import HomeScreen from '../main/HomeScreen';
import { eventService } from '../../services';

const mockPush = jest.fn();
const mockLocate = jest.fn();
let mockNearby: { status: string; events: unknown[]; coordinates: null; message: string };
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../../contexts/NotificationsContext', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
jest.mock('../../hooks/useNearbyEvents', () => ({ useNearbyEvents: () => ({ ...mockNearby, locate: mockLocate }) }));
jest.mock('../../services', () => ({ eventService: { getEvents: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: 'MapView', Marker: 'MapMarker' }));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  AppState.currentState = 'active';
  mockNearby = { status: 'idle', events: [], coordinates: null, message: '' };
  (eventService.getEvents as jest.Mock).mockResolvedValue({ success: true, data: [] });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); });
async function mount() { await act(async () => { root = TestRenderer.create(<HomeScreen />); }); }

test('a guest home renders without a native map, offers explicit location and keeps all planning tools', async () => {
  await mount();
  const content = JSON.stringify(root.toJSON());
  for (const label of ['Usar mi ubicación', 'Con amigos', 'Yo voy si', 'Mi itinerario', 'Marcas y espacios']) expect(content).toContain(label);
  expect(mockLocate).not.toHaveBeenCalled();
  expect(root.root.findAllByType('MapView' as any)).toHaveLength(0);
  expect(content).not.toContain('Neon Electronic Festival');
});
test('a catalog failure stays visible and offers retry instead of silently inventing events', async () => {
  (eventService.getEvents as jest.Mock).mockRejectedValue(new Error('offline'));
  await mount();
  expect(JSON.stringify(root.toJSON())).toContain('No pudimos actualizar los eventos');
});
test('guest notifications lead to sign-in rather than private screens', async () => {
  await mount();
  const button = root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Iniciar sesión para ver notificaciones');
  expect(button).toBeTruthy();
  await act(async () => button!.props.onPress());
  expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
});
