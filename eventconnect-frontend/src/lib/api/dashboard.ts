'use client'

import { apiClient } from './client'
import type { User, Event } from '@/types/api.types'

export interface DashboardStats {
  eventsAttended: number
  eventsCreated: number
  connections: number
  points: number
  level: string
  monthlyGrowth: {
    events: number
    connections: number
  }
}

export interface FeedPost {
  _id: string
  user: {
    _id: string
    name: string
    avatar?: string
  }
  content: string
  type: 'event_attended' | 'event_created' | 'connection_made' | 'achievement'
  eventId?: string
  event?: Event
  createdAt: string
  likes: number
  comments: number
  isLiked: boolean
}

export interface SuggestedConnection {
  _id: string
  name: string
  avatar?: string
  mutualFriends: number
  commonInterests: string[]
  location?: string
}

export interface UpcomingEvent {
  _id: string
  title: string
  date: string
  location: {
    name: string
    coordinates: [number, number]
  }
  category: string
  attendees: number
}

export interface DashboardData {
  stats: DashboardStats
  feed: FeedPost[]
  upcomingEvents: UpcomingEvent[]
  suggestedConnections: SuggestedConnection[]
}

class DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [statsResponse, feedResponse, eventsResponse, connectionsResponse] = await Promise.all([
        this.getUserStats(),
        this.getFeed(1, 10),
        this.getUpcomingEvents(5),
        this.getSuggestedConnections(5),
      ])

      return {
        stats: statsResponse,
        feed: feedResponse.posts,
        upcomingEvents: eventsResponse,
        suggestedConnections: connectionsResponse,
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      throw error
    }
  }

  async getUserStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get('/dashboard/stats')
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      throw error
    }
  }

  async getFeed(page = 1, limit = 10): Promise<{ posts: FeedPost[], hasMore: boolean }> {
    try {
      const response = await apiClient.get(`/feed?page=${page}&limit=${limit}`)
      // The backend returns posts in data array, not data.posts
      const posts = response.data.data || []
      const pagination = response.data.pagination || {}
      const hasMore = pagination.page < pagination.pages

      // Transform backend post format to frontend FeedPost format
      const transformedPosts = posts.map((post: any) => ({
        _id: post.id,
        user: {
          _id: post.user._id || 'unknown',
          name: post.user.name,
          avatar: post.user.avatar
        },
        content: post.content,
        type: post.type || 'general',
        createdAt: post.timestamp ? new Date().toISOString() : new Date().toISOString(), // Backend uses timestamp, we need createdAt
        likes: post.stats?.likes || 0,
        comments: post.stats?.comments || 0,
        isLiked: post.liked || false
      }))

      return {
        posts: transformedPosts,
        hasMore
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error)
      throw error
    }
  }

  async getUpcomingEvents(limit = 5): Promise<UpcomingEvent[]> {
    try {
      const response = await apiClient.get(`/dashboard/upcoming-events?limit=${limit}`)
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch upcoming events:', error)
      throw error
    }
  }

  async getSuggestedConnections(limit = 5): Promise<SuggestedConnection[]> {
    try {
      const response = await apiClient.get(`/dashboard/suggested-connections?limit=${limit}`)
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch suggested connections:', error)
      throw error
    }
  }

  async likePost(postId: string): Promise<void> {
    try {
      await apiClient.post(`/feed/${postId}/like`)
    } catch (error) {
      console.error('Failed to like post:', error)
      throw error
    }
  }

  async unlikePost(postId: string): Promise<void> {
    try {
      await apiClient.delete(`/feed/${postId}/like`)
    } catch (error) {
      console.error('Failed to unlike post:', error)
      throw error
    }
  }

  async sendConnectionRequest(userId: string): Promise<void> {
    try {
      await apiClient.post(`/follows/request/${userId}`)
    } catch (error) {
      console.error('Failed to send connection request:', error)
      throw error
    }
  }
}

export const dashboardService = new DashboardService()