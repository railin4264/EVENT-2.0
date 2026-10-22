import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ io: vi.fn() }))
vi.mock('socket.io-client', () => ({ io: mock.io }))
vi.mock('@/lib/constants', () => ({ SOCKET_URL: 'http://example.test' }))
import { socketClient } from './client'
beforeEach(() => { socketClient.disconnect(); vi.clearAllMocks(); mock.io.mockImplementation(() => ({ connected: false, emit: vi.fn(), disconnect: vi.fn() })) })
it('reuses a connecting client and rotates it when the account token changes', () => {
  const one = socketClient.connect('one'); expect(socketClient.connect('one')).toBe(one); expect(mock.io).toHaveBeenCalledTimes(1)
  const two = socketClient.connect('two'); expect(two).not.toBe(one); expect(one.disconnect).toHaveBeenCalled(); expect(mock.io).toHaveBeenCalledTimes(2)
  expect(mock.io.mock.calls[0][1].transports).toEqual(['polling','websocket'])
})
it('chat helpers use the actual server event contract', () => {
  const socket = socketClient.connect('one'); socketClient.joinChatRoom('canonical'); socketClient.sendMessage('canonical', 'Hola'); socketClient.leaveChatRoom('canonical')
  expect(socket.emit).toHaveBeenCalledWith('joinChat', { chatId: 'canonical' }); expect(socket.emit).toHaveBeenCalledWith('sendMessage', { chatId: 'canonical', content: 'Hola', messageType: 'text' }); expect(socket.emit).toHaveBeenCalledWith('leaveChat', { chatId: 'canonical' })
})
