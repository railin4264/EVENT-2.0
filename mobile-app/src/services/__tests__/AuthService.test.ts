import authService, { TwoFactorChallengeError } from '../AuthService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient', () => ({ apiClient: { post: jest.fn(), get: jest.fn() }, refreshAccessToken: jest.fn() }));
jest.mock('@/constants', () => ({ STORAGE_KEYS: { REFRESH_TOKEN: 'refreshToken' } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));

const post = apiClient.post as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); authService.clearAuthToken(); });

test('a second-factor challenge never authenticates the user', async () => {
  post.mockResolvedValue({ data: { success: true, requiresTwoFactor: true, tempToken: 'challenge' } });
  await expect(authService.login({ email: 'test@example.com', password: 'password' })).rejects.toBeInstanceOf(TwoFactorChallengeError);
  expect(authService.getAuthToken()).toBeNull();
});

test('malformed verification codes are rejected before sending a request', async () => {
  await expect(authService.verifyTwoFactor('challenge', '123')).rejects.toThrow('6 dígitos');
  expect(post).not.toHaveBeenCalled();
});

test('a verified challenge uses canonical access and refresh tokens', async () => {
  post.mockResolvedValue({ data: { success: true, accessToken: 'access', refreshToken: 'refresh', user: { id: 'user' } } });
  const response = await authService.verifyTwoFactor('challenge', '123456');
  expect(post).toHaveBeenCalledWith('/auth/verify-2fa', { tempToken: 'challenge', code: '123456' });
  expect(response.data).toMatchObject({ token: 'access', refreshToken: 'refresh' });
  expect(authService.getAuthToken()).toBe('access');
});

test('an invalid code leaves the user unauthenticated', async () => {
  post.mockRejectedValue({ response: { data: { message: 'Invalid TOTP token' } } });
  await expect(authService.verifyTwoFactor('challenge', '000000')).rejects.toThrow('Código incorrecto');
  expect(authService.getAuthToken()).toBeNull();
});

test('incomplete token responses cannot create a session', async () => {
  post.mockResolvedValue({ data: { success: true, accessToken: 'access', user: { id: 'user' } } });
  await expect(authService.verifyTwoFactor('challenge', '123456')).rejects.toThrow();
  expect(authService.getAuthToken()).toBeNull();
});
