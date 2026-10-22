'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import type { User, RegisterData } from '@/types/api.types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: RegisterData) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Unify with the Zustand authStore so there is a single source of truth.
  // Previously this Context kept its own localStorage['token'] which was never
  // written by the login flow -> components using useAuth() always saw user=null.
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loginStore = useAuthStore((s) => s.login)
  const logoutStore = useAuthStore((s) => s.logout)
  const registerStore = useAuthStore((s) => s.register)

  const login = async (email: string, password: string) => {
    await loginStore({ email, password } as any)
  }

  const register = async (data: RegisterData) => {
    await registerStore(data as any)
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, login, logout: logoutStore, register }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
