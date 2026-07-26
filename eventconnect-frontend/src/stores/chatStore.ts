'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatRoom, ChatMessage, ChatParticipant } from '@/types/api.types'

interface ChatState {
  rooms: ChatRoom[]
  currentRoom: ChatRoom | null
  messages: Record<string, ChatMessage[]>
  typingUsers: Record<string, string[]> // roomId -> userIds
  onlineUsers: string[]
  unreadCounts: Record<string, number> // roomId -> count
  isLoading: boolean
  error: string | null

  // Actions
  setRooms: (rooms: ChatRoom[]) => void
  addRoom: (room: ChatRoom) => void
  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => void
  setCurrentRoom: (room: ChatRoom | null) => void
  
  setMessages: (roomId: string, messages: ChatMessage[]) => void
  addMessage: (roomId: string, message: ChatMessage) => void
  updateMessage: (roomId: string, messageId: string, updates: Partial<ChatMessage>) => void
  deleteMessage: (roomId: string, messageId: string) => void
  
  setTypingUsers: (roomId: string, userIds: string[]) => void
  addTypingUser: (roomId: string, userId: string) => void
  removeTypingUser: (roomId: string, userId: string) => void
  
  setOnlineUsers: (userIds: string[]) => void
  addOnlineUser: (userId: string) => void
  removeOnlineUser: (userId: string) => void
  
  updateUnreadCount: (roomId: string, count: number) => void
  incrementUnreadCount: (roomId: string) => void
  resetUnreadCount: (roomId: string) => void
  
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      rooms: [],
      currentRoom: null,
      messages: {},
      typingUsers: {},
      onlineUsers: [],
      unreadCounts: {},
      isLoading: false,
      error: null,

      setRooms: (rooms) => set({ rooms }),
      
      addRoom: (room) => set((state) => ({
        rooms: [room, ...state.rooms.filter(r => r._id !== room._id)]
      })),
      
      updateRoom: (roomId, updates) => set((state) => ({
        rooms: state.rooms.map(room => 
          room._id === roomId ? { ...room, ...updates } : room
        ),
        currentRoom: state.currentRoom?._id === roomId 
          ? { ...state.currentRoom, ...updates }
          : state.currentRoom
      })),
      
      setCurrentRoom: (room) => set({ currentRoom: room }),
      
      setMessages: (roomId, messages) => set((state) => ({
        messages: { ...state.messages, [roomId]: messages }
      })),
      
      addMessage: (roomId, message) => set((state) => {
        const roomMessages = state.messages[roomId] || []
        const messageExists = roomMessages.some(m => m._id === message._id)
        
        if (messageExists) {
          return {
            messages: {
              ...state.messages,
              [roomId]: roomMessages.map(m => m._id === message._id ? message : m)
            }
          }
        }
        
        return {
          messages: {
            ...state.messages,
            [roomId]: [...roomMessages, message].sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
          }
        }
      }),
      
      updateMessage: (roomId, messageId, updates) => set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: (state.messages[roomId] || []).map(message =>
            message._id === messageId ? { ...message, ...updates } : message
          )
        }
      })),
      
      deleteMessage: (roomId, messageId) => set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: (state.messages[roomId] || []).filter(message => 
            message._id !== messageId
          )
        }
      })),
      
      setTypingUsers: (roomId, userIds) => set((state) => ({
        typingUsers: { ...state.typingUsers, [roomId]: userIds }
      })),
      
      addTypingUser: (roomId, userId) => set((state) => {
        const currentTyping = state.typingUsers[roomId] || []
        if (currentTyping.includes(userId)) return state
        
        return {
          typingUsers: {
            ...state.typingUsers,
            [roomId]: [...currentTyping, userId]
          }
        }
      }),
      
      removeTypingUser: (roomId, userId) => set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [roomId]: (state.typingUsers[roomId] || []).filter(id => id !== userId)
        }
      })),
      
      setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
      
      addOnlineUser: (userId) => set((state) => ({
        onlineUsers: state.onlineUsers.includes(userId) 
          ? state.onlineUsers 
          : [...state.onlineUsers, userId]
      })),
      
      removeOnlineUser: (userId) => set((state) => ({
        onlineUsers: state.onlineUsers.filter(id => id !== userId)
      })),
      
      updateUnreadCount: (roomId, count) => set((state) => ({
        unreadCounts: { ...state.unreadCounts, [roomId]: count }
      })),
      
      incrementUnreadCount: (roomId) => set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [roomId]: (state.unreadCounts[roomId] || 0) + 1
        }
      })),
      
      resetUnreadCount: (roomId) => set((state) => ({
        unreadCounts: { ...state.unreadCounts, [roomId]: 0 }
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        rooms: state.rooms,
        messages: state.messages,
        unreadCounts: state.unreadCounts,
      }),
    }
  )
)