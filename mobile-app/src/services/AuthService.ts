import axios, { AxiosResponse } from 'axios';
import { User, LoginForm, RegisterForm, ApiResponse } from '@/types';
import { API_BASE_URL } from '@/constants';

class AuthService {
  private static instance: AuthService;
  private authToken: string | null = null;

  private constructor() {
    this.setupInterceptors();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${this.authToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearAuthToken();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public setAuthToken(token: string) {
    this.authToken = token;
  }

  public clearAuthToken() {
    this.authToken = null;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public async login(credentials: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
        await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      
      if (response.data.success && response.data.data) {
        this.setAuthToken(response.data.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
    }
  }

  public async register(userData: RegisterForm): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
        await axios.post(`${API_BASE_URL}/auth/register`, userData);
      
      if (response.data.success && response.data.data) {
        this.setAuthToken(response.data.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al registrar usuario');
    }
  }

  public async getCurrentUser(): Promise<User> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = 
        await axios.get(`${API_BASE_URL}/auth/me`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Error al obtener usuario actual');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuario actual');
    }
  }

  public async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = 
        await axios.put(`${API_BASE_URL}/users/profile`, userData);
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar perfil');
    }
  }

  public async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ token: string }>> = 
        await axios.post(`${API_BASE_URL}/auth/refresh`);
      
      if (response.data.success && response.data.data) {
        this.setAuthToken(response.data.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al renovar token');
    }
  }

  public async logout(): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      // Even if logout fails on server, clear local token
      console.warn('Logout request failed:', error);
    } finally {
      this.clearAuthToken();
    }
  }

  public async forgotPassword(email: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> = 
        await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al enviar email de recuperación');
    }
  }

  public async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> = 
        await axios.post(`${API_BASE_URL}/auth/reset-password`, { 
          token, 
          password: newPassword 
        });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al restablecer contraseña');
    }
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> = 
        await axios.put(`${API_BASE_URL}/auth/change-password`, {
          currentPassword,
          newPassword
        });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cambiar contraseña');
    }
  }

  public async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> = 
        await axios.post(`${API_BASE_URL}/auth/verify-email`, { token });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al verificar email');
    }
  }

  public async resendVerificationEmail(): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> = 
        await axios.post(`${API_BASE_URL}/auth/resend-verification`);
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reenviar email de verificación');
    }
  }
}

export const authService = AuthService.getInstance();
export default authService;


























