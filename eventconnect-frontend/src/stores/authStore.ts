'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'
import { apiCache } from '@/lib/performance/apiCache'
import { useChatStore } from '@/stores/chatStore'
import { useLocaleStore } from './localeStore'
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types/api.types'

function syncUserLocale(user: User | null | undefined) {
  if (!user) return
  const country = user.countryCode || user.country
  if (country) {
    useLocaleStore.getState().setLocaleByCountry(country)
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginCredentials & { tempToken?: string; code?: string }) => Promise<void>
  loginOAuth: (provider: 'google' | 'facebook', code: string, state: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  clearError: () => void
  updateUser: (updates: Partial<User>) => void
  validateToken: () => Promise<boolean>
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials & { tempToken?: string; code?: string }) => {
        try {
          get().logout()
          // CRITICAL: Clear all previous auth state before login to prevent stale token issues
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('auth-token')
            sessionStorage.removeItem('refresh-token')
            sessionStorage.removeItem('auth-storage')
            localStorage.removeItem('auth-token')
            localStorage.removeItem('refresh-token')
            document.cookie = 'auth-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          }

          set({ isLoading: true, error: null, isAuthenticated: false, user: null, token: null })

          const response = await apiClient.post(credentials.tempToken ? '/auth/verify-2fa' : '/auth/login', credentials)
          const rd = response.data
          if (rd.requiresTwoFactor && rd.tempToken) {
            throw Object.assign(new Error('Introduce el código de tu aplicación de autenticación.'), { requiresTwoFactor: true, tempToken: rd.tempToken })
          }

          // Backend returns dual-key: accessToken (canonical) + token (alias)
          // Also enveloped under data: { user, accessToken } for normalized shape
          const user = rd.data?.user ?? rd.user
          const token = rd.data?.accessToken ?? rd.data?.token ?? rd.accessToken ?? rd.token
          const refreshToken = rd.data?.refreshToken ?? rd.refreshToken

          if (!token || !user) throw new Error('Respuesta de login inválida del servidor')

          // Store token in sessionStorage + cookie (for middleware)
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('auth-token', token)
            if (refreshToken) sessionStorage.setItem('refresh-token', refreshToken)
            document.cookie = `auth-token=${token}; path=/; SameSite=Lax`
          }

          set({ user, token, isAuthenticated: true, isLoading: false, error: null })
          syncUserLocale(user)
          syncUserLocale(user)
          syncUserLocale(user)

        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Login failed'
          set({ error: message, isLoading: false, isAuthenticated: false })
          throw error
        }
      },

      loginOAuth: async (provider, code, state) => {
        get().logout()
        set({ isLoading: true, error: null })
        try {
          const { data: rd } = await apiClient.post(`/oauth/${provider}/callback`, { code, state })
          if (rd.requiresTwoFactor && rd.tempToken) {
            throw Object.assign(new Error('Introduce el código de tu aplicación de autenticación.'), { requiresTwoFactor: true, tempToken: rd.tempToken })
          }
          const user = rd.data?.user ?? rd.user
          const token = rd.data?.accessToken ?? rd.data?.token ?? rd.accessToken ?? rd.token
          if (!user || !token) throw new Error('No se pudo completar el inicio de sesión.')
          sessionStorage.setItem('auth-token', token)
          const refreshToken = rd.data?.refreshToken ?? rd.refreshToken
          if (refreshToken) sessionStorage.setItem('refresh-token', refreshToken)
          document.cookie = `auth-token=${token}; path=/; SameSite=Lax`
          set({ user, token, isAuthenticated: true, isLoading: false, error: null })
        } catch (error: any) {
          get().logout()
          set({ isLoading: false, error: error.response?.data?.message || error.message || 'Error al iniciar sesión' })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        try {
          get().logout()
          set({ isLoading: true, error: null })

          const response = await apiClient.post('/auth/register', data)
          const rd = response.data

          // Backend returns dual-key: accessToken (canonical) + token (alias)
          const user = rd.data?.user ?? rd.user
          const token = rd.data?.accessToken ?? rd.data?.token ?? rd.accessToken ?? rd.token
          const refreshToken = rd.data?.refreshToken ?? rd.refreshToken

          if (!token || !user) throw new Error('Respuesta de registro inválida del servidor')

          if (typeof window !== 'undefined') {
            sessionStorage.setItem('auth-token', token)
            if (refreshToken) sessionStorage.setItem('refresh-token', refreshToken)
            document.cookie = `auth-token=${token}; path=/; SameSite=Lax`
          }

          set({ user, token, isAuthenticated: true, isLoading: false, error: null })
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Registration failed'
          set({ error: message, isLoading: false, isAuthenticated: false })
          throw error
        }
      },

      logout: () => {
        apiCache.clear()
        useChatStore.setState({ rooms: [], currentRoom: null, messages: {}, typingUsers: {}, onlineUsers: [], unreadCounts: {}, error: null })
        if (typeof window !== 'undefined') {
          // Clear all auth-related storage
          sessionStorage.removeItem('auth-token')
          sessionStorage.removeItem('refresh-token')
          sessionStorage.removeItem('auth-storage')
          localStorage.removeItem('auth-token')
          localStorage.removeItem('refresh-token')
          localStorage.removeItem('auth-storage')
          // Clear cookies - use multiple methods to ensure complete removal
          document.cookie = 'auth-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          // Clear redirect flag
          sessionStorage.removeItem('auth-redirecting')
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        })
      },


      clearError: () => {
        set({ error: null })
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...updates } })
        }
      },

      validateToken: async () => {
        const { token } = get()

        if (!token) {
          set({ isAuthenticated: false, user: null })
          return false
        }

        try {
          const response = await apiClient.get('/auth/me')
          const rd = response.data

          // Handle both normalized { data: { user } } and legacy { user } shapes
          const user = rd.data?.user ?? rd.user

          if (user) {
            set({ user, isAuthenticated: true })
            syncUserLocale(user)
            return true
          } else {
            throw new Error('Invalid response: no user in /auth/me')
          }
        } catch (error: any) {
          // A temporary outage must not erase a valid saved session.
          if (error.response?.status === 401 || error.response?.status === 403) get().logout()
          return false
        }
      },

      initializeAuth: () => {
        // Esta función se llama al cargar la app para validar el token guardado
        const { token, validateToken } = get()


        if (token) {
          validateToken()
        } else {
          set({ isAuthenticated: false, user: null })

          // CRITICAL: If no token in store, ensure cookies are also cleared
          // This prevents middleware from seeing stale cookies
          if (typeof window !== 'undefined') {
            const cookieHasToken = document.cookie.includes('auth-token=')
            if (cookieHasToken) {
              document.cookie = 'auth-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            }
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
