'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Search, Plus, MoreVertical, Phone, Video, Info, Image, Smile, Paperclip, Check, CheckCheck, MessageCircle } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'


import { useChat } from '@/hooks/useChat'
import { useSocket } from '@/lib/providers/SocketProvider'
import { useAuthStore } from '@/stores/authStore'
import type { ChatRoom, User } from '@/types/api.types'
import { getImageUrl } from '@/lib/utils'

function MessagesContent() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { isConnected } = useSocket()
  const {
    rooms,
    currentRoom,
    selectRoom,
    sendChatMessage,
    handleTypingStart,
    handleTypingStop,
    getRoomMessages,
    getRoomUnreadCount,
    getTypingUsersForRoom,
    isUserOnline,
    addRoom,
    isLoading
  } = useChat()

  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentRoom, getRoomMessages(currentRoom?._id || '')])

  // Handle userId param to open/create chat
  useEffect(() => {
    const handleOpenChat = async () => {
      if (!userIdParam || !user || isCreatingChat) return

      // 1. Check if we already have a chat with this user
      const existingRoom = rooms.find(room =>
        room.type === 'direct' &&
        room.participants.some(p =>
          typeof p.user === 'object' ? p.user._id === userIdParam : p.user === userIdParam
        )
      )

      if (existingRoom) {
        selectRoom(existingRoom)
        window.history.replaceState(null, '', '/messages') // Clear param
      } else {
        // 2. Create new chat
        try {
          setIsCreatingChat(true)
          const { createDirectChat } = await import('@/lib/api/chat')
          const response = await createDirectChat(userIdParam)
          if (response.success && response.data) {
            addRoom(response.data)
            selectRoom(response.data)
          }
        } catch (error) {
          console.error('Error creating chat:', error)
        } finally {
          setIsCreatingChat(false)
          window.history.replaceState(null, '', '/messages')
        }
      }
    }

    if (rooms.length > 0 || !isLoading) {
      handleOpenChat()
    }
  }, [userIdParam, rooms, user, selectRoom, addRoom, isCreatingChat, isLoading])

  const handleSendMessage = () => {
    if (messageInput.trim() && currentRoom) {
      sendChatMessage(messageInput.trim())
      setMessageInput('')
      handleStopTyping()
    }
  }

  const handleInputChange = (value: string) => {
    setMessageInput(value)

    if (value.trim() && !isTyping) {
      setIsTyping(true)
      handleTypingStart()
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping()
    }, 1000)
  }

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      handleTypingStop()
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      })
    }
  }

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const otherParticipant = room.participants.find(p =>
        typeof p.user === 'object' ? p.user._id !== user?._id : p.user !== user?._id
      )
      if (otherParticipant && typeof otherParticipant.user === 'object') {
        return `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`
      }
    }
    return room.name || 'Chat'
  }

  const currentMessages = currentRoom ? getRoomMessages(currentRoom._id) : []
  const typingUsers = currentRoom ? getTypingUsersForRoom(currentRoom._id) : []

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      {/* Chat Rooms Sidebar */}
      <div className="w-80 glass border-r border-border/40 flex flex-col z-10">
        {/* Header */}
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Mensajes
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-accent/10">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <motion.button
                onClick={() => router.push('/search')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                title="Nueva conversación"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {rooms.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium">No hay chats</p>
              <p className="text-sm opacity-70">Inicia una nueva conversación</p>
            </div>
          ) : (
            rooms
              .filter(room => !searchQuery || getRoomDisplayName(room).toLowerCase().includes(searchQuery.toLowerCase()))
              .map((room) => {
                const unreadCount = getRoomUnreadCount(room._id)
                const isActive = currentRoom?._id === room._id

                return (
                  <motion.div
                    key={room._id}
                    layoutId={`room-${room._id}`}
                    onClick={() => selectRoom(room)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${isActive
                      ? 'bg-primary/10 border border-primary/20 shadow-sm'
                      : 'hover:bg-muted/50 border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 ${isActive ? 'border-primary' : 'border-transparent'}`}>
                          {room.type === 'direct' && room.participants.find(p => typeof p.user === 'object' && p.user._id !== user?._id && p.user.avatar) ? (
                            <img
                              src={getImageUrl(room.participants.find(p => typeof p.user === 'object' && p.user._id !== user?._id)?.user?.avatar)}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {getRoomDisplayName(room)[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        {room.type === 'direct' && room.participants.some(p =>
                          typeof p.user === 'object' && p.user._id !== user?._id && isUserOnline(p.user._id)
                        ) && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                          )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className={`font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {getRoomDisplayName(room)}
                          </h3>
                          {room.lastMessage && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {formatTime(room.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate pr-2 ${isActive ? 'text-primary/80' : 'text-muted-foreground'}`}>
                            {room.lastMessage?.content || 'Nuevo chat'}
                          </p>
                          {unreadCount > 0 && (
                            <div className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg shadow-primary/25">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative z-0">
        {currentRoom ? (
          <>
            {/* Chat Header */}
            <div className="glass border-b border-border/40 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-border/50">
                  {currentRoom.type === 'direct' && currentRoom.participants.find(p => typeof p.user === 'object' && p.user._id !== user?._id && p.user.avatar) ? (
                    <img
                      src={getImageUrl(currentRoom.participants.find(p => typeof p.user === 'object' && p.user._id !== user?._id)?.user?.avatar)}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      {getRoomDisplayName(currentRoom)[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">
                    {getRoomDisplayName(currentRoom)}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {currentRoom.type === 'direct' && currentRoom.participants.some(p =>
                      typeof p.user === 'object' && p.user._id !== user?._id && isUserOnline(p.user._id)
                    ) ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-500">En línea</span>
                      </>
                    ) : (
                      <span>{currentRoom.participants.length} participantes</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-5 h-5" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors">
                  <Video className="w-5 h-5" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors">
                  <Info className="w-5 h-5" />
                </motion.button>

                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    className="p-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </motion.button>

                  <AnimatePresence>
                    {showChatMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowChatMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute right-0 mt-2 w-56 glass-strong rounded-xl shadow-xl border border-border/50 py-2 z-20 backdrop-blur-xl"
                        >
                          <div className="px-2 py-1 space-y-1">
                            {['Ver perfil', 'Silenciar', 'Buscar'].map((item) => (
                              <button key={item} className="w-full px-3 py-2 text-left text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">
                                {item}
                              </button>
                            ))}
                          </div>
                          <div className="my-1 border-t border-border/40" />
                          <div className="px-2 py-1">
                            <button className="w-full px-3 py-2 text-left text-sm font-medium rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                              Eliminar chat
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar bg-white/30 dark:bg-black/30 backdrop-blur-[2px]">
              {currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                  <MessageCircle className="w-20 h-20 mb-4 stroke-1" />
                  <p className="text-lg font-medium">Comienza la conversación</p>
                </div>
              ) : (
                currentMessages.map((message, index) => {
                  const isOwn = typeof message.sender === 'object'
                    ? message.sender._id === user?._id
                    : message.sender === user?._id
                  const showDateDivider = index === 0 ||
                    formatDate(message.createdAt) !== formatDate(currentMessages[index - 1].createdAt)

                  return (
                    <div key={message._id}>
                      {showDateDivider && (
                        <div className="flex justify-center my-6">
                          <span className="px-3 py-1 rounded-full bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border/40 backdrop-blur-sm">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] lg:max-w-[60%] p-4 rounded-2xl shadow-sm ${isOwn
                          ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-tr-sm'
                          : 'bg-white dark:bg-gray-800 border border-border/40 rounded-tl-sm'
                          }`}>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div className={`flex items-center justify-end gap-1.5 mt-2 text-[10px] font-medium opacity-80 ${isOwn ? 'text-primary-foreground' : 'text-muted-foreground'
                            }`}>
                            <span>{formatTime(message.createdAt)}</span>
                            {isOwn && (
                              message.readBy?.length > 0 ?
                                <CheckCheck className="w-3 h-3" /> :
                                <Check className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )
                })
              )}

              {/* Typing Indicators */}
              <AnimatePresence>
                {typingUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-3 px-4"
                  >
                    <div className="bg-muted/50 px-4 py-3 rounded-2xl rounded-tl-sm border border-border/40">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium animate-pulse">
                      Escribiendo...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 glass border-t border-border/40">
              <div className="relative flex items-end gap-2 bg-muted/30 p-2 rounded-2xl border border-border/40 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                <div className="flex gap-1 pb-1">
                  <button className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Image className="w-5 h-5" />
                  </button>
                </div>

                <textarea
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 max-h-32 min-h-[44px] py-3 px-2 bg-transparent border-none focus:outline-none resize-none text-sm placeholder:text-muted-foreground leading-relaxed"
                  rows={1}
                />

                <div className="pb-1 pr-1">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className={`p-3 rounded-xl transition-all ${messageInput.trim()
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-6 text-center p-8 bg-grid-pattern opacity-60">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-pulse">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-2xl font-bold font-heading">Bienvenido a Mensajes</h2>
              <p className="text-muted-foreground">
                Selecciona una conversación de la lista o inicia un nuevo chat para conectar con tu comunidad.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center">Cargando mensajes...</div>}>
      <MessagesContent />
    </Suspense>
  )
}