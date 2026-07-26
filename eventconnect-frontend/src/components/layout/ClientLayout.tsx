'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import { MobileNav } from './MobileNav'
import { MobileHeader } from './MobileHeader'
import { useConsoleErrorReporter } from '@/hooks/useConsoleErrorReporter'
import { ApiStatusBanner } from '@/components/redesign/ui/api-status-indicator'
import { InstallBanner } from '@/components/pwa/InstallBanner'
import { useServiceWorker } from '@/hooks/usePWA'
import dynamic from 'next/dynamic'

// Load dev config in development
if (process.env.NODE_ENV === 'development') {
  import('@/lib/utils/devConfig')
}

// Only load DebugPanel in development
const DebugPanel = dynamic(() => import('@/components/debug/DebugPanel'), {
  ssr: false
})

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname()

  const shouldReportErrors = process.env.NODE_ENV === 'production' ||
                            (typeof window !== 'undefined' && !!localStorage.getItem('debug-mode'))

  useConsoleErrorReporter(shouldReportErrors)
  useServiceWorker()

  const noNavPages = ['/login', '/register', '/', '/forgot-password']
  const shouldShowNav = !noNavPages.includes(pathname)

  return (
    <>
      {/* Desktop top navbar */}
      {shouldShowNav && <Navbar />}

      {/* Mobile sticky header — visible only on mobile via md:hidden inside component */}
      {shouldShowNav && <MobileHeader />}

      <ApiStatusBanner />
      <InstallBanner />

      {/* pb-[72px] on mobile: 60px nav + 12px breathing room. Desktop: 0 */}
      <main className={shouldShowNav ? 'pb-[72px] md:pb-0' : 'min-h-screen'}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      {shouldShowNav && <MobileNav />}

      {process.env.NODE_ENV === 'development' && <DebugPanel />}
    </>
  )
}