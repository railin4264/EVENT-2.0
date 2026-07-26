// ============================================================
// CHAT SERVICE
// Handles all chat/messaging-related API calls
// ============================================================

import { apiClient } from '../client'
import { API_ENDPOINTS } from '@/lib/config'
import type {
  Conversation,
  Message,
  SendMessageRequest,
  ApiResponse,
} from '@/types/models'

class ChatService {
  /**
   * Get all conversations for current user
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<ApiResponse<Conversation[]>>(
      API_ENDPOINTS.CHAT.CONVERSATIONS
    )

    return response.data.data || []
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string): Promise<Conversation> {
    const response = await apiClient.get<ApiResponse<Conversation>>(
      API_ENDPOINTS.CHAT.CONVERSATION(id)
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Conversation not found')
  }

  /**
   * Create a new conversation
   */
  async createConversation(participantIds: string[]): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>(
      API_ENDPOINTS.CHAT.CREATE_CONVERSATION,
      { participants: participantIds }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to create conversation')
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>(
      API_ENDPOINTS.CHAT.MESSAGES(conversationId),
      { params: { page, limit } }
    )

    return response.data.data || []
  }

  /**
   * Send a message
   */
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>(
      API_ENDPOINTS.CHAT.SEND_MESSAGE,
      data
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to send message')
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CHAT.DELETE_MESSAGE(id))
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Format message time
   */
  formatMessageTime(date: Date): string {
    const messageDate = new Date(date)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)

    // Less than 1 minute
    if (diffInSeconds < 60) {
      return 'just now'
    }

    // Less than 1 hour
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`
    }

    // Today
    if (this.isSameDay(messageDate, now)) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    }

    // This week
    const diffInDays = Math.floor(diffInSeconds / (60 * 60 * 24))
    if (diffInDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' })
    }

    // Older
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  /**
   * Group messages by date
   */
  groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
    const groups = new Map<string, Message[]>()

    messages.forEach((message) => {
      const date = new Date(message.createdAt)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let key: string

      if (this.isSameDay(date, today)) {
        key = 'Today'
      } else if (this.isSameDay(date, yesterday)) {
        key = 'Yesterday'
      } else {
        key = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }

      groups.get(key)!.push(message)
    })

    return groups
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: Message, currentUserId: string): boolean {
    const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id
    return senderId === currentUserId
  }

  /**
   * Get conversation preview text
   */
  getConversationPreview(conversation: Conversation): string {
    if (!conversation.lastMessage) {
      return 'No messages yet'
    }

    const content = conversation.lastMessage.content
    const maxLength = 50

    if (content.length <= maxLength) {
      return content
    }

    return `${content.substring(0, maxLength)}...`
  }

  /**
   * Get conversation title (for group chats)
   */
  getConversationTitle(conversation: Conversation, currentUserId: string): string {
    const otherParticipants = conversation.participants.filter((p) => {
      const id = typeof p === 'string' ? p : p._id
      return id !== currentUserId
    })

    if (otherParticipants.length === 0) {
      return 'You'
    }

    if (otherParticipants.length === 1) {
      const participant = otherParticipants[0]
      if (typeof participant === 'string') {
        return 'User'
      }
      return `${participant.firstName} ${participant.lastName}`
    }

    return `${otherParticipants.length} people`
  }

  /**
   * Sort conversations by last message time
   */
  sortConversations(conversations: Conversation[]): Conversation[] {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
      return bTime - aTime
    })
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
export const chatService = new ChatService()
