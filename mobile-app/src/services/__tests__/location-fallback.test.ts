import * as Location from 'expo-location';
import { locationService } from '../locationService';
import { apiClient } from '../apiClient';
jest.mock('expo-location', () => ({ Accuracy: { Balanced: 3 }, requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn() }));
jest.mock('../apiClient', () => ({ apiClient: { put: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(async () => 'test-token') } }));
beforeEach(() => jest.clearAllMocks());
test('denied GPS never writes a default city as the real profile location', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
  expect((await locationService.getCurrentLocation()).isFallback).toBe(true);
  expect(apiClient.put).not.toHaveBeenCalled();
});
test('failed GPS also keeps the fallback off the server', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('GPS unavailable'));
  expect((await locationService.getCurrentLocation()).isFallback).toBe(true);
  expect(apiClient.put).not.toHaveBeenCalled();
});
