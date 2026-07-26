'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as notificationsAPI from '@/lib/api/notifications'
import type { NotificationData } from '@/lib/api/notifications'

interface NotificationsState {
  // Data
  notifications: NotificationData[]
  unreadCount: number
  
  // UI State
  isLoading: boolean
  error: string | null
  hasMore: boolean
  currentPage: number
  
  // Filters
  selectedTypes: NotificationData['type'][]
  showUnreadOnly: boolean
  
  // Actions
  fetchNotifications: (page?: number, reset?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  markBatchAsRead: (notificationIds: string[]) => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  deleteBatchNotifications: (notificationIds: string[]) => Promise<void>
  createTestNotifications: () => Promise<void>
  
  // Real-time actions
  addNotification: (notification: NotificationData) => void
  updateNotification: (notificationId: string, updates: Partial<NotificationData>) => void
  removeNotification: (notificationId: string) => void
  setUnreadCount: (count: number) => void
  
  // UI actions
  setSelectedTypes: (types: NotificationData['type'][]) => void
  setShowUnreadOnly: (showUnreadOnly: boolean) => void
  clearError: () => void
  reset: () => void
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      hasMore: true,
      currentPage: 1,
      selectedTypes: [],
      showUnreadOnly: false,

      // Actions
      fetchNotifications: async (page = 1, reset = false) => {
        const state = get()
        
        if (state.isLoading) return
        
        set({ 
          isLoading: true, 
          error: null,
          ...(reset && { notifications: [], currentPage: 1 })
        })

        try {
          const response = await notificationsAPI.getNotifications({
            page,
            limit: 20,
            unreadOnly: state.showUnreadOnly || undefined,
            type: state.selectedTypes.length === 1 ? state.selectedTypes[0] : undefined
          })

          const newNotifications = response.data.notifications
          
          set(state => ({
            notifications: reset 
              ? newNotifications
              : [...state.notifications, ...newNotifications],
            unreadCount: response.data.unreadCount,
            hasMore: response.data.pagination.hasMore,
            currentPage: page,
            isLoading: false
          }))
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al cargar notificaciones',
            isLoading: false
          })
        }
      },

      fetchUnreadCount: async () => {
        try {
          const response = await notificationsAPI.getUnreadCount()
          set({ unreadCount: response.data.unreadCount })
        } catch (error) {
          console.error('Error fetching unread count:', error)
        }
      },

      markAsRead: async (notificationId: string) => {
        const state = get()
        const notification = state.notifications.find(n => n._id === notificationId)
        
        if (!notification || notification.read) return

        // Optimistic update
        set(state => ({
          notifications: state.notifications.map(n =>
            n._id === notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }))

        try {
          await notificationsAPI.markAsRead(notificationId)
        } catch (error: any) {
          // Revert optimistic update
          set(state => ({
            notifications: state.notifications.map(n => {
              if (n._id === notificationId) {
                const { readAt, ...rest } = n
                return { ...rest, read: false }
              }
              return n
            }),
            unreadCount: state.unreadCount + 1,
            error: error.response?.data?.message || 'Error al marcar como leída'
          }))
        }
      },

      markAllAsRead: async () => {
        const state = get()
        const unreadNotifications = state.notifications.filter(n => !n.read)
        
        if (unreadNotifications.length === 0) return

        // Optimistic update
        set(state => ({
          notifications: state.notifications.map(n => ({
            ...n,
            read: true,
            readAt: n.read ? n.readAt : new Date().toISOString()
          })),
          unreadCount: 0
        }))

        try {
          await notificationsAPI.markAllAsRead()
        } catch (error: any) {
          // Revert optimistic update
          set(state => ({
            notifications: state.notifications.map(n => {
              const wasUnread = unreadNotifications.find(un => un._id === n._id)
              if (wasUnread) {
                const { readAt, ...rest } = n
                return { ...rest, read: false }
              }
              return n
            }),
            unreadCount: unreadNotifications.length,
            error: error.response?.data?.message || 'Error al marcar todas como leídas'
          }))
        }
      },

      markBatchAsRead: async (notificationIds: string[]) => {
        const state = get()
        const targetNotifications = state.notifications.filter(n => 
          notificationIds.includes(n._id) && !n.read
        )
        
        if (targetNotifications.length === 0) return

        // Optimistic update
        set(state => ({
          notifications: state.notifications.map(n =>
            notificationIds.includes(n._id) && !n.read
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          ),
          unreadCount: Math.max(0, state.unreadCount - targetNotifications.length)
        }))

        try {
          await notificationsAPI.markBatchAsRead(notificationIds)
        } catch (error: any) {
          // Revert optimistic update
          set(state => ({
            notifications: state.notifications.map(n => {
              const wasTarget = targetNotifications.find(tn => tn._id === n._id)
              if (wasTarget) {
                const { readAt, ...rest } = n
                return { ...rest, read: false }
              }
              return n
            }),
            unreadCount: state.unreadCount + targetNotifications.length,
            error: error.response?.data?.message || 'Error al marcar como leídas'
          }))
        }
      },

      deleteNotification: async (notificationId: string) => {
        const state = get()
        const notification = state.notifications.find(n => n._id === notificationId)
        
        if (!notification) return

        // Optimistic update
        set(state => ({
          notifications: state.notifications.filter(n => n._id !== notificationId),
          unreadCount: notification.read ? state.unreadCount : Math.max(0, state.unreadCount - 1)
        }))

        try {
          await notificationsAPI.deleteNotification(notificationId)
        } catch (error: any) {
          // Revert optimistic update
          set(state => ({
            notifications: [...state.notifications, notification].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
            unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
            error: error.response?.data?.message || 'Error al eliminar notificación'
          }))
        }
      },

      deleteBatchNotifications: async (notificationIds: string[]) => {
        const state = get()
        const targetNotifications = state.notifications.filter(n => 
          notificationIds.includes(n._id)
        )
        
        if (targetNotifications.length === 0) return

        const unreadCount = targetNotifications.filter(n => !n.read).length

        // Optimistic update
        set(state => ({
          notifications: state.notifications.filter(n => !notificationIds.includes(n._id)),
          unreadCount: Math.max(0, state.unreadCount - unreadCount)
        }))

        try {
          await notificationsAPI.deleteBatchNotifications(notificationIds)
        } catch (error: any) {
          // Revert optimistic update
          set(state => ({
            notifications: [...state.notifications, ...targetNotifications].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
            unreadCount: state.unreadCount + unreadCount,
            error: error.response?.data?.message || 'Error al eliminar notificaciones'
          }))
        }
      },

      createTestNotifications: async () => {
        try {
          await notificationsAPI.createTestNotifications()
          // Refresh notifications to get the new ones
          get().fetchNotifications(1, true)
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al crear notificaciones de prueba'
          })
        }
      },

      // Real-time actions
      addNotification: (notification: NotificationData) => {
        set(state => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
        }))
      },

      updateNotification: (notificationId: string, updates: Partial<NotificationData>) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n._id === notificationId ? { ...n, ...updates } : n
          ),
          unreadCount: updates.read === true 
            ? Math.max(0, state.unreadCount - 1)
            : updates.read === false
            ? state.unreadCount + 1
            : state.unreadCount
        }))
      },

      removeNotification: (notificationId: string) => {
        set(state => {
          const notification = state.notifications.find(n => n._id === notificationId)
          return {
            notifications: state.notifications.filter(n => n._id !== notificationId),
            unreadCount: notification && !notification.read 
              ? Math.max(0, state.unreadCount - 1) 
              : state.unreadCount
          }
        })
      },

      setUnreadCount: (count: number) => {
        set({ unreadCount: Math.max(0, count) })
      },

      // UI actions
      setSelectedTypes: (types: NotificationData['type'][]) => {
        set({ selectedTypes: types })
        // Refresh notifications with new filter
        get().fetchNotifications(1, true)
      },

      setShowUnreadOnly: (showUnreadOnly: boolean) => {
        set({ showUnreadOnly })
        // Refresh notifications with new filter
        get().fetchNotifications(1, true)
      },

      clearError: () => {
        set({ error: null })
      },

      reset: () => {
        set({
          notifications: [],
          unreadCount: 0,
          isLoading: false,
          error: null,
          hasMore: true,
          currentPage: 1,
          selectedTypes: [],
          showUnreadOnly: false
        })
      }
    }),
    {
      name: 'notifications-storage',
      partialize: (state) => ({
        // Only persist unread count and selected filters
        unreadCount: state.unreadCount,
        selectedTypes: state.selectedTypes,
        showUnreadOnly: state.showUnreadOnly
      })
    }
  )
)

// Selectors
export const useUnreadCount = () => {
  return useNotificationsStore((state) => state.unreadCount)
}

export const useNotificationsByType = (type?: NotificationData['type']) => {
  return useNotificationsStore((state) => 
    type 
      ? state.notifications.filter(n => n.type === type)
      : state.notifications
  )
}

export const useUnreadNotifications = () => {
  return useNotificationsStore((state) => 
    state.notifications.filter(n => !n.read)
  )
}