// ============================================================
// TRIBES SERVICE
// Handles tribes/communities, private join requests, posts & moderation
// ============================================================

import { apiClient } from '../client'
import type { ApiResponse } from '@/types/models'

export interface TribeJoinRequest {
  _id?: string
  user: {
    _id: string
    username: string
    firstName?: string
    lastName?: string
    avatar?: string
    bio?: string
  }
  message?: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
}

export interface Tribe {
  _id: string
  name: string
  description: string
  image?: string
  avatar?: string | { url?: string; alt?: string }
  cover?: string
  coverImage?: string | { url?: string; alt?: string }
  category: string
  members?: any[]
  memberCount?: number
  membersCount: number
  createdBy: any
  creator?: any
  isPrivate: boolean
  isPublic?: boolean
  privacy?: 'public' | 'private' | 'secret'
  membership?: 'open' | 'approval_required' | 'invite_only'
  isMember?: boolean
  isAdmin?: boolean
  canViewContent?: boolean
  canManageRequests?: boolean
  canRequestJoin?: boolean
  canJoin?: boolean
  isBanned?: boolean
  userRole?: 'admin' | 'moderator' | 'member' | null
  joinRequestStatus?: 'member' | 'pending' | 'rejected' | 'approved' | 'banned' | 'none'
  hasPendingRequest?: boolean
  pendingRequestsCount?: number
  joinRequests?: TribeJoinRequest[]
  rules?: string[]
  welcomeMessage?: string
  tags?: string[]
  stats?: {
    memberCount: number
    totalMembers?: number
    eventCount: number
    totalEvents?: number
    activityLevel?: 'low' | 'medium' | 'high'
  }
  location?: {
    type?: string
    coordinates?: number[]
    address?: string
    city?: string
    country?: string
    isVirtual?: boolean
  }
  distance?: number
  createdAt: Date | string
  updatedAt?: Date | string
}

class TribesService {
  /**
   * Get all tribes with optional filters
   */
  async getTribes(params?: {
    category?: string
    search?: string
    privacy?: string
    sortBy?: string
    limit?: number
    page?: number
    scope?: 'requests'
  }): Promise<ApiResponse<Tribe[]>> {
    const queryParams = new URLSearchParams()
    if (params?.category && params.category !== 'all') queryParams.append('category', params.category)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.privacy && params.privacy !== 'all') queryParams.append('privacy', params.privacy)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.scope) queryParams.append('scope', params.scope)

    const response = await apiClient.get<any>(`/tribes?${queryParams.toString()}`)
    const payload = response.data
    return {
      ...payload,
      data: payload.data || payload.tribes || []
    }
  }

  /**
   * Get nearby tribes
   */
  async getNearbyTribes(params: {
    lat: number
    lng: number
    radius?: number
  }): Promise<ApiResponse<Tribe[]>> {
    const queryParams = new URLSearchParams()
    queryParams.append('lat', params.lat.toString())
    queryParams.append('lng', params.lng.toString())
    if (params.radius) queryParams.append('radius', params.radius.toString())

    const response = await apiClient.get<any>(`/tribes/nearby?${queryParams.toString()}`)
    const payload = response.data
    return {
      ...payload,
      data: payload.data || payload.tribes || []
    }
  }

  /**
   * Get current user's joined tribes
   */
  async getMyTribes(): Promise<ApiResponse<Tribe[]>> {
    const response = await apiClient.get<any>(`/tribes/user/me`)
    const payload = response.data
    return {
      ...payload,
      data: payload.data || payload.tribes || []
    }
  }

  /**
   * Get tribe by ID
   */
  async getTribeById(id: string): Promise<ApiResponse<Tribe>> {
    const response = await apiClient.get<any>(`/tribes/${id}`)
    const payload = response.data
    return {
      ...payload,
      data: payload.tribe || payload.data || payload
    }
  }

  /**
   * Join a public tribe or request to join a private tribe
   */
  async joinTribe(tribeId: string, message?: string): Promise<any> {
    const response = await apiClient.post<any>(`/tribes/${tribeId}/join`, message ? { message } : {})
    return response.data
  }

  /**
   * Explicitly request to join a private tribe with optional presentation message
   */
  async requestJoinTribe(tribeId: string, message?: string): Promise<any> {
    const response = await apiClient.post<any>(`/tribes/${tribeId}/join`, { message: message || '' })
    return response.data
  }

  /**
   * Cancel a pending join request for a private tribe
   */
  async cancelJoinRequest(tribeId: string): Promise<any> {
    const response = await apiClient.delete<any>(`/tribes/${tribeId}/join-request`)
    return response.data
  }

  /**
   * Get pending join requests for a tribe (admin/moderator)
   */
  async getJoinRequests(tribeId: string): Promise<TribeJoinRequest[]> {
    const response = await apiClient.get<any>(`/tribes/${tribeId}/requests`)
    const payload = response.data
    return payload.requests || payload.joinRequests || payload.data || []
  }

  /**
   * Approve a user's join request (admin/moderator)
   */
  async approveJoinRequest(tribeId: string, userId: string): Promise<any> {
    const response = await apiClient.post<any>(`/tribes/${tribeId}/requests/${userId}/approve`)
    return response.data
  }

  /**
   * Reject a user's join request (admin/moderator)
   */
  async rejectJoinRequest(tribeId: string, userId: string): Promise<any> {
    const response = await apiClient.post<any>(`/tribes/${tribeId}/requests/${userId}/reject`)
    return response.data
  }

  /**
   * Leave a tribe
   */
  async leaveTribe(tribeId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>(`/tribes/${tribeId}/leave`)
    return response.data
  }

  /**
   * Create a new tribe
   */
  async createTribe(data: Record<string, any>): Promise<any> {
    const response = await apiClient.post<any>(`/tribes`, data)
    return response.data
  }

  /**
   * Update tribe settings/info
   */
  async updateTribe(tribeId: string, data: Record<string, any>): Promise<any> {
    const response = await apiClient.put<any>(`/tribes/${tribeId}`, data)
    return response.data
  }

  /**
   * Create a post inside a tribe
   */
  async createTribePost(tribeId: string, data: { content: string; images?: any[] }): Promise<any> {
    const response = await apiClient.post<any>(`/tribes/${tribeId}/posts`, data)
    return response.data
  }

  /**
   * Toggle like on a tribe post
   */
  async likeTribePost(tribeId: string, postId: string): Promise<any> {
    const response = await apiClient.post<any>(`/tribes/${tribeId}/posts/${postId}/like`)
    return response.data
  }

  /**
   * Add a comment on a tribe post
   */
  async commentTribePost(tribeId: string, postId: string, content: string): Promise<any> {
    const response = await apiClient.post<any>(`/tribes/${tribeId}/posts/${postId}/comments`, { content })
    return response.data
  }
}

export const tribesService = new TribesService()
