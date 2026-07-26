'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { analytics } from '@/lib/analytics/tracker'

interface AnalyticsContextType {
  track: (...args: any[]) => void
  trackPageView: (...args: any[]) => void
  trackClick: (...args: any[]) => void
  trackEvent: (...args: any[]) => void
  trackForm: (...args: any[]) => void
  trackSearch: (...args: any[]) => void
  trackError: (...args: any[]) => void
  trackEventInteraction: (...args: any[]) => void
  trackSocialInteraction: (...args: any[]) => void
  trackFeatureUsage: (...args: any[]) => void
  setUserId: (...args: any[]) => void
  setUserProperties: (...args: any[]) => void
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

interface AnalyticsProviderProps {
  children: ReactNode
  userId?: string
  userProperties?: Record<string, any>
}

export function AnalyticsProvider({
  children,
  userId,
  userProperties
}: AnalyticsProviderProps) {
  const router = useRouter()
  const noOp = () => {}

  useEffect(() => {
    // Only run on client side
    if (!analytics) return

    // Set user data if provided
    if (userId) {
      analytics.setUserId(userId)
    }

    if (userProperties) {
      analytics.setUserProperties(userProperties)
    }

    // Track initial page view
    analytics.trackPageView()

    // Track page changes
    const handleRouteChange = () => {
      analytics?.trackPageView()
    }

    // Listen for route changes (simplified - would need proper Next.js router integration)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange)

      return () => {
        window.removeEventListener('popstate', handleRouteChange)
      }
    }
  }, [userId, userProperties])

  const contextValue: AnalyticsContextType = analytics ? {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackClick: analytics.trackClick.bind(analytics),
    trackEvent: analytics.trackEvent.bind(analytics),
    trackForm: analytics.trackForm.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackEventInteraction: analytics.trackEventInteraction.bind(analytics),
    trackSocialInteraction: analytics.trackSocialInteraction.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    setUserId: analytics.setUserId.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics)
  } : {
    track: noOp,
    trackPageView: noOp,
    trackClick: noOp,
    trackEvent: noOp,
    trackForm: noOp,
    trackSearch: noOp,
    trackError: noOp,
    trackEventInteraction: noOp,
    trackSocialInteraction: noOp,
    trackFeatureUsage: noOp,
    setUserId: noOp,
    setUserProperties: noOp
  }

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

// HOC for automatic click tracking
export function withClickTracking<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  trackingProps?: {
    elementName?: string
    category?: string
    customProperties?: Record<string, any>
  }
) {
  return function WrappedComponent(props: T) {
    const { trackClick } = useAnalytics()

    const handleClick = (event: React.MouseEvent) => {
      const elementName = trackingProps?.elementName || Component.displayName || 'Unknown'
      const properties = {
        category: trackingProps?.category || 'UI',
        ...trackingProps?.customProperties,
        target: (event.target as HTMLElement)?.tagName?.toLowerCase(),
        position: {
          x: event.clientX,
          y: event.clientY
        }
      }

      trackClick(elementName, properties)

      // Call original onClick if it exists
      if (props.onClick) {
        props.onClick(event)
      }
    }

    return <Component {...props} onClick={handleClick} />
  }
}

// Hook for form tracking
export function useFormTracking(formName: string) {
  const { trackForm } = useAnalytics()

  return {
    onSubmit: (values?: Record<string, any>) => {
      trackForm(formName, 'submit', { values })
    },
    onError: (errors?: Record<string, any>) => {
      trackForm(formName, 'error', { errors })
    },
    onAbandon: () => {
      trackForm(formName, 'abandon')
    }
  }
}