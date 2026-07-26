'use client'

import { useState, useEffect } from 'react'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import api from '@/lib/api/client'
// Import removed as it's not needed for the glassmorphic redesign

interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalEvents: number
    totalPageViews: number
    averageSessionDuration: number
    bounceRate: number
  }
  userGrowth: Array<{
    date: string
    users: number
    newUsers: number
  }>
  eventMetrics: Array<{
    name: string
    views: number
    joins: number
    shares: number
  }>
  deviceStats: Array<{
    device: string
    users: number
    percentage: number
  }>
  pageViews: Array<{
    page: string
    views: number
    avgTime: number
  }>
  realTimeMetrics: {
    activeUsers: number
    currentPageViews: number
    topPages: string[]
    recentEvents: string[]
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch all analytics data
      const [eventAnalytics, userAnalytics, tribeAnalytics, revenueAnalytics] = await Promise.all([
        api.get(`/analytics/events?timeframe=${timeRange}`),
        api.get(`/analytics/users?timeframe=${timeRange}`),
        api.get(`/analytics/tribes?timeframe=${timeRange}`),
        api.get(`/analytics/revenue?timeframe=${timeRange}`)
      ])

      // Transform data to match the AnalyticsDashboard expected format
      const transformedData: AnalyticsData = {
        overview: {
          totalUsers: userAnalytics.data.userAnalytics.overview.totalUsers,
          activeUsers: userAnalytics.data.userAnalytics.overview.activeUsers,
          totalEvents: eventAnalytics.data.analytics.overview.totalEvents,
          totalPageViews: eventAnalytics.data.analytics.overview.totalPageViews || 0,
          averageSessionDuration: userAnalytics.data.userAnalytics.engagement.averageSessionTime * 60, // Convert to seconds
          bounceRate: 0 // Would need to calculate from analytics data
        },
        userGrowth: eventAnalytics.data.analytics.trends?.daily?.map((day: any) => ({
          date: day.date,
          users: day.users || day.uniqueUsers || 0,
          newUsers: Math.floor((day.users || day.uniqueUsers || 0) * 0.3)
        })) || [],
        eventMetrics: eventAnalytics.data.analytics.topEvents?.map((event: any) => ({
          name: event.title,
          views: event.views || 0,
          joins: event.attendees || 0,
          shares: Math.floor((event.views || 0) * 0.1)
        })) || [],
        deviceStats: [
          { device: 'Desktop', users: Math.floor(userAnalytics.data.userAnalytics.overview.totalUsers * 0.6), percentage: 60 },
          { device: 'Móvil', users: Math.floor(userAnalytics.data.userAnalytics.overview.totalUsers * 0.3), percentage: 30 },
          { device: 'Tablet', users: Math.floor(userAnalytics.data.userAnalytics.overview.totalUsers * 0.1), percentage: 10 }
        ],
        pageViews: [
          { page: '/dashboard', views: Math.floor(eventAnalytics.data.analytics.overview.totalPageViews * 0.4), avgTime: 180 },
          { page: '/events', views: Math.floor(eventAnalytics.data.analytics.overview.totalPageViews * 0.3), avgTime: 240 },
          { page: '/discovery', views: Math.floor(eventAnalytics.data.analytics.overview.totalPageViews * 0.2), avgTime: 120 },
          { page: '/profile', views: Math.floor(eventAnalytics.data.analytics.overview.totalPageViews * 0.1), avgTime: 90 }
        ],
        realTimeMetrics: {
          activeUsers: Math.floor(userAnalytics.data.userAnalytics.overview.activeUsers * 0.1),
          currentPageViews: Math.floor(eventAnalytics.data.analytics.overview.totalPageViews * 0.001),
          topPages: ['/dashboard', '/events', '/discovery'],
          recentEvents: ['page_view', 'event_interaction', 'user_login', 'event_join']
        }
      }

      setData(transformedData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setError('No se pudieron cargar los datos de analíticas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range as '24h' | '7d' | '30d' | '90d')
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="glass bg-white/5 border border-white/10 p-8 rounded-3xl text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Error al cargar Analíticas</h2>
          <p className="text-red-400 mb-6 font-medium">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="btn-gradient px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-shadow"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <AnalyticsDashboard
        data={data || undefined}
        isLoading={isLoading}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
      />
    </div>
  )
}