import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import SocialHubScreen from '../SocialHubScreen';
const mockPush = jest.fn();
let mockAuthenticated = false;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: mockAuthenticated }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); mockAuthenticated = false; });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
async function mount() { await act(async () => { root = TestRenderer.create(<SocialHubScreen />); }); }
async function press(label: string) { await act(async () => root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label)!.props.onPress()); }
test('guests can open the map and private tools preserve their login target', async () => {
  await mount(); await press('Mapa de eventos'); expect(mockPush).toHaveBeenLastCalledWith('/map');
  await press('Publicaciones'); expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(auth)/login', params: { returnTo: '/feed' } });
});
test('signed-in users reach the actual social feed', async () => {
  mockAuthenticated = true; await mount(); await press('Publicaciones'); expect(mockPush).toHaveBeenLastCalledWith('/feed');
});
