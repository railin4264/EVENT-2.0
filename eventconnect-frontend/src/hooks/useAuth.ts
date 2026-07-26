/**
 * useAuth — thin wrapper over authStore.
 * All auth state/actions live in authStore (Zustand). This hook re-exports
 * them for convenience and adds helper methods that need apiClient directly.
 *
 * DO NOT import AuthService here — it has been removed. Use authStore + apiClient.
 */
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    updateUser,
    validateToken,
    initializeAuth,
  } = useAuthStore()

  const forgotPassword = async (email: string) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email })
      return { success: true, message: response.data?.message }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Error al enviar email de recuperación' }
    }
  }

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, password: newPassword })
      return { success: true, message: response.data?.message }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Error al restablecer contraseña' }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await apiClient.put('/auth/change-password', { currentPassword, newPassword })
      return { success: true, message: response.data?.message }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Error al cambiar contraseña' }
    }
  }

  const updateProfile = async (userData: Record<string, any>) => {
    try {
      const response = await apiClient.put('/users/profile', userData)
      const updated = response.data?.data ?? response.data?.user
      if (updated) updateUser(updated)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Error al actualizar perfil' }
    }
  }

  const checkAuthStatus = async () => {
    return await validateToken()
  }

  const refreshToken = async () => {
    try {
      const storedRefresh = typeof window !== 'undefined'
        ? sessionStorage.getItem('refresh-token')
        : null
      if (!storedRefresh) throw new Error('No refresh token')
      const response = await apiClient.post('/auth/refresh', { refreshToken: storedRefresh })
      const newToken = response.data?.accessToken ?? response.data?.token
      if (newToken && typeof window !== 'undefined') {
        sessionStorage.setItem('auth-token', newToken)
        document.cookie = `auth-token=${newToken}; path=/; SameSite=Lax`
      }
    } catch {
      logout()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    updateUser,
    checkAuthStatus,
    initializeAuth,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    refreshToken,
  }
}

export default useAuth