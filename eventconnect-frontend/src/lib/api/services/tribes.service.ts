// ============================================================
// TRIBES SERVICE
// Handles tribes/groups functionality
// ============================================================

import { apiClient } from '../client'
import type { ApiResponse } from '@/types/models'

interface Tribe {
  _id: string
  name: string
  description: string
  image?: string
  category: string
  members: string[]
  membersCount: number
  createdBy: string
  isPrivate: boolean
  location?: {
    type: string
    coordinates: number[]
    address?: string
    isVirtual?: boolean
  }
  distance?: number
  createdAt: Date
  updatedAt: Date
}

class TribesService {
  /**
   * Get all tribes
   */
  async getTribes(params?: { category?: string; search?: string }): Promise<ApiResponse<Tribe[]>> {
    const queryParams = new URLSearchParams()
    if (params?.category) queryParams.append('category', params.category)
    if (params?.search) queryParams.append('search', params.search)

    const response = await apiClient.get<ApiResponse<Tribe[]>>(
      `/api/tribes?${queryParams.toString()}`
    )
    return response.data
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

    const response = await apiClient.get<ApiResponse<Tribe[]>>(
      `/api/tribes/nearby?${queryParams.toString()}`
    )
    return response.data
  }

  /**
   * Get tribe by ID
   */
  async getTribeById(id: string): Promise<ApiResponse<Tribe>> {
    const response = await apiClient.get<ApiResponse<Tribe>>(
      `/api/tribes/${id}`
    )
    return response.data
  }

  /**
   * Join a tribe
   */
  async joinTribe(tribeId: string): Promise<ApiResponse<Tribe>> {
    const response = await apiClient.post<ApiResponse<Tribe>>(
      `/api/tribes/${tribeId}/join`
    )
    return response.data
  }

  /**
   * Leave a tribe
   */
  async leaveTribe(tribeId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>(
      `/api/tribes/${tribeId}/leave`
    )
    return response.data
  }

  /**
   * Create a new tribe
   */
  async createTribe(data: Partial<Tribe>): Promise<ApiResponse<Tribe>> {
    const response = await apiClient.post<ApiResponse<Tribe>>(
      `/api/tribes`,
      data
    )
    return response.data
  }
}

export const tribesService = new TribesService()
