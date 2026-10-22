import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, AppState, Text, TouchableOpacity } from 'react-native';
import QRScannerScreen from '../QRScannerScreen';
import eventService from '../../services/EventService';
import ticketService from '../../services/TicketService';
let mockUser = { id: 'owner' };
let mockParams: { eventId?: string } = { eventId: 'a'.repeat(24) };
let mockPermission = { granted: false, canAskAgain: true };
const mockRequest = jest.fn();
const mockClose = jest.fn();
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, useRouter: () => ({ canGoBack: () => true, back: mockClose, replace: mockClose }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('expo-camera', () => ({ CameraView: 'TestCamera', useCameraPermissions: () => [mockPermission, mockRequest] }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(() => Promise.resolve()), NotificationFeedbackType: { Success: 'success', Error: 'error' } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'TestIcon' }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: {} }) }));
jest.mock('../../services/EventService', () => ({ __esModule: true, default: { getEventById: jest.fn() } }));
jest.mock('../../services/TicketService', () => {
  const actual = jest.requireActual('../../services/TicketService');
  return { __esModule: true, ...actual, default: { validateByQR: jest.fn() } };
});
let root: TestRenderer.ReactTestRenderer;
const deferred = <T,>() => { let resolve!: (_value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const code = `${'a'.repeat(24)}:${'b'.repeat(24)}`;
const camera = () => root.root.findByType('TestCamera' as any);
const start = async () => { const button = root.root.findAllByType(TouchableOpacity).find(item => item.findAllByType(Text).some(text => text.props.children === 'Activar cámara')); await act(async () => { await button!.props.onPress(); }); };
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockUser = { id: 'owner' };
  mockParams = { eventId: 'a'.repeat(24) };
  mockPermission = { granted: false, canAskAgain: true };
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  (eventService.getEventById as jest.Mock).mockResolvedValue({ _id: mockParams.eventId, title: 'My event', createdBy: 'owner', status: 'published' });
  mockRequest.mockResolvedValue({ granted: true });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); jest.restoreAllMocks(); });

test('does not mount or request camera permission before explicit activation', async () => {
  await act(async () => { root = TestRenderer.create(<QRScannerScreen />); });
  expect(mockRequest).not.toHaveBeenCalled();
  expect(root.root.findAllByType('TestCamera' as any)).toHaveLength(0);
  mockPermission = { granted: true, canAskAgain: true };
  await start();
  expect(camera()).toBeTruthy();
});

test('external users and unscoped scanner routes cannot activate the camera', async () => {
  mockUser = { id: 'outsider' };
  await act(async () => { root = TestRenderer.create(<QRScannerScreen />); });
  expect(root.root.findAllByType('TestCamera' as any)).toHaveLength(0);
  expect(mockRequest).not.toHaveBeenCalled();
  mockParams = {};
  await act(async () => { root.update(<QRScannerScreen />); });
  expect(root.root.findAllByType('TestCamera' as any)).toHaveLength(0);
});

test('locks same-frame QR callbacks and sends the selected event once', async () => {
  mockPermission = { granted: true, canAskAgain: true };
  const request = deferred<any>();
  (ticketService.validateByQR as jest.Mock).mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<QRScannerScreen />); });
  await start();
  const scan = camera().props.onBarcodeScanned;
  let first!: Promise<void>;
  await act(async () => { first = scan({ type: 'qr', data: code }); await scan({ type: 'qr', data: code }); });
  expect(ticketService.validateByQR).toHaveBeenCalledTimes(1);
  expect(ticketService.validateByQR).toHaveBeenCalledWith(code, mockParams.eventId);
  await act(async () => { request.resolve({ valid: true, message: 'Registrada' }); await first; });
  expect(Alert.alert).toHaveBeenCalledWith('Entrada registrada', expect.any(String), expect.any(Array), { cancelable: false });
});

test('unknown QR URLs never hit the admission API', async () => {
  mockPermission = { granted: true, canAskAgain: true };
  await act(async () => { root = TestRenderer.create(<QRScannerScreen />); });
  await start();
  await act(async () => { await camera().props.onBarcodeScanned({ type: 'qr', data: 'https://example.com' }); });
  expect(ticketService.validateByQR).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Código no compatible', expect.any(String), expect.any(Array), { cancelable: false });
});

test('permission denial leaves a recoverable screen without mounting the camera', async () => {
  mockRequest.mockResolvedValueOnce({ granted: false });
  await act(async () => { root = TestRenderer.create(<QRScannerScreen />); });
  await start();
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(root.root.findAllByType('TestCamera' as any)).toHaveLength(0);
});

test('backgrounding removes the camera and discards a late admission alert', async () => {
  mockPermission = { granted: true, canAskAgain: true };
  const request = deferred<any>();
  (ticketService.validateByQR as jest.Mock).mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<QRScannerScreen />); });
  await start();
  let first!: Promise<void>;
  await act(async () => { first = camera().props.onBarcodeScanned({ type: 'qr', data: code }); });
  const listener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
  await act(async () => { listener('background'); });
  expect(root.root.findAllByType('TestCamera' as any)).toHaveLength(0);
  await act(async () => { request.resolve({ valid: true, message: 'Registrada' }); await first; });
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('late server results cannot show success in a different account', async () => {
  mockPermission = { granted: true, canAskAgain: true };
  const request = deferred<any>();
  (ticketService.validateByQR as jest.Mock).mockReturnValue(request.promise);
  await act(async () => { root = TestRenderer.create(<QRScannerScreen />); });
  await start();
  let first!: Promise<void>;
  await act(async () => { first = camera().props.onBarcodeScanned({ type: 'qr', data: code }); });
  mockUser = { id: 'other' };
  await act(async () => { root.update(<QRScannerScreen />); });
  await act(async () => { request.resolve({ valid: true, message: 'Registrada' }); await first; });
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(root.root.findAllByType('TestCamera' as any)).toHaveLength(0);
});
