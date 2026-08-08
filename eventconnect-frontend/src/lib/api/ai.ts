import { apiClient } from './client'

export interface AIEventRecommendation {
  _id: string
  title: string
  description?: string
  category?: string
  date?: string
  location?: { address?: string; city?: string }
  images?: { url: string }[]
  imageUrl?: string
  attendeesCount?: number
  score?: number
  reason?: string
}

export interface AITribeRecommendation {
  _id: string
  name: string
  description?: string
  category?: string
  members?: unknown[]
  avatar?: string
}

export const aiService = {
  // Personalized event recommendations for the current user
  getEventRecommendations: async (limit = 10) => {
    const res = await apiClient.get('/ai/recommendations/events', { params: { limit } })
    return res.data
  },

  // Personalized tribe recommendations
  getTribeRecommendations: async (limit = 10) => {
    const res = await apiClient.get('/ai/recommendations/tribes', { params: { limit } })
    return res.data
  },

  // Personalized user recommendations
  getUserRecommendations: async (limit = 10) => {
    const res = await apiClient.get('/ai/recommendations/users', { params: { limit } })
    return res.data
  },

  // Unified recommendations feed
  getRecommendations: async () => {
    const res = await apiClient.get('/ai/recommendations')
    return res.data
  },

  // Personalized home feed
  getFeed: async (page = 1, limit = 20) => {
    const res = await apiClient.get('/ai/feed', { params: { page, limit } })
    return res.data
  },

  // Trending events (public)
  getTrending: async (limit = 10) => {
    const res = await apiClient.get('/ai/trending', { params: { limit } })
    return res.data
  },

  // Smart recommendations (blended)
  getSmartRecommendations: async () => {
    const res = await apiClient.get('/ai/recommendations/smart')
    return res.data
  },

  // Record a user interaction to improve future recommendations
  trackInteraction: async (payload: {
    eventId?: string
    tribeId?: string
    action: 'view' | 'like' | 'join' | 'share' | 'bookmark' | 'attend'
  }) => {
    const res = await apiClient.post('/ai/interaction', payload)
    return res.data
  },
}

export default aiService
