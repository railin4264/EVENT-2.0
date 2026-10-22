'use client'

import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '@/lib/constants'

class SocketClient {
  private socket: Socket | null = null
  private token: string | null = null

  connect(authToken: string) {
    if (this.socket && this.token === authToken) return this.socket
    this.disconnect()
    this.token = authToken
    this.socket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['polling', 'websocket'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      timeout: 10000,
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
      this.socket.emit('joinChat', { chatId: roomId })
    }
  }

  leaveChatRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leaveChat', { chatId: roomId })
    }
  }

  sendMessage(roomId: string, message: string) {
    if (this.socket) {
      this.socket.emit('sendMessage', { chatId: roomId, content: message, messageType: 'text' })
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