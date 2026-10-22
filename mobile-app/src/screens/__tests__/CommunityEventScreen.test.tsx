jest.mock('../../contexts/ThemeContext', () => { const actual = jest.requireActual('../../contexts/ThemeContext'); return { ...actual, useTheme: () => ({ theme: actual.darkTheme }) }; });
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, Text, TouchableOpacity } from 'react-native';
import CommunityEventScreen from '../CommunityEventScreen';
import { apiClient } from '../../services/apiClient';
jest.setTimeout(15000);
let mockOwner = 'member';
let mockId = 'event-a';
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: mockId }), useRouter: () => ({ back: jest.fn(), push: mockPush }), useFocusEffect: (callback: () => (() => void)) => { require('react').useEffect(callback, [callback]); } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockOwner ? { id: mockOwner } : null }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock('react-native/Libraries/Components/Switch/Switch', () => ({ default: 'Switch' }));
const fixture = (patch = {}) => ({ title: 'Comunidad del evento', canManage: false, canContribute: true, canRepeat: false, canSetMeetup: false, canJoinMeetup: true, roles: [], repeat: { interested: false, interestedCount: 0, days: [], dayCounts: {} }, meetup: null, ...patch });
let root: TestRenderer.ReactTestRenderer;
const get = apiClient.get as jest.Mock, put = apiClient.put as jest.Mock;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() }); mockOwner = 'member'; mockId = 'event-a'; get.mockResolvedValue({ data: { success: true, data: fixture() } }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); jest.useRealTimers(); });
const mount = async () => { await act(async () => { root = TestRenderer.create(<CommunityEventScreen />); }); };
test('opening the community never submits consent or creates a contribution', async () => {
  await mount(); expect(JSON.stringify(root.toJSON())).toContain('Comunidad del evento'); expect(put).not.toHaveBeenCalled(); expect(apiClient.post).not.toHaveBeenCalled();
});
test('guest can sign in and return to the same activity without submitting an action', async () => {
  mockOwner = ''; mockId = 'a'.repeat(24);
  await mount();
  const login = root.root.findAllByType(TouchableOpacity).find(button => button.findAllByType(Text).some(text => text.props.children === 'Entrar y volver a esta actividad'))!;
  await act(async () => { login.props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(auth)/login', params: { returnTo: `/community-event/${mockId}` } });
  expect(put).not.toHaveBeenCalled(); expect(apiClient.post).not.toHaveBeenCalled();
});
test('join failure does not claim participation and does not enable name sharing', async () => {
  get.mockResolvedValue({ data: { success: true, data: fixture({ meetup: { place: 'Parque', time: new Date(Date.now() + 3600000).toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString(), joined: false, names: [], participantCount: 0 } }) } });
  put.mockRejectedValue(new Error('Sin conexión')); await mount();
  const join = root.root.findAllByType(TouchableOpacity).find(button => button.findAllByType(Text).some(text => text.props.children === 'Apuntarme al encuentro'))!;
  await act(async () => { await join.props.onPress(); });
  expect(put).toHaveBeenCalledWith('/community-actions/events/event-a/meetup/join', { joined: true, shareName: false });
  expect(JSON.stringify(root.toJSON())).toContain('Sin conexión'); expect(JSON.stringify(root.toJSON())).not.toContain('Salir del encuentro');
});
test('expiry removes the point and shared names without navigating away', async () => {
  jest.useFakeTimers(); const now = Date.now();
  get.mockResolvedValue({ data: { success: true, data: fixture({ meetup: { place: 'Punto temporal', time: new Date(now - 100).toISOString(), expiresAt: new Date(now + 1000).toISOString(), joined: true, names: ['Nombre temporal'], participantCount: 1 } }) } });
  await mount(); expect(JSON.stringify(root.toJSON())).toContain('Punto temporal');
  await act(async () => jest.advanceTimersByTime(1100));
  expect(JSON.stringify(root.toJSON())).not.toContain('Punto temporal'); expect(JSON.stringify(root.toJSON())).not.toContain('Nombre temporal');
});
