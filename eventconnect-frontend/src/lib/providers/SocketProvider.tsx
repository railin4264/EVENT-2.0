'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Socket } from 'socket.io-client'
import { socketClient } from '@/lib/socket/client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  eventId?: string
  userId?: string
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { token, isAuthenticated } = useAuthStore()

  useEffect(() => {
    setNotifications([])
    try { localStorage.removeItem('chat-storage') } catch {}
    if (isAuthenticated && token) {
      const socketInstance = socketClient.connect(token)
      setSocket(socketInstance)

      setIsConnected(socketInstance.connected)
      socketInstance.on('connect_error', () => setIsConnected(false))

      // Connection handlers
      socketInstance.on('connect', () => {
        setIsConnected(true)

      })

      socketInstance.on('disconnect', () => {
        setIsConnected(false)

      })

      socketInstance.on('newNotification', data => {
        const notification = data.notification || data
        if (notification?._id) useNotificationsStore.getState().addNotification(notification)
      })
      socketInstance.on('unreadCountUpdate', data => {
        if (typeof data?.unreadCount === 'number') useNotificationsStore.getState().setUnreadCount(data.unreadCount)
      })
      // Real-time notification handlers
      socketInstance.on('notification', (data: any) => {
        addNotification({
          type: data.type || 'info',
          title: data.title,
          message: data.message,
          eventId: data.eventId,
          userId: data.userId
        })
      })

      // Event updates
      socketInstance.on('event_updated', (data: any) => {
        addNotification({
          type: 'info',
          title: 'Evento actualizado',
          message: `El evento "${data.title}" ha sido actualizado`,
          eventId: data.eventId
        })
      })

      // New event attendance
      socketInstance.on('new_attendee', (data: any) => {
        addNotification({
          type: 'success',
          title: 'Nuevo asistente',
          message: `${data.user.firstName} se unió al evento "${data.event.title}"`,
          eventId: data.eventId
        })
      })

      // Chat message received
      socketInstance.on('message_received', (data: any) => {
        addNotification({
          type: 'info',
          title: 'Nuevo mensaje',
          message: `${data.sender.firstName}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`,
          eventId: data.roomId
        })
      })

      // Tribe updates
      socketInstance.on('tribe_updated', (data: any) => {
        addNotification({
          type: 'info',
          title: 'Tribu actualizada',
          message: `La tribu "${data.name}" ha sido actualizada`
        })
      })

      return () => {
        socketInstance.removeAllListeners()
        socketClient.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, token])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36),
      timestamp: new Date()
    }
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Keep max 50 notifications
    
    // Auto-remove after 5 seconds for non-critical notifications
    if (notification.type === 'info' || notification.type === 'success') {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, 5000)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      notifications,
      addNotification,
      removeNotification,
      clearNotifications
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}