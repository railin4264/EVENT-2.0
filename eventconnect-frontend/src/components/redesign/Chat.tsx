import { useState, useEffect } from 'react'
import { Search, Phone, Play, MoreVertical, Send, Paperclip, Smile, Loader2 } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { chatService } from '@/lib/api/services'
import type { Conversation, Message } from '@/types/models'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/providers/AuthProvider'

export function Chat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id)
    }
  }, [selectedConversation])

  const loadConversations = async () => {
    setIsLoadingConversations(true)
    try {
      const data = await chatService.getConversations()
      const sortedConversations = chatService.sortConversations(data)
      setConversations(sortedConversations)

      // Auto-select first conversation
      if (sortedConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(sortedConversations[0])
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Error al cargar conversaciones. Verifica la conexión con el backend.')
      setConversations([])
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true)
    try {
      const data = await chatService.getMessages(conversationId)
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Error al cargar mensajes')
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user) return

    setIsSending(true)
    try {
      const newMessage = await chatService.sendMessage({
        conversationId: selectedConversation._id,
        content: messageInput.trim(),
      })

      setMessages([...messages, newMessage])
      setMessageInput('')

      // Reload conversations to update last message
      loadConversations()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar mensaje')
    } finally {
      setIsSending(false)
    }
  }

  const getConversationTitle = (conversation: Conversation) => {
    if (!user) return 'Conversación'
    return chatService.getConversationTitle(conversation, user._id)
  }

  const getConversationAvatar = (conversation: Conversation) => {
    const title = getConversationTitle(conversation)
    return title.substring(0, 2).toUpperCase()
  }

  const formatTime = (date: Date) => {
    return chatService.formatMessageTime(date)
  }

  const isOwnMessage = (message: Message) => {
    if (!user) return false
    return chatService.isOwnMessage(message, user._id)
  }

  const getMessageSenderName = (message: Message) => {
    if (typeof message.sender === 'string') return 'Usuario'
    return `${message.sender.firstName} ${message.sender.lastName}`
  }

  const getMessageSenderAvatar = (message: Message) => {
    if (typeof message.sender === 'string') return 'U'
    return `${message.sender.firstName.charAt(0)}${message.sender.lastName.charAt(0)}`.toUpperCase()
  }

  const filteredConversations = conversations.filter(conversation => {
    const title = getConversationTitle(conversation).toLowerCase()
    return title.includes(searchQuery.toLowerCase())
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/70">Inicia sesión para ver tus mensajes</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-screen">
      {/* Conversations List */}
      <div className="col-span-4">
        <Card className="glass-card h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Mensajes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                placeholder="Buscar conversaciones..."
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1 p-2">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-white/60">No hay conversaciones</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?._id === conversation._id
                        ? 'bg-violet-500/20 border border-violet-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{getConversationAvatar(conversation)}</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-medium truncate">{getConversationTitle(conversation)}</h4>
                          {conversation.lastMessage && (
                            <span className="text-xs text-white/60">
                              {formatTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/70 truncate">
                            {conversation.lastMessage
                              ? chatService.getConversationPreview(conversation)
                              : 'Sin mensajes aún'}
                          </p>
                          {conversation.unreadCount && conversation.unreadCount > 0 && (
                            <Badge className="bg-violet-500 text-white text-xs ml-2">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="col-span-8">
        {!selectedConversation ? (
          <Card className="glass-card h-full flex items-center justify-center">
            <p className="text-white/60">Selecciona una conversación para empezar</p>
          </Card>
        ) : (
          <Card className="glass-card h-full flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{getConversationAvatar(selectedConversation)}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-medium">{getConversationTitle(selectedConversation)}</h3>
                  <p className="text-sm text-white/60">
                    {selectedConversation.participants.length} participantes
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                  <Play className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-white/60">No hay mensajes aún</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMine = isOwnMessage(message)

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex space-x-3 max-w-md ${isMine ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {!isMine && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-xs">{getMessageSenderAvatar(message)}</span>
                            </div>
                          )}

                          <div className={`space-y-1 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                            {!isMine && (
                              <span className="text-xs text-white/60">{getMessageSenderName(message)}</span>
                            )}
                            <div
                              className={`p-3 rounded-2xl ${
                                isMine
                                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white'
                                  : 'glass-card text-white'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <span className="text-xs text-white/50">
                              {new Date(message.createdAt).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center space-x-3">
                <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                  <Paperclip className="w-4 h-4" />
                </Button>

                <div className="flex-1 relative">
                  <Input
                    placeholder="Escribe un mensaje..."
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/60 pr-12"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={isSending}
                  />
                  <Button size="sm" variant="ghost" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white">
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  size="sm"
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-blue-700"
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
