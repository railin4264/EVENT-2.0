import { apiClient } from './client'

export interface User {
  _id: string
  firstName: string
  lastName: string
  username: string
  avatar: string
  verified?: boolean
  bio?: string
}

export interface FollowStats {
  followersCount: number
  followingCount: number
  mutualCount?: number
}

export interface FollowStatus {
  isFollowing: boolean
  followsMe: boolean
  isMutual: boolean
}

export interface Follower {
  _id: string
  user: User
  followedAt: Date
  isFollowingBack: boolean
}

export interface Following {
  _id: string
  user: User
  followedAt: Date
  isAlsoFollowing: boolean
}

export interface FollowRequest {
  _id: string
  user: User
  requestedAt: Date
}

export interface SuggestedUser extends User {
  mutualCount: number
  mutualFriends: User[]
  mutualFriendsDetails: User[]
}

export interface MutualFollow extends User {}

// Follow a user
export const followUser = async (userId: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: {
      followId: string
      following: User
      status: string
    }
  }>(`/follows/${userId}`)
  
  return response.data
}

// Unfollow a user
export const unfollowUser = async (userId: string) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
  }>(`/follows/${userId}`)
  
  return response.data
}

// Check follow status with a user
export const getFollowStatus = async (userId: string) => {
  const response = await apiClient.get<{
    success: boolean
    data: FollowStatus
  }>(`/follows/status/${userId}`)
  
  return response.data
}

// Get user's followers
export const getFollowers = async (userId: string, page: number = 1, limit: number = 20) => {
  const response = await apiClient.get<{
    success: boolean
    data: {
      followers: Follower[]
      followersCount: number
      followingCount: number
      pagination: {
        page: number
        limit: number
        hasMore: boolean
      }
    }
  }>(`/follows/followers/${userId}?page=${page}&limit=${limit}`)
  
  return response.data
}

// Get users that a user follows
export const getFollowing = async (userId: string, page: number = 1, limit: number = 20) => {
  const response = await apiClient.get<{
    success: boolean
    data: {
      following: Following[]
      followersCount: number
      followingCount: number
      pagination: {
        page: number
        limit: number
        hasMore: boolean
      }
    }
  }>(`/follows/following/${userId}?page=${page}&limit=${limit}`)
  
  return response.data
}

// Get mutual follows between current user and another user
export const getMutualFollows = async (userId: string, limit: number = 10) => {
  const response = await apiClient.get<{
    success: boolean
    data: {
      mutualFollows: MutualFollow[]
      count: number
    }
  }>(`/follows/mutual/${userId}?limit=${limit}`)
  
  return response.data
}

// Get suggested users to follow
export const getSuggestedUsers = async (limit: number = 10) => {
  const response = await apiClient.get<{
    success: boolean
    data: SuggestedUser[]
  }>(`/follows/suggestions?limit=${limit}`)
  
  return response.data
}

// Get pending follow requests
export const getFollowRequests = async (page: number = 1, limit: number = 20) => {
  const response = await apiClient.get<{
    success: boolean
    data: {
      requests: FollowRequest[]
      pagination: {
        page: number
        limit: number
        hasMore: boolean
      }
    }
  }>(`/follows/requests?page=${page}&limit=${limit}`)
  
  return response.data
}

// Accept a follow request
export const acceptFollowRequest = async (requestId: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: {
      followId: string
      status: string
    }
  }>(`/follows/requests/${requestId}/accept`)
  
  return response.data
}

// Reject a follow request
export const rejectFollowRequest = async (requestId: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
  }>(`/follows/requests/${requestId}/reject`)
  
  return response.data
}

// Get follow statistics for a user
export const getFollowStats = async (userId: string) => {
  const response = await apiClient.get<{
    success: boolean
    data: FollowStats
  }>(`/follows/stats/${userId}`)
  
  return response.data
}

// Utility functions
export const formatFollowCount = (count: number): string => {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}

export const getFollowButtonText = (status: FollowStatus): string => {
  if (status.isFollowing) {
    return status.isMutual ? 'Siguiendo' : 'Siguiendo'
  }
  
  if (status.followsMe) {
    return 'Seguir de vuelta'
  }
  
  return 'Seguir'
}

export const getFollowButtonVariant = (status: FollowStatus): 'primary' | 'outline' | 'secondary' => {
  if (status.isFollowing) {
    return 'outline'
  }
  
  if (status.followsMe) {
    return 'primary'
  }
  
  return 'primary'
}

export const getUserDisplayName = (user: User): string => {
  return `${user.firstName} ${user.lastName}`
}

export const getUserHandleName = (user: User): string => {
  return `@${user.username}`
}

export const canViewProfile = (user: User): boolean => {
  // For now, all profiles are public
  // Later you can add privacy settings logic here
  return true
}

export const shouldShowMutualFollows = (mutualCount: number): boolean => {
  return mutualCount > 0
}

export const getMutualFollowsText = (mutualCount: number, mutualUsers: User[] = []): string => {
  if (mutualCount === 0) return ''
  
  if (mutualUsers.length === 0) {
    return `${mutualCount} conexión${mutualCount !== 1 ? 'es' : ''} mutual${mutualCount !== 1 ? 'es' : ''}`
  }
  
  if (mutualUsers.length === 1) {
    return `Seguido por ${getUserDisplayName(mutualUsers[0])}`
  }
  
  if (mutualUsers.length === 2) {
    return `Seguido por ${getUserDisplayName(mutualUsers[0])} y ${getUserDisplayName(mutualUsers[1])}`
  }
  
  const others = mutualCount - 2
  return `Seguido por ${getUserDisplayName(mutualUsers[0])}, ${getUserDisplayName(mutualUsers[1])} y ${others} más`
}

export const isValidUserId = (userId: string): boolean => {
  // Basic MongoDB ObjectId validation
  return /^[0-9a-fA-F]{24}$/.test(userId)
}

export const getRelationshipText = (status: FollowStatus): string => {
  if (status.isMutual) {
    return 'Os seguís mutuamente'
  }
  
  if (status.isFollowing && status.followsMe) {
    return 'Os seguís mutuamente'
  }
  
  if (status.isFollowing) {
    return 'Le sigues'
  }
  
  if (status.followsMe) {
    return 'Te sigue'
  }
  
  return 'No hay relación'
}

export const sortUsersByFollowStatus = (users: (User & { followStatus?: FollowStatus })[]): typeof users => {
  return users.sort((a, b) => {
    // Prioritize mutual follows
    if (a.followStatus?.isMutual && !b.followStatus?.isMutual) return -1
    if (!a.followStatus?.isMutual && b.followStatus?.isMutual) return 1
    
    // Then users who follow you
    if (a.followStatus?.followsMe && !b.followStatus?.followsMe) return -1
    if (!a.followStatus?.followsMe && b.followStatus?.followsMe) return 1
    
    // Finally by name
    return getUserDisplayName(a).localeCompare(getUserDisplayName(b))
  })
}

export const filterUsersByQuery = (users: User[], query: string): User[] => {
  if (!query.trim()) return users
  
  const searchTerm = query.toLowerCase()
  
  return users.filter(user => 
    user.firstName.toLowerCase().includes(searchTerm) ||
    user.lastName.toLowerCase().includes(searchTerm) ||
    user.username.toLowerCase().includes(searchTerm) ||
    getUserDisplayName(user).toLowerCase().includes(searchTerm)
  )
}

// Types are already exported from their definitions above