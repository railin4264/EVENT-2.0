import { User, LoginForm, RegisterForm, ApiResponse } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { apiClient, refreshAccessToken } from './apiClient';

export type AuthData = { user: User; token: string; refreshToken: string };

export class TwoFactorChallengeError extends Error {
  constructor(public readonly tempToken: string) {
    super('Introduce el código de tu aplicación de autenticación.');
    this.name = 'TwoFactorChallengeError';
  }
}

class AuthService {
  private authToken: string | null = null;
  public setAuthToken(token: string) { this.authToken = token; }
  public clearAuthToken() { this.authToken = null; }
  public getAuthToken() { return this.authToken; }
  private async authenticate(path: string, credentials: LoginForm | RegisterForm): Promise<ApiResponse<AuthData>> {
    try {
      const { data } = await apiClient.post(path, credentials);
      if (data.requiresTwoFactor || data.requires2FA || data.data?.requires2FA) {
        const tempToken = data.tempToken || data.data?.tempToken;
        if (!tempToken) throw new Error('No se pudo iniciar la verificación. Inténtalo nuevamente.');
        throw new TwoFactorChallengeError(tempToken);
      }
      return this.normalizeSession(data);
    } catch (error: any) {
      if (error instanceof TwoFactorChallengeError) throw error;
      throw new Error(error.response?.data?.message || error.message || 'No se pudo iniciar la sesión');
    }
  }
  private normalizeSession(data: any): ApiResponse<AuthData> {
    const payload = data.data || data;
    const token = payload.token || payload.accessToken;
    if (!data.success || !payload.user || !token || !payload.refreshToken) throw new Error(data.message || 'No se pudo iniciar la sesión');
    this.setAuthToken(token);
    return { ...data, data: { user: payload.user, token, refreshToken: payload.refreshToken } };
  }
  public async verifyTwoFactor(tempToken: string, code: string): Promise<ApiResponse<AuthData>> {
    if (!/^\d{6}$/.test(code)) throw new Error('Introduce un código de 6 dígitos.');
    try {
      const { data } = await apiClient.post('/auth/verify-2fa', { tempToken, code });
      return this.normalizeSession(data);
    } catch (error: any) {
      const message = error.response?.data?.message;
      if (message === 'Invalid TOTP token') throw new Error('Código incorrecto. Usa el código actual de tu aplicación.');
      if (message === 'Invalid or expired setup token') throw new Error('La verificación venció. Vuelve a iniciar sesión.');
      throw new Error(message || error.message || 'No se pudo verificar el código.');
    }
  }
  public login(credentials: LoginForm) { return this.authenticate('/auth/login', credentials); }
  public register(data: RegisterForm) { return this.authenticate('/auth/register', data); }
  public async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return data.data?.user || data.data || data.user;
  }
  public async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    const { data } = await apiClient.put('/users/profile', userData);
    return { ...data, data: data.data || data.user };
  }
  public async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const token = await refreshAccessToken();
    this.setAuthToken(token);
    return { success: true, data: { token } };
  }
  public async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      await apiClient.post('/auth/logout', { refreshToken });
    } finally { this.clearAuthToken(); }
  }
  public async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return (await apiClient.post('/auth/forgot-password', { email })).data;
  }
  public async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return (await apiClient.post('/auth/reset-password', { token, password: newPassword })).data;
  }
  public async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return (await apiClient.post('/auth/change-password', { currentPassword, newPassword })).data;
  }
  public async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return (await apiClient.get(`/auth/verify-email/${encodeURIComponent(token)}`)).data;
  }
  public async resendVerificationEmail(): Promise<ApiResponse<void>> {
    const user = await this.getCurrentUser();
    return (await apiClient.post('/auth/send-verification', { email: user.email })).data;
  }
}
export const authService = new AuthService();
export default authService;
