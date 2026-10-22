import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import DiscoveryScreen from '../main/DiscoveryScreen';
import { eventService } from '../../services';
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../services', () => ({ eventService: { getEvents: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const event = { _id: 'event-a', title: 'Taller de cerámica', date: '2026-11-10T18:00:00Z', status: 'published', price: { amount: 500, currency: 'DOP' }, location: { address: 'Dirección privada' }, isSecretLocation: true };
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); (eventService.getEvents as jest.Mock).mockResolvedValue({ success: true, data: [event] }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
function screenText() { return root.root.findAllByType(Text).map(node => React.Children.toArray(node.props.children).filter(value => typeof value === 'string' || typeof value === 'number').join('')).join(' '); }
async function mount() { await act(async () => { root = TestRenderer.create(<DiscoveryScreen />); }); }
async function press(label: string) { const button = root.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(text => text.props.children === label)); expect(button).toBeTruthy(); await act(async () => button!.props.onPress()); }
test('public discovery protects secret addresses and shows the actual currency amount', async () => {
  await mount();
  const content = screenText();
  expect(content).toContain('Ubicación reservada'); expect(content).not.toContain('Dirección privada'); expect(content).toContain('500'); expect(content).not.toContain('$1K');
  const card = root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === `Ver evento ${event.title}`);
  await act(async () => card!.props.onPress()); expect(mockPush).toHaveBeenCalledWith('/event/event-a');
});
test('a failed catalog can be retried instead of being presented as an empty result', async () => {
  (eventService.getEvents as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await mount(); expect(screenText()).toContain('No pudimos cargar');
  await press('Reintentar'); expect(screenText()).toContain(event.title);
});
test('a late category response cannot replace the current category', async () => {
  let release: (_value: unknown) => void = () => {};
  (eventService.getEvents as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await mount(); await press('Música');
  expect(eventService.getEvents).toHaveBeenLastCalledWith({ limit: 30, category: 'music' });
  await act(async () => release({ success: true, data: [{ ...event, title: 'Stale event' }] }));
  expect(screenText()).not.toContain('Stale event'); expect(screenText()).toContain(event.title);
});
