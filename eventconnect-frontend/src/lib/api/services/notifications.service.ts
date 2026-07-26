// ============================================================
// NOTIFICATIONS SERVICE
// Handles all notification-related API calls
// ============================================================

import { apiClient } from '../client'
import { API_ENDPOINTS } from '@/lib/config'
import type { Notification, ApiResponse } from '@/types/models'

class NotificationsService {
  /**
   * Get all notifications for current user
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<Notification[]> {
    const response = await apiClient.get<ApiResponse<Notification[]>>(
      API_ENDPOINTS.NOTIFICATIONS.LIST,
      { params: { page, limit } }
    )

    return response.data.data || []
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(
      API_ENDPOINTS.NOTIFICATIONS.UNREAD
    )

    return response.data.data?.count || 0
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.READ(id))
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.READ_ALL)
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id))
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: Notification['type']): string {
    const icons: Record<Notification['type'], string> = {
      event_invite: '🎉',
      new_follower: '👤',
      event_reminder: '⏰',
      achievement: '🏆',
      tribe_invite: '👥',
      event_update: '📢',
      like: '❤️',
      comment: '💬',
      event_cancelled: '❌',
      event_starting_soon: '⏰',
    }

    return icons[type] || '🔔'
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type: Notification['type']): string {
    const colors: Record<Notification['type'], string> = {
      event_invite: 'blue',
      new_follower: 'green',
      event_reminder: 'orange',
      achievement: 'yellow',
      tribe_invite: 'purple',
      event_update: 'blue',
      like: 'red',
      comment: 'blue',
      event_cancelled: 'red',
      event_starting_soon: 'orange',
    }

    return colors[type] || 'gray'
  }

  /**
   * Format notification time ago
   */
  formatTimeAgo(date: Date): string {
    const now = new Date()
    const createdAt = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'just now'
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays}d ago`
    }

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) {
      return `${diffInWeeks}w ago`
    }

    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths}mo ago`
  }

  /**
   * Group notifications by date
   */
  groupNotificationsByDate(notifications: Notification[]): Map<string, Notification[]> {
    const groups = new Map<string, Notification[]>()

    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let key: string

      if (this.isSameDay(date, today)) {
        key = 'Today'
      } else if (this.isSameDay(date, yesterday)) {
        key = 'Yesterday'
      } else {
        key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }

      groups.get(key)!.push(notification)
    })

    return groups
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService()
