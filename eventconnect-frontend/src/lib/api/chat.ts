import { apiClient } from './client'

export interface ChatParticipant {
  user: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar: string
    lastSeen?: Date
  }
  joinedAt: Date
  role: 'admin' | 'moderator' | 'member'
  lastSeenAt?: Date
  notifications: boolean
}

export interface Chat {
  _id: string
  chatId: string
  type: 'direct' | 'group' | 'tribe' | 'event'
  name?: string
  description?: string
  avatar?: string
  participants: ChatParticipant[]
  lastMessage?: {
    content: string
    sender: {
      _id: string
      firstName: string
      lastName: string
      username: string
    }
    messageType: string
    timestamp: Date
  }
  settings: {
    allowNewMembers: boolean
    muteAll: boolean
    allowMediaSharing: boolean
    allowLocationSharing: boolean
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  unreadCount?: number
}

export interface MessageReaction {
  user: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar: string
  }
  emoji: string
  createdAt: Date
}

export interface MessageMedia {
  images: Array<{
    url: string
    thumbnail: string
    originalName: string
    size: number
  }>
  files: Array<{
    url: string
    fileName: string
    fileType: string
    size: number
  }>
}

export interface Message {
  _id: string
  sender: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar: string
  }
  receiver?: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar: string
  }
  chatId: string
  chatType: 'direct' | 'group' | 'tribe' | 'event'
  content: string
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'event' | 'tribe'
  media?: MessageMedia
  location?: {
    coordinates: [number, number]
    address: string
  }
  status: 'sent' | 'delivered' | 'read'
  reactions: MessageReaction[]
  replyTo?: {
    _id: string
    content: string
    messageType: string
    sender: {
      _id: string
      firstName: string
      lastName: string
      username: string
    }
  }
  createdAt: Date
  updatedAt: Date
  editedAt?: Date
  isDeleted: boolean
}

export interface CreateGroupChatData {
  name: string
  description?: string
  participantIds: string[]
}

export interface SendMessageData {
  content: string
  messageType?: string
  replyTo?: string
}

// Get user's chats
export const getUserChats = async (page: number = 1, limit: number = 20) => {
  const response = await apiClient.get<{
    success: boolean
    data: Chat[]
    pagination: {
      page: number
      limit: number
      hasMore: boolean
    }
  }>(`/chat/chats?page=${page}&limit=${limit}`)
  
  return response.data
}

// Create direct chat
export const createDirectChat = async (userId: string) => {
  const response = await apiClient.post<{
    success: boolean
    data: Chat
  }>('/chat/direct', { userId })
  
  return response.data
}

// Create group chat
export const createGroupChat = async (data: CreateGroupChatData) => {
  const response = await apiClient.post<{
    success: boolean
    data: Chat
  }>('/chat/group', data)
  
  return response.data
}

// Get chat messages
export const getChatMessages = async (chatId: string, page: number = 1, limit: number = 50) => {
  const response = await apiClient.get<{
    success: boolean
    data: Message[]
    pagination: {
      page: number
      limit: number
      hasMore: boolean
    }
  }>(`/chat/${chatId}/messages?page=${page}&limit=${limit}`)
  
  return response.data
}

// Send text message
export const sendMessage = async (chatId: string, data: SendMessageData) => {
  const response = await apiClient.post<{
    success: boolean
    data: Message
  }>(`/chat/${chatId}/messages`, data)
  
  return response.data
}

// Upload files to chat
export const uploadFiles = async (chatId: string, files: File[], content?: string) => {
  const formData = new FormData()
  
  files.forEach((file) => {
    formData.append('files', file)
  })
  
  if (content) {
    formData.append('content', content)
  }
  
  const response = await apiClient.post<{
    success: boolean
    data: Message
  }>(`/chat/${chatId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data
}

// Add reaction to message
export const addMessageReaction = async (chatId: string, messageId: string, emoji: string) => {
  const response = await apiClient.post<{
    success: boolean
    data: Message
  }>(`/chat/${chatId}/messages/${messageId}/react`, { emoji })
  
  return response.data
}

// Remove reaction from message
export const removeMessageReaction = async (chatId: string, messageId: string) => {
  const response = await apiClient.delete<{
    success: boolean
    data: Message
  }>(`/chat/${chatId}/messages/${messageId}/react`)
  
  return response.data
}

// Mark message as read
export const markMessageAsRead = async (chatId: string, messageId: string) => {
  const response = await apiClient.put<{
    success: boolean
    data: Message
  }>(`/chat/${chatId}/messages/${messageId}/read`)
  
  return response.data
}

// Join chat (for group/tribe/event chats)
export const joinChat = async (chatId: string) => {
  const response = await apiClient.put<{
    success: boolean
    data: Chat
  }>(`/chat/${chatId}/join`)
  
  return response.data
}

// Leave chat
export const leaveChat = async (chatId: string) => {
  const response = await apiClient.put<{
    success: boolean
    message: string
  }>(`/chat/${chatId}/leave`)
  
  return response.data
}

// Update participant role (admin only)
export const updateParticipantRole = async (chatId: string, userId: string, role: 'admin' | 'moderator' | 'member') => {
  const response = await apiClient.put<{
    success: boolean
    message: string
    data: { userId: string; role: string }
  }>(`/chat/${chatId}/participants/${userId}`, { role })
  
  return response.data
}

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType.startsWith('video/')) return '🎥'
  if (fileType.startsWith('audio/')) return '🎵'
  if (fileType === 'application/pdf') return '📄'
  if (fileType.includes('document') || fileType.includes('word')) return '📝'
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊'
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️'
  return '📎'
}

export const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/')
}

export const isVideoFile = (fileType: string): boolean => {
  return fileType.startsWith('video/')
}

export const isAudioFile = (fileType: string): boolean => {
  return fileType.startsWith('audio/')
}