import { apiClient } from './client'

export interface NotificationData {
  _id: string
  recipient: string
  sender?: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar?: string
    verified?: boolean
  }
  type: 'follow' | 'follow_request' | 'event_invite' | 'event_reminder' | 'event_update' | 'comment' | 'like' | 'tribe_invite' | 'system' | 'welcome'
  title: string
  message: string
  data: Record<string, any>
  read: boolean
  readAt?: string
  actionUrl?: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

export interface NotificationsResponse {
  success: boolean
  data: {
    notifications: NotificationData[]
    unreadCount: number
    totalCount: number
    pagination: {
      page: number
      limit: number
      hasMore: boolean
    }
  }
}

export interface UnreadCountResponse {
  success: boolean
  data: {
    unreadCount: number
  }
}

// Get user notifications with optional filtering
export const getNotifications = async (params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
  type?: NotificationData['type']
}) => {
  const queryParams = new URLSearchParams()
  
  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.unreadOnly) queryParams.append('unreadOnly', params.unreadOnly.toString())
  if (params?.type) queryParams.append('type', params.type)

  const response = await apiClient.get<NotificationsResponse>(
    `/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  )
  
  return response.data
}

// Get unread notifications count
export const getUnreadCount = async () => {
  const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
  return response.data
}

// Mark a specific notification as read
export const markAsRead = async (notificationId: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: { notification: NotificationData }
  }>(`/notifications/${notificationId}/read`)
  
  return response.data
}

// Mark all notifications as read
export const markAllAsRead = async () => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: { modifiedCount: number }
  }>('/notifications/mark-all-read')
  
  return response.data
}

// Mark multiple notifications as read
export const markBatchAsRead = async (notificationIds: string[]) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: { modifiedCount: number }
  }>('/notifications/batch-read', { notificationIds })
  
  return response.data
}

// Delete a notification
export const deleteNotification = async (notificationId: string) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
  }>(`/notifications/${notificationId}`)
  
  return response.data
}

// Delete multiple notifications
export const deleteBatchNotifications = async (notificationIds: string[]) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
    data: { deletedCount: number }
  }>('/notifications/batch-delete', { data: { notificationIds } })
  
  return response.data
}

// Create test notifications (development only)
export const createTestNotifications = async () => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: { notifications: NotificationData[] }
  }>('/notifications/test')
  
  return response.data
}

// Utility functions
export const formatNotificationTime = (createdAt: string): string => {
  const now = new Date()
  const notificationTime = new Date(createdAt)
  const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'hace un momento'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} min${diffInMinutes !== 1 ? '' : ''}`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `hace ${diffInWeeks} semana${diffInWeeks !== 1 ? 's' : ''}`
  }

  return notificationTime.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const getNotificationIcon = (type: NotificationData['type']): string => {
  const iconMap: Record<NotificationData['type'], string> = {
    follow: '👥',
    follow_request: '👤',
    event_invite: '🎫',
    event_reminder: '⏰',
    event_update: '📅',
    comment: '💬',
    like: '❤️',
    tribe_invite: '🏘️',
    system: '⚙️',
    welcome: '👋'
  }
  
  return iconMap[type] || '📱'
}

export const getNotificationColor = (type: NotificationData['type']): string => {
  const colorMap: Record<NotificationData['type'], string> = {
    follow: 'text-blue-600 bg-blue-50',
    follow_request: 'text-purple-600 bg-purple-50',
    event_invite: 'text-green-600 bg-green-50',
    event_reminder: 'text-orange-600 bg-orange-50',
    event_update: 'text-yellow-600 bg-yellow-50',
    comment: 'text-indigo-600 bg-indigo-50',
    like: 'text-red-600 bg-red-50',
    tribe_invite: 'text-teal-600 bg-teal-50',
    system: 'text-gray-600 bg-gray-50',
    welcome: 'text-pink-600 bg-pink-50'
  }
  
  return colorMap[type] || 'text-gray-600 bg-gray-50'
}

export const getPriorityColor = (priority: NotificationData['priority']): string => {
  const priorityMap: Record<NotificationData['priority'], string> = {
    low: 'border-l-gray-300',
    medium: 'border-l-blue-400',
    high: 'border-l-red-400'
  }
  
  return priorityMap[priority] || 'border-l-gray-300'
}

export const groupNotificationsByDate = (notifications: NotificationData[]) => {
  const groups: Record<string, NotificationData[]> = {}
  
  notifications.forEach(notification => {
    const date = new Date(notification.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let groupKey: string
    
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Hoy'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Ayer'
    } else {
      groupKey = date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    
    groups[groupKey].push(notification)
  })
  
  return groups
}

export const filterNotificationsByType = (
  notifications: NotificationData[], 
  types: NotificationData['type'][]
) => {
  if (types.length === 0) return notifications
  return notifications.filter(notification => types.includes(notification.type))
}

export const sortNotificationsByPriority = (notifications: NotificationData[]) => {
  const priorityOrder = { high: 3, medium: 2, low: 1 }
  
  return [...notifications].sort((a, b) => {
    // First sort by read status (unread first)
    if (!a.read && b.read) return -1
    if (a.read && !b.read) return 1
    
    // Then by priority
    const aPriority = priorityOrder[a.priority]
    const bPriority = priorityOrder[b.priority]
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    // Finally by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}