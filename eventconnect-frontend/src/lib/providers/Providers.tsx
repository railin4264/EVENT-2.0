'use client'

import QueryProvider from './QueryProvider'
import { SocketProvider } from './SocketProvider'
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider'
import { ThemeProvider } from 'next-themes'
import { useAuth } from '@/hooks/useAuth'

interface ProvidersProps {
  children: React.ReactNode
}

function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  return (
    <AnalyticsProvider 
      userId={user?.id} 
      userProperties={user ? {
        email: user.email,
        name: user.name,
        role: user.role,
        signupDate: user.createdAt
      } : undefined}
    >
      {children}
    </AnalyticsProvider>
  )
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryProvider>
        <SocketProvider>
          <AnalyticsWrapper>
            {children}
          </AnalyticsWrapper>
        </SocketProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}