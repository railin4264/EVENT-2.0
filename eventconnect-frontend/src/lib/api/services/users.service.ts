// ============================================================
// USERS SERVICE
// Handles all user-related API calls
// ============================================================

import { apiClient } from '../client'
import { API_ENDPOINTS } from '@/lib/config'
import { useAuthStore } from '@/stores/authStore'
import type {
  User,
  PublicUser,
  Event,
  ApiResponse,
} from '@/types/models'

interface UpdateProfileData {
  firstName?: string
  lastName?: string
  bio?: string
  location?: string
  interests?: string[]
  avatar?: string
}

class UsersService {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.USERS.PROFILE
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to get profile')
  }

  /**
   * Update current user's profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>(
      API_ENDPOINTS.USERS.UPDATE_PROFILE,
      data
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to update profile')
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<PublicUser> {
    const response = await apiClient.get<ApiResponse<PublicUser>>(
      API_ENDPOINTS.USERS.GET(id)
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'User not found')
  }

  /**
   * Get events created or attended by a user
   */
  async getUserEvents(id: string): Promise<Event[]> {
    const response = await apiClient.get<ApiResponse<Event[]>>(
      API_ENDPOINTS.USERS.EVENTS(id)
    )

    return response.data.data || []
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      API_ENDPOINTS.USERS.AVATAR,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    if (response.data.success && response.data.data) {
      return response.data.data.url
    }

    throw new Error(response.data.message || 'Failed to upload avatar')
  }

  // ============================================================
  // FOLLOWS
  // ============================================================

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.FOLLOWS.FOLLOW(userId))
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FOLLOWS.UNFOLLOW(userId))
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId?: string): Promise<PublicUser[]> {
    const me = useAuthStore.getState().user as any
    const id = userId || (me && (me._id || me.id))
    if (!id) return []
    const response = await apiClient.get<ApiResponse<PublicUser[]>>(
      API_ENDPOINTS.FOLLOWS.FOLLOWERS(id)
    )

    return response.data.data || []
  }

  /**
   * Get users that current user is following
   */
  async getFollowing(userId?: string): Promise<PublicUser[]> {
    const me = useAuthStore.getState().user as any
    const id = userId || (me && (me._id || me.id))
    if (!id) return []
    const response = await apiClient.get<ApiResponse<PublicUser[]>>(
      API_ENDPOINTS.FOLLOWS.FOLLOWING(id)
    )

    return response.data.data || []
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Calculate user level from XP
   */
  calculateLevel(xp: number): number {
    const XP_PER_LEVEL = 100
    return Math.floor(xp / XP_PER_LEVEL) + 1
  }

  /**
   * Calculate XP progress to next level
   */
  calculateXPProgress(xp: number): {
    currentLevelXP: number
    nextLevelXP: number
    progress: number
  } {
    const XP_PER_LEVEL = 100
    const currentLevel = this.calculateLevel(xp)
    const currentLevelXP = xp % XP_PER_LEVEL
    const nextLevelXP = XP_PER_LEVEL
    const progress = (currentLevelXP / nextLevelXP) * 100

    return {
      currentLevelXP,
      nextLevelXP,
      progress,
    }
  }

  /**
   * Get user's full name
   */
  getFullName(user: User | PublicUser): string {
    return `${user.firstName} ${user.lastName}`
  }

  /**
   * Get user's initials for avatar fallback
   */
  getInitials(user: User | PublicUser): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
  }

  /**
   * Format user stats for display
   */
  formatUserStats(user: User | PublicUser): {
    label: string
    value: number
  }[] {
    return [
      { label: 'Events Created', value: user.eventsCreated },
      { label: 'Events Attended', value: user.eventsAttended },
      { label: 'Followers', value: user.followers },
      { label: 'Following', value: user.following },
      { label: 'Level', value: user.level },
      { label: 'XP', value: user.xp },
    ]
  }
}

// Export singleton instance
export const usersService = new UsersService()
