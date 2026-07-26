import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { authService } from '@/lib/api/services'
import type { User } from '@/types/models'

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = authService.getAuthToken()
      const savedUser = authService.getUser()

      if (token && savedUser) {
        setUser(savedUser)

        // Try to refresh user data from backend
        try {
          const freshUser = await authService.getCurrentUser()
          setUser(freshUser)
        } catch (error) {
          console.error('Failed to refresh user:', error)
          // Keep using saved user data
        }
      }
    }

    checkAuth()
  }, [])

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  const refreshUser = async () => {
    try {
      const freshUser = await authService.getCurrentUser()
      setUser(freshUser)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      throw error
    }
  }

  const value = {
    user,
    setUser,
    isAuthenticated: user !== null,
    logout,
    refreshUser,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}