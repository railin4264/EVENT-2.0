'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import { SiteSections } from './SiteSections'
import { MobileNav } from './MobileNav'
import { MobileHeader } from './MobileHeader'
import { useConsoleErrorReporter } from '@/hooks/useConsoleErrorReporter'
import { ApiStatusBanner } from '@/components/redesign/ui/api-status-indicator'
import { InstallBanner } from '@/components/pwa/InstallBanner'
import AppUpdateNotice from '@/components/pwa/AppUpdateNotice'
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

  let shouldReportErrors = process.env.NODE_ENV === 'production'
  try {
    shouldReportErrors ||= typeof window !== 'undefined' && !!window.localStorage.getItem('debug-mode')
  } catch { /* Storage can be unavailable in private or restricted browsers. */ }

  useConsoleErrorReporter(shouldReportErrors)

  const noNavPages = ['/login', '/register', '/onboarding', '/', '/forgot-password', '/reset-password']
  const shouldShowNav = !noNavPages.includes(pathname)

  return (
    <>
      {/* Desktop top navbar */}
      {shouldShowNav && <Navbar />}

      {/* Mobile sticky header — visible only on mobile via md:hidden inside component */}
      {shouldShowNav && <MobileHeader />}
      {shouldShowNav && <SiteSections className="flex justify-center border-b border-border bg-background px-3 py-1 md:hidden" />}

      <ApiStatusBanner />
      <InstallBanner />
      <AppUpdateNotice />

      {/* pb-[72px] on mobile: 60px nav + 12px breathing room. Desktop: 0 */}
      <main id="main-content" tabIndex={-1} className={shouldShowNav ? 'pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0' : 'min-h-dvh'}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      {shouldShowNav && <MobileNav />}

      {process.env.NODE_ENV === 'development' && shouldReportErrors && <DebugPanel />}
    </>
  )
}
