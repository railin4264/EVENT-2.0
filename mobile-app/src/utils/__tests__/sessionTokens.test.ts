import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionToken, setSessionTokens, clearSessionTokens } from '../sessionTokens';

const secure = new Map<string, string>(), plain = new Map<string, string>();
beforeEach(() => {
  secure.clear(); plain.clear();
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => secure.get(key) ?? null);
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => { secure.set(key, value); });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => { secure.delete(key); });
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => plain.get(key) ?? null);
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { plain.delete(key); });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => { keys.forEach(key => plain.delete(key)); });
});

it('stores session tokens in the keychain, never in plain storage', async () => {
  await setSessionTokens({ accessToken: 'access', refreshToken: 'refresh' });
  expect(secure.get('auth_token')).toBe('access');
  expect(secure.get('refresh_token')).toBe('refresh');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
});

it('moves a token saved by an earlier version into the keychain without signing out', async () => {
  plain.set('auth_token', 'legacy-access');
  expect(await getSessionToken('auth_token')).toBe('legacy-access');
  expect(secure.get('auth_token')).toBe('legacy-access');
  expect(plain.has('auth_token')).toBe(false);
});

it('clears both stores on sign-out', async () => {
  secure.set('auth_token', 'a'); plain.set('refresh_token', 'b');
  await clearSessionTokens();
  expect(secure.size).toBe(0); expect(plain.size).toBe(0);
});
