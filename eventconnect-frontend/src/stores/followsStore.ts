'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as followsAPI from '@/lib/api/follows'
import type { 
  User, 
  FollowStats, 
  FollowStatus, 
  Follower, 
  Following, 
  FollowRequest, 
  SuggestedUser 
} from '@/lib/api/follows'

interface FollowsState {
  // Follow data
  followStats: { [userId: string]: FollowStats }
  followStatuses: { [userId: string]: FollowStatus }
  followers: { [userId: string]: Follower[] }
  following: { [userId: string]: Following[] }
  followRequests: FollowRequest[]
  suggestedUsers: SuggestedUser[]
  mutualFollows: { [userId: string]: User[] }
  
  // UI state
  isLoading: boolean
  isFollowing: boolean
  isUnfollowing: boolean
  error: string | null
  
  // Actions
  followUser: (userId: string) => Promise<void>
  unfollowUser: (userId: string) => Promise<void>
  getFollowStatus: (userId: string) => Promise<FollowStatus>
  getFollowStats: (userId: string) => Promise<FollowStats>
  fetchFollowers: (userId: string, page?: number) => Promise<void>
  fetchFollowing: (userId: string, page?: number) => Promise<void>
  fetchFollowRequests: (page?: number) => Promise<void>
  fetchSuggestedUsers: (limit?: number) => Promise<void>
  fetchMutualFollows: (userId: string, limit?: number) => Promise<void>
  acceptFollowRequest: (requestId: string) => Promise<void>
  rejectFollowRequest: (requestId: string) => Promise<void>
  
  // Utility actions
  updateFollowStatus: (userId: string, status: Partial<FollowStatus>) => void
  updateFollowStats: (userId: string, stats: Partial<FollowStats>) => void
  clearError: () => void
  clearUserData: (userId: string) => void
}

export const useFollowsStore = create<FollowsState>()(
  persist(
    (set, get) => ({
      // Initial state
      followStats: {},
      followStatuses: {},
      followers: {},
      following: {},
      followRequests: [],
      suggestedUsers: [],
      mutualFollows: {},
      isLoading: false,
      isFollowing: false,
      isUnfollowing: false,
      error: null,

      // Actions
      followUser: async (userId: string) => {
        try {
          set({ isFollowing: true, error: null })
          
          await followsAPI.followUser(userId)
          
          // Update follow status
          const currentStatus = get().followStatuses[userId] || { isFollowing: false, followsMe: false, isMutual: false }
          get().updateFollowStatus(userId, { 
            isFollowing: true, 
            isMutual: currentStatus.followsMe 
          })
          
          // Update stats
          const currentStats = get().followStats[userId] || { followersCount: 0, followingCount: 0 }
          get().updateFollowStats(userId, { 
            followersCount: currentStats.followersCount + 1 
          })
          
          // Remove from suggested users
          set((state) => ({
            suggestedUsers: state.suggestedUsers.filter(user => user._id !== userId)
          }))
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al seguir usuario'
          })
          throw error
        } finally {
          set({ isFollowing: false })
        }
      },

      unfollowUser: async (userId: string) => {
        try {
          set({ isUnfollowing: true, error: null })
          
          await followsAPI.unfollowUser(userId)
          
          // Update follow status
          get().updateFollowStatus(userId, { 
            isFollowing: false, 
            isMutual: false 
          })
          
          // Update stats
          const currentStats = get().followStats[userId] || { followersCount: 0, followingCount: 0 }
          get().updateFollowStats(userId, { 
            followersCount: Math.max(0, currentStats.followersCount - 1)
          })
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al dejar de seguir usuario'
          })
          throw error
        } finally {
          set({ isUnfollowing: false })
        }
      },

      getFollowStatus: async (userId: string) => {
        try {
          const response = await followsAPI.getFollowStatus(userId)
          
          get().updateFollowStatus(userId, response.data)
          
          return response.data
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al obtener estado de seguimiento'
          })
          throw error
        }
      },

      getFollowStats: async (userId: string) => {
        try {
          const response = await followsAPI.getFollowStats(userId)
          
          get().updateFollowStats(userId, response.data)
          
          return response.data
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al obtener estadísticas'
          })
          throw error
        }
      },

      fetchFollowers: async (userId: string, page = 1) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await followsAPI.getFollowers(userId, page)
          
          set((state) => ({
            followers: {
              ...state.followers,
              [userId]: page === 1 ? response.data.followers : [...(state.followers[userId] || []), ...response.data.followers]
            },
            followStats: {
              ...state.followStats,
              [userId]: {
                ...(state.followStats[userId] || {}),
                followersCount: response.data.followersCount,
                followingCount: response.data.followingCount
              }
            }
          }))
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al cargar seguidores'
          })
        } finally {
          set({ isLoading: false })
        }
      },

      fetchFollowing: async (userId: string, page = 1) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await followsAPI.getFollowing(userId, page)
          
          set((state) => ({
            following: {
              ...state.following,
              [userId]: page === 1 ? response.data.following : [...(state.following[userId] || []), ...response.data.following]
            },
            followStats: {
              ...state.followStats,
              [userId]: {
                ...(state.followStats[userId] || {}),
                followersCount: response.data.followersCount,
                followingCount: response.data.followingCount
              }
            }
          }))
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al cargar usuarios seguidos'
          })
        } finally {
          set({ isLoading: false })
        }
      },

      fetchFollowRequests: async (page = 1) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await followsAPI.getFollowRequests(page)
          
          set((state) => ({
            followRequests: page === 1 ? response.data.requests : [...state.followRequests, ...response.data.requests]
          }))
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al cargar solicitudes'
          })
        } finally {
          set({ isLoading: false })
        }
      },

      fetchSuggestedUsers: async (limit = 10) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await followsAPI.getSuggestedUsers(limit)
          
          set({ suggestedUsers: response.data })
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al cargar sugerencias'
          })
        } finally {
          set({ isLoading: false })
        }
      },

      fetchMutualFollows: async (userId: string, limit = 10) => {
        try {
          const response = await followsAPI.getMutualFollows(userId, limit)
          
          set((state) => ({
            mutualFollows: {
              ...state.mutualFollows,
              [userId]: response.data.mutualFollows
            }
          }))
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al cargar conexiones mutuas'
          })
        }
      },

      acceptFollowRequest: async (requestId: string) => {
        try {
          await followsAPI.acceptFollowRequest(requestId)
          
          // Remove from requests list
          set((state) => ({
            followRequests: state.followRequests.filter(req => req._id !== requestId)
          }))
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al aceptar solicitud'
          })
          throw error
        }
      },

      rejectFollowRequest: async (requestId: string) => {
        try {
          await followsAPI.rejectFollowRequest(requestId)
          
          // Remove from requests list
          set((state) => ({
            followRequests: state.followRequests.filter(req => req._id !== requestId)
          }))
          
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Error al rechazar solicitud'
          })
          throw error
        }
      },

      // Utility actions
      updateFollowStatus: (userId: string, status: Partial<FollowStatus>) => {
        set((state) => ({
          followStatuses: {
            ...state.followStatuses,
            [userId]: {
              ...state.followStatuses[userId],
              ...status
            }
          }
        }))
      },

      updateFollowStats: (userId: string, stats: Partial<FollowStats>) => {
        set((state) => ({
          followStats: {
            ...state.followStats,
            [userId]: {
              ...state.followStats[userId],
              ...stats
            }
          }
        }))
      },

      clearError: () => {
        set({ error: null })
      },

      clearUserData: (userId: string) => {
        set((state) => {
          const newState = { ...state }
          delete newState.followStats[userId]
          delete newState.followStatuses[userId]
          delete newState.followers[userId]
          delete newState.following[userId]
          delete newState.mutualFollows[userId]
          return newState
        })
      },
    }),
    {
      name: 'follows-storage',
      partialize: (state) => ({
        // Only persist follow stats and statuses, not the full lists
        followStats: state.followStats,
        followStatuses: state.followStatuses,
      }),
    }
  )
)

// Export selectors for convenience
export const useFollowStatus = (userId: string) => {
  return useFollowsStore((state) => state.followStatuses[userId])
}

export const useFollowStats = (userId: string) => {
  return useFollowsStore((state) => state.followStats[userId])
}

export const useFollowers = (userId: string) => {
  return useFollowsStore((state) => state.followers[userId])
}

export const useFollowing = (userId: string) => {
  return useFollowsStore((state) => state.following[userId])
}

export const useMutualFollows = (userId: string) => {
  return useFollowsStore((state) => state.mutualFollows[userId])
}