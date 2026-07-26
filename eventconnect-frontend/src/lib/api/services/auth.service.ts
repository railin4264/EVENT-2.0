// ============================================================
// AUTH SERVICE
// Handles all authentication-related API calls
// ============================================================

import { apiClient } from '../client'
import { API_ENDPOINTS, API_CONFIG } from '@/lib/config'
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  ApiResponse,
} from '@/types/models'

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    )

    // Store token and user data
    if (response.data.success && response.data.token) {
      this.setAuthToken(response.data.token)
      this.setUser(response.data.user)
    }

    return response.data
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    )

    // Store token and user data
    if (response.data.success && response.data.token) {
      this.setAuthToken(response.data.token)
      this.setUser(response.data.user)
    }

    return response.data
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local storage
      this.clearAuth()
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.AUTH.ME
    )

    if (response.data.success && response.data.data) {
      this.setUser(response.data.data)
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to get current user')
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refreshToken } as RefreshTokenRequest
    )

    if (response.data.success && response.data.token) {
      this.setAuthToken(response.data.token)
    }

    return response.data
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email } as ForgotPasswordRequest
    )

    return response.data
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      { token, newPassword } as ResetPasswordRequest
    )

    return response.data
  }

  // ============================================================
  // LOCAL STORAGE HELPERS
  // ============================================================

  /**
   * Set auth token in localStorage
   */
  setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token)
    }
  }

  /**
   * Get auth token from localStorage
   */
  getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN)
    }
    return null
  }

  /**
   * Set refresh token in localStorage
   */
  setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, token)
    }
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN)
    }
    return null
  }

  /**
   * Set user data in localStorage
   */
  setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user))
    }
  }

  /**
   * Get user data from localStorage
   */
  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER)
      return userData ? JSON.parse(userData) : null
    }
    return null
  }

  /**
   * Clear all auth data from localStorage
   */
  clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN)
      localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN)
      localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER)
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

// Export singleton instance
export const authService = new AuthService()
