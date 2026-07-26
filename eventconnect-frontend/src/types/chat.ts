export interface User {
  id: string
  name: string
  avatar?: string
  isOnline?: boolean
  lastSeen?: string
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
  timestamp: string
  isRead?: boolean
  replyTo?: string
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  isEdited?: boolean
  editedAt?: string
}

export interface MessageAttachment {
  id: string
  url: string
  type: 'image' | 'video' | 'audio' | 'file'
  name: string
  size: number
  thumbnail?: string
}

export interface MessageReaction {
  id: string
  emoji: string
  userId: string
  timestamp: string
}

export interface Chat {
  id: string
  type: 'direct' | 'group' | 'tribe'
  name?: string
  avatar?: string
  participants: User[]
  lastMessage?: Message
  unreadCount: number
  createdAt: string
  updatedAt: string
  isArchived?: boolean
  isMuted?: boolean
}

export interface ChatState {
  chats: Chat[]
  activeChat: Chat | null
  messages: Record<string, Message[]>
  isLoading: boolean
  isTyping: Record<string, string[]>
}

export interface TypingIndicator {
  chatId: string
  userId: string
  isTyping: boolean
}

export interface ChatEvents {
  'message:new': (message: Message) => void
  'message:read': (data: { messageId: string; userId: string }) => void
  'typing:start': (data: TypingIndicator) => void
  'typing:stop': (data: TypingIndicator) => void
  'chat:join': (chatId: string) => void
  'chat:leave': (chatId: string) => void
  'user:online': (userId: string) => void
  'user:offline': (userId: string) => void
}