import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../apiClient';
import { analyticsService } from '../AnalyticsService';
jest.mock('../apiClient', () => ({ apiClient: { post: jest.fn().mockResolvedValue({ data: { success: true } }) } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: 'test', extra: {} } } }));
jest.mock('expo-device', () => ({ osName: 'Android', osVersion: 'test', modelName: 'test-device' }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(undefined), removeItem: jest.fn().mockResolvedValue(undefined) }));
test('mobile analytics uses the shared API path and strips private fields before storage and transport', async () => {
  jest.useFakeTimers();
  try {
    analyticsService.enable(); analyticsService.setUserId('owner-a');
    analyticsService.track('page_view', { email: 'private@example.test', coordinates: [18, -69], url: 'https://example.test/reset?token=secret', category: 'music' });
    await jest.advanceTimersByTimeAsync(2000);
    expect(apiClient.post).toHaveBeenCalledWith('/analytics/track', expect.objectContaining({ ownerId: 'owner-a' }));
    const payload = (apiClient.post as jest.Mock).mock.calls[0][1];
    expect(payload.events[0].properties).toMatchObject({ url: '/reset', category: 'music' });
    expect(JSON.stringify(payload)).not.toMatch(/private@example|secret|coordinates/);
    expect(JSON.stringify((AsyncStorage.setItem as jest.Mock).mock.calls)).not.toMatch(/private@example|secret|coordinates/);
    expect(payload.events[0].eventId).toBeTruthy();
  } finally { analyticsService.disable(); jest.useRealTimers(); }
});
