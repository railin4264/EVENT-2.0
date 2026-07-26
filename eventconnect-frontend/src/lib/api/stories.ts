import { apiClient } from './client'

export interface StoryMedia {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  duration?: number // For videos, in seconds
}

export interface StoryAuthor {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar: string
  verified?: boolean
}

export interface StoryView {
  user: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar: string
  }
  viewedAt: Date
}

export interface StoryReaction {
  user: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar: string
  }
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
  createdAt: Date
}

export interface StoryReply {
  _id: string
  user: StoryAuthor
  content: string
  createdAt: Date
}

export interface Story {
  _id: string
  content: string
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: string
    fontFamily?: string
  }
  media: StoryMedia[]
  author: StoryAuthor
  event?: {
    _id: string
    title: string
    location: string
  }
  location?: {
    type: string
    coordinates: [number, number]
    address?: string
  }
  views: number
  reactions: number
  replies: number
  createdAt: Date
  expiresAt: Date
  isViewed: boolean
  hasReacted: boolean
  privacy: 'public' | 'friends' | 'tribe' | 'private'
  tags: string[]
  timeRemaining?: number
}

export interface StoryFeedItem {
  user: StoryAuthor
  stories: Story[]
  hasUnviewed: boolean
  latestStory: Date
  storyCount: number
}

export interface CreateStoryData {
  content?: string
  media?: File[]
  privacy?: 'public' | 'friends' | 'tribe' | 'private'
  location?: {
    coordinates: [number, number]
    address: string
  }
  tags?: string[]
  eventId?: string
}

export interface CreateTextStoryData {
  content: string
  backgroundColor?: string
  textColor?: string
  fontSize?: 'small' | 'medium' | 'large'
  fontFamily?: 'sans' | 'serif' | 'mono'
  privacy?: 'public' | 'friends' | 'tribe' | 'private'
}

// Get stories feed
export const getStoriesFeed = async (page: number = 1, limit: number = 20) => {
  const response = await apiClient.get<any>(`/stories/feed?page=${page}&limit=${limit}`)
  
  const stories: Story[] = response.data.stories || []
  const groupedByUser = new Map<string, StoryFeedItem>()
  
  stories.forEach(story => {
    if (!story.author) return
    
    const authorId = story.author._id
    if (!groupedByUser.has(authorId)) {
      groupedByUser.set(authorId, {
        user: story.author,
        stories: [],
        hasUnviewed: false,
        latestStory: story.createdAt,
        storyCount: 0
      })
    }
    
    const feedItem = groupedByUser.get(authorId)!
    feedItem.stories.push(story)
    feedItem.storyCount++
    if (!story.isViewed) {
      feedItem.hasUnviewed = true
    }
    if (new Date(story.createdAt) > new Date(feedItem.latestStory)) {
      feedItem.latestStory = story.createdAt
    }
  })

  return {
    success: response.data.success,
    data: Array.from(groupedByUser.values()),
    pagination: response.data.pagination
  }
}

// Get event stories
export const getEventStories = async (eventId: string) => {
  const response = await apiClient.get<{
    success: boolean
    stories: Story[]
  }>(`/stories/event/${eventId}`)
  
  return response.data
}

// Get my stories
export const getMyStories = async () => {
  const response = await apiClient.get<{
    success: boolean
    stories: Story[]
  }>('/stories/my')
  
  return response.data
}

// Get user's stories
export const getUserStories = async (userId: string) => {
  const response = await apiClient.get<{
    success: boolean
    data: Story[]
  }>(`/stories/user/${userId}`)
  
  return response.data
}

// Get single story
export const getStory = async (storyId: string) => {
  const response = await apiClient.get<{
    success: boolean
    data: Story
  }>(`/stories/${storyId}`)
  
  return response.data
}

// Create story with media
export const createStory = async (data: CreateStoryData) => {
  const formData = new FormData()
  
  if (data.content) {
    formData.append('content', data.content)
  }
  
  if (data.media) {
    data.media.forEach((file) => {
      formData.append('media', file)
    })
  }
  
  if (data.privacy) {
    formData.append('privacy', data.privacy)
  }
  
  if (data.location) {
    formData.append('location', JSON.stringify(data.location))
  }
  
  if (data.tags) {
    formData.append('tags', JSON.stringify(data.tags))
  }
  
  if (data.eventId) {
    formData.append('event', data.eventId)
  }
  
  /* 
  /* 
   * IMPORTANT: We must explicitly set Content-Type to undefined/null to let the browser
   * set the correct multipart/form-data header with the boundary.
   * The apiClient has a default 'application/json' which must be overridden.
   */
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: Story
  }>('/stories', formData, {
    headers: {
      'Content-Type': undefined 
    } as any 
  })
  
  return response.data
}

// Create text story
export const createTextStory = async (data: CreateTextStoryData) => {
  const payload = {
    content: data.content,
    privacy: data.privacy,
    style: {
      backgroundColor: data.backgroundColor,
      textColor: data.textColor,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily
    }
  }

  const response = await apiClient.post<{
    success: boolean
    message: string
    data: Story
  }>('/stories', payload)
  
  return response.data
}

// View story
export const viewStory = async (storyId: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: {
      storyId: string
      viewCount: number
    }
  }>(`/stories/${storyId}/view`)
  
  return response.data
}

// React to story
export const reactToStory = async (storyId: string, type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry') => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: {
      storyId: string
      reactions: StoryReaction[]
      reactionCount: number
    }
  }>(`/stories/${storyId}/react`, { type })
  
  return response.data
}

// Remove reaction from story
export const removeStoryReaction = async (storyId: string) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
    data: {
      storyId: string
      reactionCount: number
    }
  }>(`/stories/${storyId}/react`)
  
  return response.data
}

// Reply to story
export const replyToStory = async (storyId: string, content: string) => {
  const response = await apiClient.post<{
    success: boolean
    data: StoryReply
  }>(`/stories/${storyId}/reply`, { reply: content })
  
  return response.data
}

// Get story replies
export const getStoryReplies = async (storyId: string) => {
  const response = await apiClient.get<{
    success: boolean
    replies: StoryReply[]
  }>(`/stories/${storyId}/replies`)
  
  return response.data
}

// Delete story
export const deleteStory = async (storyId: string) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
  }>(`/stories/${storyId}`)
  
  return response.data
}

// Utility functions
export const getTimeRemaining = (expiresAt: Date): number => {
  const now = new Date()
  const expiry = new Date(expiresAt)
  return Math.max(0, expiry.getTime() - now.getTime())
}

export const formatTimeRemaining = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  
  if (minutes > 0) {
    return `${minutes}m`
  }
  
  return '<1m'
}

export const isStoryExpired = (expiresAt: Date): boolean => {
  return new Date(expiresAt) <= new Date()
}

export const getStoryProgress = (createdAt: Date, expiresAt: Date): number => {
  const created = new Date(createdAt).getTime()
  const expires = new Date(expiresAt).getTime()
  const now = Date.now()
  
  const total = expires - created
  const elapsed = now - created
  
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

export const canUploadVideo = (file: File): boolean => {
  // Check if it's a video
  if (!file.type.startsWith('video/')) return false
  
  // Check file size (max 50MB for videos)
  const maxSize = 50 * 1024 * 1024 // 50MB
  return file.size <= maxSize
}

export const canUploadImage = (file: File): boolean => {
  // Check if it's an image
  if (!file.type.startsWith('image/')) return false
  
  // Check file size (max 10MB for images)
  const maxSize = 10 * 1024 * 1024 // 10MB
  return file.size <= maxSize
}

export const validateStoryMedia = (files: File[]): { valid: boolean; error?: string } => {
  if (files.length === 0) {
    return { valid: true }
  }
  
  if (files.length > 5) {
    return { valid: false, error: 'No puedes subir más de 5 archivos por historia' }
  }
  
  for (const file of files) {
    if (file.type.startsWith('image/') && !canUploadImage(file)) {
      return { valid: false, error: `La imagen ${file.name} es demasiado grande (máximo 10MB)` }
    }
    
    if (file.type.startsWith('video/') && !canUploadVideo(file)) {
      return { valid: false, error: `El video ${file.name} es demasiado grande (máximo 50MB)` }
    }
    
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return { valid: false, error: `${file.name} no es un archivo de imagen o video válido` }
    }
  }
  
  return { valid: true }
}