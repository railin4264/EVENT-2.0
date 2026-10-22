import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '@/constants';

export const apiConfig = { baseURL: API_BASE_URL.replace(/\/api$/, ''), timeout: 30000 };
export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: apiConfig.timeout });
type SessionListener = (token: string | null) => void;
const listeners = new Set<SessionListener>();
let refreshRequest: Promise<string> | null = null;

export function onSessionChange(listener: SessionListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export async function clearSession() {
  await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_DATA]);
  listeners.forEach(listener => listener(null));
}
export function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        await clearSession();
        throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
      }
      try {
        // Refresh uses plain axios, so a rejected refresh cannot refresh itself.
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: apiConfig.timeout });
        const accessToken = data.accessToken || data.data?.accessToken || data.data?.token;
        const nextRefreshToken = data.refreshToken || data.data?.refreshToken;
        if (!accessToken || !nextRefreshToken) throw new Error('Respuesta de sesión inválida');
        await AsyncStorage.multiSet([[STORAGE_KEYS.AUTH_TOKEN, accessToken], [STORAGE_KEYS.REFRESH_TOKEN, nextRefreshToken]]);
        listeners.forEach(listener => listener(accessToken));
        return accessToken as string;
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) await clearSession();
        throw error;
      }
    })().finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}
apiClient.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use(response => response, async error => {
  const request = error.config;
  const publicAuth = /\/auth\/(login|register|refresh|forgot-password|reset-password|verify-2fa|2fa\/verify)/.test(request?.url || '');
  if (error.response?.status === 401 && request && !request._retry && !publicAuth) {
    request._retry = true;
    try {
      request.headers.Authorization = `Bearer ${await refreshAccessToken()}`;
      return apiClient(request);
    } catch (refreshError) { return Promise.reject(refreshError); }
  }
  return Promise.reject(error);
});
export default apiClient;
