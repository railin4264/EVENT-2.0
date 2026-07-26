'use client'

import { lazy, Suspense } from 'react'
import LoadingSpinner from '@/components/redesign/ui/ticket-loader'

// Lazy load the heavy AnalyticsDashboard
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'))

interface LazyAnalyticsDashboardProps {
  data?: any
  isLoading?: boolean
  timeRange?: '24h' | '7d' | '30d' | '90d'
  onTimeRangeChange?: (range: string) => void
}

// Loading component for analytics
const AnalyticsLoadingFallback = () => (
  <div className="w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading analytics...</p>
    </div>
  </div>
)

export default function LazyAnalyticsDashboard(props: LazyAnalyticsDashboardProps) {
  return (
    <Suspense fallback={<AnalyticsLoadingFallback />}>
      <AnalyticsDashboard {...props} />
    </Suspense>
  )
}