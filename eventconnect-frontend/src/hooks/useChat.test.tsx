// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ getUserChats: vi.fn(), getChatMessages: vi.fn(), sendMessage: vi.fn() }))
const auth = vi.hoisted(() => ({ user: { _id: 'viewer' } as any }))
const handlers = new Map<string, (...args: any[]) => void>()
const socket = { emit: vi.fn(), on: vi.fn((name, fn) => handlers.set(name, fn)), off: vi.fn((name) => handlers.delete(name)) }
vi.mock('@/lib/api/chat', () => api)
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: any) => select(auth) }))
vi.mock('@/lib/providers/SocketProvider', () => ({ useSocket: () => ({ socket, isConnected: true }) }))
import { useChat } from './useChat'
import { useChatStore } from '@/stores/chatStore'
const room = { _id: 'mongo-room', chatId: 'canonical-room', type: 'direct', participants: [], unreadCount: 0 } as any
const message = { _id: 'saved-message', chatId: 'canonical-room', content: 'Hola', messageType: 'text', sender: { _id: 'viewer' }, createdAt: new Date().toISOString() }
beforeEach(() => {
  vi.clearAllMocks(); handlers.clear(); auth.user = { _id: 'viewer' }; useChatStore.getState().setOwner(null)
  api.getUserChats.mockResolvedValue({ success: true, data: [room], pagination: { hasMore: false } })
  api.getChatMessages.mockResolvedValue({ success: true, data: [message], pagination: { hasMore: false } })
  api.sendMessage.mockResolvedValue({ success: true, data: message })
})
afterEach(cleanup)
it('loads real rooms and joins / reads the canonical room identifier', async () => {
  const { result } = renderHook(() => useChat())
  await waitFor(() => expect(result.current.rooms).toHaveLength(1))
  act(() => result.current.selectRoom(room))
  await waitFor(() => expect(api.getChatMessages).toHaveBeenCalledWith('canonical-room', 1))
  expect(socket.emit).toHaveBeenCalledWith('joinChat', { chatId: 'canonical-room' })
  await waitFor(() => expect(result.current.getRoomMessages('mongo-room')[0]?.content).toBe('Hola'))
})
it('only confirms send after the API saves, and deduplicates realtime delivery', async () => {
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(1)); act(() => result.current.selectRoom(room))
  let resolve: any; api.sendMessage.mockReturnValue(new Promise(r => resolve = r)); let sending: Promise<boolean>
  act(() => { sending = result.current.sendChatMessage('Hola') }); expect(result.current.isSending).toBe(true)
  await act(async () => { resolve({ success: true, data: message }); expect(await sending!).toBe(true) })
  act(() => handlers.get('newMessage')?.({ chatId: 'canonical-room', message }))
  expect(result.current.getRoomMessages('mongo-room').filter(m => m._id === message._id)).toHaveLength(1)
  expect(socket.emit).not.toHaveBeenCalledWith('sendMessage', expect.anything())
})
it('failed persistence returns false instead of pretending delivery', async () => {
  api.sendMessage.mockRejectedValue(new Error('offline'))
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(1)); act(() => result.current.selectRoom(room))
  await act(async () => { expect(await result.current.sendChatMessage('Conservar este texto')).toBe(false) })
  expect(result.current.error).toContain('Conservamos tu texto')
})
it('does not let a late history response leak into the next account', async () => {
  let finish: any; api.getChatMessages.mockReturnValue(new Promise(r => finish = r))
  const { result, rerender } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(1)); act(() => result.current.selectRoom(room))
  await waitFor(() => expect(api.getChatMessages).toHaveBeenCalled())
  api.getUserChats.mockResolvedValue({ success: true, data: [], pagination: {} }); auth.user = { _id: 'another-viewer' }; rerender()
  await act(async () => finish({ success: true, data: [message], pagination: {} }))
  expect(useChatStore.getState().ownerId).toBe('another-viewer'); expect(useChatStore.getState().messages).toEqual({}); expect(result.current.currentRoom).toBeNull()
})
it('maps typing and incoming messages to the visible Mongo room, without counting own sends unread', async () => {
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(1))
  act(() => handlers.get('userTyping')?.({ chatId: 'canonical-room', userId: 'other' })); expect(result.current.getTypingUsersForRoom('mongo-room')).toEqual(['other'])
  act(() => handlers.get('newMessage')?.({ chatId: 'canonical-room', message })); expect(result.current.getRoomUnreadCount('mongo-room')).toBe(0)
  act(() => handlers.get('newMessage')?.({ chatId: 'canonical-room', message: { ...message, _id: 'incoming', sender: { _id: 'other' } } })); expect(result.current.getRoomUnreadCount('mongo-room')).toBe(1)
})
