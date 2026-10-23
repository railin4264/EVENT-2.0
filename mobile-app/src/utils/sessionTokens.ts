import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

export type SessionTokenKey = typeof STORAGE_KEYS.AUTH_TOKEN | typeof STORAGE_KEYS.REFRESH_TOKEN;

// Session tokens live in the device keychain/keystore, never in plain AsyncStorage.
// The web build has no keychain and keeps browser storage.
const secure = Platform.OS !== 'web';

export async function getSessionToken(key: SessionTokenKey): Promise<string | null> {
  if (!secure) return AsyncStorage.getItem(key);
  const stored = await SecureStore.getItemAsync(key).catch(() => null);
  if (stored) return stored;
  // One-time move of a token saved by an earlier version, so updating does not sign people out.
  const legacy = await AsyncStorage.getItem(key);
  if (legacy) {
    try {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
    } catch { /* Keep the legacy copy readable if the keychain is unavailable. */ }
  }
  return legacy;
}

export async function setSessionTokens(tokens: { accessToken?: string | null; refreshToken?: string | null }): Promise<void> {
  const entries: [SessionTokenKey, string][] = [];
  if (tokens.accessToken) entries.push([STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken]);
  if (tokens.refreshToken) entries.push([STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken]);
  if (!secure) { await AsyncStorage.multiSet(entries); return; }
  for (const [key, value] of entries) await SecureStore.setItemAsync(key, value);
  await AsyncStorage.multiRemove(entries.map(([key]) => key));
}

export async function clearSessionTokens(): Promise<void> {
  const keys: SessionTokenKey[] = [STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN];
  await AsyncStorage.multiRemove(keys);
  if (secure) await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key).catch(() => undefined)));
}
