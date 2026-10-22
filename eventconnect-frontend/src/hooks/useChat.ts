'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useSocket } from '@/lib/providers/SocketProvider'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { getUserChats, getChatMessages, sendMessage } from '@/lib/api/chat'
import type { ChatMessage, ChatRoom } from '@/types/api.types'

const wireId = (room: ChatRoom) => room.chatId || room._id
function normalizeMessage(message: any, roomId: string): ChatMessage {
  return { ...message, room: roomId, type: message.type || message.messageType, createdAt: message.createdAt || message.timestamp }
}
export function useChat() {
  const user = useAuthStore(state => state.user)
  const viewer = user?._id || user?.id || null
  const state = useChatStore()
  const { socket, isConnected } = useSocket()
  const [isSending, setIsSending] = useState(false)
  const [hasMoreRooms, setHasMoreRooms] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const roomPage = useRef(1)
  const messagePage = useRef(1)
  const sending = useRef(false)
  const roomsRequest = useRef(0)
  const historyRequest = useRef(0)
  const { currentRoom } = state
  const reloadRooms = useCallback(async (more = false) => {
    if (!viewer) return
    const request = ++roomsRequest.current
    const page = more ? roomPage.current + 1 : 1
    useChatStore.getState().setLoading(true)
    try {
      const result = await getUserChats(page, 50)
      if (roomsRequest.current !== request || useChatStore.getState().ownerId !== viewer) return
      if (!result.success) throw new Error()
      const fetched = result.data.map(room => ({ ...room, lastMessage: room.lastMessage ? normalizeMessage(room.lastMessage, room._id) : undefined })) as unknown as ChatRoom[]
      const store = useChatStore.getState()
      store.setRooms(more ? [...store.rooms.filter(room => !fetched.some(item => item._id === room._id)), ...fetched] : fetched)
      fetched.forEach(room => store.updateUnreadCount(room._id, room.unreadCount || 0))
      roomPage.current = page; setHasMoreRooms(Boolean(result.pagination.hasMore)); store.clearError()
    } catch { if (useChatStore.getState().ownerId === viewer) useChatStore.getState().setError('No se pudieron cargar tus conversaciones. Puedes reintentar.') }
    finally { if (roomsRequest.current === request && useChatStore.getState().ownerId === viewer) useChatStore.getState().setLoading(false) }
  }, [viewer])

  useEffect(() => {
    useChatStore.getState().setOwner(viewer)
    if (viewer) void reloadRooms()
    return () => { roomsRequest.current++; historyRequest.current++ }
  }, [viewer, reloadRooms])

  const loadHistory = useCallback(async (more = false) => {
    if (!currentRoom || !viewer) return
    const request = ++historyRequest.current
    const page = more ? messagePage.current + 1 : 1
    const id = currentRoom._id
    try {
      const result = await getChatMessages(wireId(currentRoom), page)
      if (request !== historyRequest.current || useChatStore.getState().ownerId !== viewer) return
      if (!result.success) throw new Error()
      const store = useChatStore.getState()
      // Merge server history with messages received while the request was in flight.
      const merged = new Map((store.messages[id] || []).map(message => [message._id, message]))
      result.data.forEach(message => merged.set(message._id, normalizeMessage(message, id)))
      store.setMessages(id, [...merged.values()].sort((a,b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)))
      messagePage.current = page; setHasMoreMessages(Boolean(result.pagination.hasMore))
    } catch { if (useChatStore.getState().ownerId === viewer) useChatStore.getState().setError('No se pudo cargar el historial. Tu mensaje escrito se conserva.') }
  }, [currentRoom?._id, currentRoom?.chatId, viewer])

  useEffect(() => {
    messagePage.current = 1; setHasMoreMessages(false)
    void loadHistory()
    return () => { historyRequest.current++ }
  }, [loadHistory, isConnected])

  useEffect(() => {
    if (!socket || !isConnected) return
    void reloadRooms()
    const resolveRoom = (chatId: string) => useChatStore.getState().rooms.find(room => wireId(room) === chatId || room._id === chatId)
    const onMessage = (data: { chatId: string; message: ChatMessage }) => {
      const room = resolveRoom(data.chatId)
      if (!room) { void reloadRooms(); return }
      const store = useChatStore.getState()
      const exists = store.messages[room._id]?.some(message => message._id === data.message._id)
      const message = normalizeMessage(data.message, room._id)
      store.addMessage(room._id, message); store.updateRoom(room._id, { lastMessage: message })
      const sender = typeof message.sender === 'string' ? message.sender : message.sender?._id
      if (!exists && sender !== viewer && (store.currentRoom?._id !== room._id || document.hidden)) store.incrementUnreadCount(room._id)
    }
    const onTyping = (data: { chatId: string; userId: string }) => {
      const room = resolveRoom(data.chatId)
      if (room && data.userId !== viewer) useChatStore.getState().addTypingUser(room._id, data.userId)
    }
    const onStop = (data: { chatId: string; userId: string }) => {
      const room = resolveRoom(data.chatId)
      if (room) useChatStore.getState().removeTypingUser(room._id, data.userId)
    }
    const onPresence = (data: { userId: string; status: string }) => {
      const store = useChatStore.getState()
      if (data.status === 'online') store.addOnlineUser(data.userId)
      else store.removeOnlineUser(data.userId)
    }
    const onError = (error: { message?: string }) => useChatStore.getState().setError(error.message || 'El chat no está disponible temporalmente.')
    socket.on('newMessage', onMessage); socket.on('userTyping', onTyping); socket.on('userStoppedTyping', onStop); socket.on('userPresenceUpdate', onPresence); socket.on('error', onError)
    return () => { socket.off('newMessage', onMessage); socket.off('userTyping', onTyping); socket.off('userStoppedTyping', onStop); socket.off('userPresenceUpdate', onPresence); socket.off('error', onError) }
  }, [socket, isConnected, viewer, reloadRooms])

  useEffect(() => {
    if (!currentRoom || !socket || !isConnected) return
    socket.emit('joinChat', { chatId: wireId(currentRoom) })
    useChatStore.getState().resetUnreadCount(currentRoom._id)
    return () => { socket.emit('leaveChat', { chatId: wireId(currentRoom) }) }
  }, [currentRoom?._id, currentRoom?.chatId, socket, isConnected])

  const sendChatMessage = useCallback(async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!currentRoom || !content.trim() || sending.current || !viewer) return false
    if (content.trim().length > 1000) { state.setError('El mensaje admite hasta 1,000 caracteres.'); return false }
    sending.current = true; setIsSending(true)
    try {
      const result = await sendMessage(wireId(currentRoom), { content: content.trim(), messageType: type })
      if (useChatStore.getState().ownerId !== viewer) return false
      if (!result.success || !result.data?._id) throw new Error()
      const message = normalizeMessage(result.data, currentRoom._id)
      state.addMessage(currentRoom._id, message); state.updateRoom(currentRoom._id, { lastMessage: message }); state.clearError()
      return true
    } catch { if (useChatStore.getState().ownerId === viewer) state.setError('No se confirmó el envío. Conservamos tu texto; revisa la conexión antes de reintentar.'); return false }
    finally { sending.current = false; setIsSending(false) }
  }, [currentRoom, viewer])

  const emit = (event: string, extra = {}) => { if (currentRoom && isConnected) socket?.emit(event, { chatId: wireId(currentRoom), ...extra }) }
  return {
    rooms: state.ownerId === viewer ? state.rooms : [], currentRoom, isLoading: state.isLoading, error: state.error, isSending,
    hasMoreRooms, hasMoreMessages, reloadRooms: () => reloadRooms(), loadMoreRooms: () => reloadRooms(true), loadMoreMessages: () => loadHistory(true),
    selectRoom: state.setCurrentRoom, addRoom: state.addRoom, sendChatMessage,
    handleTypingStart: () => emit('typing'), handleTypingStop: () => emit('stopTyping'), markMessageAsRead: (messageId: string) => emit('markAsRead', { messageId }),
    clearError: state.clearError,
    getTotalUnreadCount: () => Object.values(state.unreadCounts).reduce((sum,count) => sum + count, 0),
    isUserOnline: (id: string) => state.onlineUsers.includes(id), getTypingUsersForRoom: (id: string) => state.typingUsers[id] || [],
    getRoomMessages: (id: string) => state.messages[id] || [], getRoomUnreadCount: (id: string) => state.unreadCounts[id] || 0,
  }
}
