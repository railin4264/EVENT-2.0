'use client'

import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '@/lib/constants'

class SocketClient {
  private socket: Socket | null = null
  private token: string | null = null

  connect(authToken: string) {
    if (this.socket?.connected) {
      return this.socket
    }

    this.token = authToken
    this.socket = io(SOCKET_URL, {
      auth: {
        token: authToken
      },
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO server')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Socket.IO server:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO connection error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.token = null
    }
  }

  getSocket() {
    return this.socket
  }

  isConnected() {
    return this.socket?.connected || false
  }

  // Event-specific methods
  joinEventRoom(eventId: string) {
    if (this.socket) {
      this.socket.emit('join_event', { eventId })
    }
  }

  leaveEventRoom(eventId: string) {
    if (this.socket) {
      this.socket.emit('leave_event', { eventId })
    }
  }

  // Chat methods
  joinChatRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('join_room', { roomId })
    }
  }

  leaveChatRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leave_room', { roomId })
    }
  }

  sendMessage(roomId: string, message: string) {
    if (this.socket) {
      this.socket.emit('send_message', { roomId, message })
    }
  }

  // Tribe methods
  joinTribeRoom(tribeId: string) {
    if (this.socket) {
      this.socket.emit('join_tribe', { tribeId })
    }
  }

  leaveTribeRoom(tribeId: string) {
    if (this.socket) {
      this.socket.emit('leave_tribe', { tribeId })
    }
  }
}

export const socketClient = new SocketClient()
export default socketClient