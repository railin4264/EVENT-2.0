'use client'

import { useEffect, useCallback } from 'react'
import { useSocket } from '@/lib/providers/SocketProvider'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import type { ChatMessage, ChatRoom } from '@/types/api.types'

export function useChat() {
  const { user } = useAuthStore()
  const {
    rooms,
    currentRoom,
    messages,
    typingUsers,
    onlineUsers,
    unreadCounts,
    isLoading,
    error,
    addRoom,
    updateRoom,
    setCurrentRoom,
    addMessage,
    updateMessage,
    deleteMessage,
    addTypingUser,
    removeTypingUser,
    addOnlineUser,
    removeOnlineUser,
    incrementUnreadCount,
    resetUnreadCount,
    setError,
    clearError,
  } = useChatStore()

  const { socket, isConnected } = useSocket()

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Message events
    const handleNewMessage = (data: { chatId: string; message: ChatMessage }) => {
      addMessage(data.chatId, data.message)
      
      // Increment unread count if not in current room or window not focused
      if (currentRoom?._id !== data.chatId || document.hidden) {
        incrementUnreadCount(data.chatId)
      }
      
      // Update room's last message
      updateRoom(data.chatId, { lastMessage: data.message })
    }

    // Typing events
    const handleTypingStart = (data: { chatId: string; userId: string }) => {
      if (data.userId !== user?.id) {
        addTypingUser(data.chatId, data.userId)
      }
    }

    const handleTypingStop = (data: { chatId: string; userId: string }) => {
      removeTypingUser(data.chatId, data.userId)
    }

    // User presence events
    const handleUserPresence = (data: { userId: string, status: string }) => {
      if (data.status === 'online') {
        addOnlineUser(data.userId)
      } else {
        removeOnlineUser(data.userId)
      }
    }

    // Error events
    const handleError = (error: { message: string }) => {
      setError(error.message)
    }

    // Attach listeners
    socket.on('newMessage', handleNewMessage)
    socket.on('userTyping', handleTypingStart)
    socket.on('userStoppedTyping', handleTypingStop)
    socket.on('userPresenceUpdate', handleUserPresence)
    socket.on('error', handleError)

    return () => {
      socket.off('newMessage', handleNewMessage)
      socket.off('userTyping', handleTypingStart)
      socket.off('userStoppedTyping', handleTypingStop)
      socket.off('userPresenceUpdate', handleUserPresence)
      socket.off('error', handleError)
    }
  }, [
    socket,
    isConnected,
    addMessage,
    addTypingUser,
    removeTypingUser,
    addOnlineUser,
    removeOnlineUser,
    incrementUnreadCount,
    setError,
    currentRoom,
    user,
    updateRoom
  ])

  // Join current room and leave previous room
  useEffect(() => {
    if (currentRoom && socket && isConnected) {
      socket.emit('joinChat', { chatId: currentRoom._id })
      resetUnreadCount(currentRoom._id)
      
      return () => {
        socket.emit('leaveChat', { chatId: currentRoom._id })
      }
    }
  }, [currentRoom, socket, isConnected, resetUnreadCount])

  // Chat actions
  const selectRoom = useCallback((room: ChatRoom) => {
    if (currentRoom?._id !== room._id) {
      setCurrentRoom(room)
    }
  }, [currentRoom, setCurrentRoom])

  const sendChatMessage = useCallback((content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (currentRoom && content.trim() && socket && isConnected) {
      socket.emit('sendMessage', { 
        chatId: currentRoom._id, 
        content: content.trim(), 
        messageType: type 
      })
    }
  }, [currentRoom, socket, isConnected])

  const handleTypingStart = useCallback(() => {
    if (currentRoom && socket && isConnected) {
      socket.emit('typing', { chatId: currentRoom._id })
    }
  }, [currentRoom, socket, isConnected])

  const handleTypingStop = useCallback(() => {
    if (currentRoom && socket && isConnected) {
      socket.emit('stopTyping', { chatId: currentRoom._id })
    }
  }, [currentRoom, socket, isConnected])

  const markMessageAsRead = useCallback((messageId: string) => {
    if (currentRoom && socket && isConnected) {
      socket.emit('markAsRead', { chatId: currentRoom._id, messageId })
    }
  }, [currentRoom, socket, isConnected])

  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0)
  }, [unreadCounts])

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.includes(userId)
  }, [onlineUsers])

  const getTypingUsersForRoom = useCallback((roomId: string) => {
    return typingUsers[roomId] || []
  }, [typingUsers])

  const getRoomMessages = useCallback((roomId: string) => {
    return messages[roomId] || []
  }, [messages])

  const getRoomUnreadCount = useCallback((roomId: string) => {
    return unreadCounts[roomId] || 0
  }, [unreadCounts])

  return {
    // State
    rooms,
    currentRoom,
    isLoading,
    error,
    
    // Actions
    selectRoom,
    sendChatMessage,
    handleTypingStart,
    handleTypingStop,
    markMessageAsRead,
    clearError,
    
    // Utilities
    getTotalUnreadCount,
    isUserOnline,
    getTypingUsersForRoom,
    getRoomMessages,
    getRoomUnreadCount,
    addRoom
  }
}