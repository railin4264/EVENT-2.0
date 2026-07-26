'use client'

import { useState, useEffect, useCallback } from 'react'
import { dashboardService } from '@/lib/api/dashboard'
import type { DashboardData, DashboardStats, FeedPost, UpcomingEvent, SuggestedConnection } from '@/lib/api/dashboard'
import { useAuthStore } from '@/stores/authStore'

interface UseDashboardState {
  stats: DashboardStats | null
  feed: FeedPost[]
  upcomingEvents: UpcomingEvent[]
  suggestedConnections: SuggestedConnection[]
  isLoading: boolean
  error: string | null
  hasMoreFeed: boolean
}

export function useDashboard() {
  const { isAuthenticated } = useAuthStore()
  const [state, setState] = useState<UseDashboardState>({
    stats: null,
    feed: [],
    upcomingEvents: [],
    suggestedConnections: [],
    isLoading: false,
    error: null,
    hasMoreFeed: false,
  })

  const [feedPage, setFeedPage] = useState(1)

  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const [statsResponse, feedResponse, eventsResponse, connectionsResponse] = await Promise.all([
        dashboardService.getUserStats(),
        dashboardService.getFeed(1, 10),
        dashboardService.getUpcomingEvents(5),
        dashboardService.getSuggestedConnections(5),
      ])

      setState(prev => ({
        ...prev,
        stats: statsResponse,
        feed: feedResponse?.posts || [],
        upcomingEvents: eventsResponse || [],
        suggestedConnections: connectionsResponse || [],
        hasMoreFeed: feedResponse?.hasMore || false,
        isLoading: false,
      }))
      
      setFeedPage(1)
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load dashboard data',
        isLoading: false,
      }))
    }
  }, [isAuthenticated])

  const loadMoreFeed = useCallback(async () => {
    if (!isAuthenticated || state.isLoading || !state.hasMoreFeed) return

    try {
      setState(prev => ({ ...prev, isLoading: true }))
      
      const nextPage = feedPage + 1
      const response = await dashboardService.getFeed(nextPage, 10)
      
      setState(prev => ({
        ...prev,
        feed: [...(prev.feed || []), ...(response?.posts || [])],
        hasMoreFeed: response?.hasMore || false,
        isLoading: false,
      }))
      
      setFeedPage(nextPage)
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load more feed items',
        isLoading: false,
      }))
    }
  }, [isAuthenticated, feedPage, state.isLoading, state.hasMoreFeed])

  const likePost = useCallback(async (postId: string) => {
    try {
      const post = (state.feed || []).find(p => p._id === postId)
      if (!post) return

      // Optimistic update
      setState(prev => ({
        ...prev,
        feed: (prev.feed || []).map(p =>
          p._id === postId
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
            : p
        )
      }))

      if (post.isLiked) {
        await dashboardService.unlikePost(postId)
      } else {
        await dashboardService.likePost(postId)
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        feed: (prev.feed || []).map(p =>
          p._id === postId
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
            : p
        )
      }))
      
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to update like status',
      }))
    }
  }, [state.feed])

  const sendConnectionRequest = useCallback(async (userId: string) => {
    try {
      await dashboardService.sendConnectionRequest(userId)
      
      // Remove from suggested connections
      setState(prev => ({
        ...prev,
        suggestedConnections: (prev.suggestedConnections || []).filter(c => c._id !== userId)
      }))
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to send connection request',
      }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const refreshStats = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const stats = await dashboardService.getUserStats()
      setState(prev => ({ ...prev, stats }))
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to refresh stats',
      }))
    }
  }, [isAuthenticated])

  // Load dashboard data on mount and when authentication changes
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  return {
    ...state,
    loadDashboardData,
    loadMoreFeed,
    likePost,
    sendConnectionRequest,
    clearError,
    refreshStats,
  }
}