'use client'

import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '@/lib/constants'

class SocketManager {
  private socket: Socket | null = null
  private token: string | null = null
  private listeners = new Map<string, ((...args: any[]) => void)[]>()

  connect(token: string) {
    if (this.socket?.connected) {
      this.disconnect()
    }

    this.token = token
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    })

    this.setupEventHandlers()
    this.reattachListeners()
    
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)

    if (this.socket) {
      this.socket.on(event, callback as any)
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        const index = eventListeners.indexOf(callback)
        if (index > -1) {
          eventListeners.splice(index, 1)
        }
      }
      if (this.socket) {
        this.socket.off(event, callback as any)
      }
    } else {
      this.listeners.delete(event)
      if (this.socket) {
        this.socket.off(event)
      }
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      // Only log in development to reduce console spam
      if (process.env.NODE_ENV === 'development') {
        console.warn('Socket is not connected. Cannot emit event:', event)
      }
    }
  }

  // Chat methods
  joinRoom(roomId: string) {
    this.emit('join_room', { roomId })
  }

  leaveRoom(roomId: string) {
    this.emit('leave_room', { roomId })
  }

  sendMessage(roomId: string, message: string, type: 'text' | 'image' | 'file' = 'text') {
    this.emit('send_message', {
      roomId,
      content: message,
      type,
    })
  }

  startTyping(roomId: string) {
    this.emit('typing_start', { roomId })
  }

  stopTyping(roomId: string) {
    this.emit('typing_stop', { roomId })
  }

  markAsRead(roomId: string, messageId: string) {
    this.emit('mark_as_read', { roomId, messageId })
  }

  // Notification methods
  markNotificationAsRead(notificationId: string) {
    this.emit('mark_notification_read', { notificationId })
  }

  // Event methods
  subscribeToEventUpdates(eventId: string) {
    this.emit('subscribe_event', { eventId })
  }

  unsubscribeFromEventUpdates(eventId: string) {
    this.emit('unsubscribe_event', { eventId })
  }

  // User presence methods
  updatePresence(status: 'online' | 'away' | 'busy' | 'offline') {
    this.emit('presence_update', { status })
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Connected to server')
      }
    })

    this.socket.on('disconnect', (reason) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Disconnected from server:', reason)
      }
    })

    this.socket.on('connect_error', (error) => {
      // Only log socket errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Connection error:', error)
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Reconnected to server, attempt:', attemptNumber)
      }
    })

    this.socket.on('reconnect_error', (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Reconnection error:', error)
      }
    })
  }

  private reattachListeners() {
    if (!this.socket) return

    this.listeners.forEach((callbacks, event) => {
      for (const callback of callbacks) {
        this.socket!.on(event, callback as any)
      }
    })
  }
}

// Export singleton instance
export const socketManager = new SocketManager()
export default socketManager