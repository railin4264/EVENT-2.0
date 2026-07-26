import { apiClient } from './client'

export interface FeedPost {
  id: string
  type: string
  user: {
    name: string
    avatar: string
    verified: boolean
    title?: string
  }
  content: string
  image?: string
  eventData?: {
    name: string
    location: string
    date: string
    attendees: number
  }
  tribeData?: {
    name: string
    memberCount: number
  }
  stats: {
    likes: number
    comments: number
    shares: number
  }
  timestamp: string
  liked: boolean
  bookmarked: boolean
  isPinned: boolean
  isSponsored: boolean
}

export interface CreatePostData {
  content: string
  type?: string
  images?: string[]
  eventId?: string
  tribeId?: string
  location?: string
  visibility?: 'public' | 'friends' | 'private'
}

export interface PostFilters {
  type?: 'todos' | 'trending' | 'conexiones' | 'tribus' | 'eventos'
  page?: number
  limit?: number
}

export interface CommentData {
  content: string
}

// Get feed posts
export const getFeedPosts = async (filters: PostFilters = {}) => {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await apiClient.get<{
    success: boolean
    count: number
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
    data: FeedPost[]
  }>(`/feed?${params.toString()}`)
  
  return response.data
}

// Create new post
export const createPost = async (postData: CreatePostData) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: FeedPost
  }>('/feed', postData)
  
  return response.data
}

// Like/unlike post
export const togglePostLike = async (postId: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    liked: boolean
    likesCount: number
  }>(`/feed/${postId}/like`)
  
  return response.data
}

// Add comment to post
export const addPostComment = async (postId: string, commentData: CommentData) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    comment: any
    commentsCount: number
  }>(`/feed/${postId}/comment`, commentData)
  
  return response.data
}

// Share post
export const sharePost = async (postId: string, content?: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    sharesCount: number
  }>(`/feed/${postId}/share`, { content })
  
  return response.data
}

// Delete post
export const deletePost = async (postId: string) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
  }>(`/feed/${postId}`)
  
  return response.data
}

// Get post comments
export const getPostComments = async (postId: string, page: number = 1, limit: number = 10) => {
  const response = await apiClient.get<{
    success: boolean
    data: any[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>(`/feed/${postId}/comments?page=${page}&limit=${limit}`)
  
  return response.data
}