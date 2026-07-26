'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share, MoreVertical, X, Plus, Send, Camera, Image as ImageIcon, Loader2 } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const ArrowRight = ChevronRight
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface Story {
  _id: string
  author: {
    _id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  content?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  event?: {
    _id: string
    title: string
    location: {
      name: string
      address: string
    }
  }
  music?: {
    title: string
    artist: string
  }
  views: number
  likes: number
  replies: number
  isLiked: boolean
  isViewed: boolean
  createdAt: string
  expiresAt: string
}

interface StoryReply {
  _id: string
  author: {
    _id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  content: string
  createdAt: string
}

export default function StoriesPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showReplies, setShowReplies] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const progressRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const storyDuration = 7000 // 7 seconds per story

  // Fetch stories
  const { data: stories = [], isLoading, error } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const response = await apiClient.get('/stories')
      return response.data as Story[]
    }
  })

  // Fetch story replies
  const { data: replies = [] } = useQuery({
    queryKey: ['story-replies', stories[currentStoryIndex]?._id],
    queryFn: async () => {
      if (!stories[currentStoryIndex]) return []
      const response = await apiClient.get(`/stories/${stories[currentStoryIndex]._id}/replies`)
      return response.data as StoryReply[]
    },
    enabled: !!stories[currentStoryIndex] && showReplies
  })

  // Like story mutation
  const likeMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const response = await apiClient.post(`/stories/${storyId}/like`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      toast.success('Te gusta esta historia')
    },
    onError: () => {
      toast.error('Error al dar me gusta')
    }
  })

  // Reply to story mutation
  const replyMutation = useMutation({
    mutationFn: async ({ storyId, content }: { storyId: string; content: string }) => {
      const response = await apiClient.post(`/stories/${storyId}/replies`, { content })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-replies'] })
      setReplyText('')
      setShowReplies(false)
      toast.success('Respuesta enviada')
    },
    onError: () => {
      toast.error('Error al enviar respuesta')
    }
  })

  // View story mutation
  const viewMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const response = await apiClient.post(`/stories/${storyId}/view`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    }
  })

  const currentStory = stories[currentStoryIndex]

  // Start progress animation
  const startProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    setProgress(0)
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextStory()
          return 0
        }
        return prev + (100 / (storyDuration / 100))
      })
    }, 100)
  }

  // Stop progress animation
  const stopProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  // Next story
  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      const nextIndex = currentStoryIndex + 1
      setCurrentStoryIndex(nextIndex)
      setProgress(0)
    } else {
      router.push('/feed')
    }
  }

  // Previous story
  const previousStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1
      setCurrentStoryIndex(prevIndex)
      setProgress(0)
    }
  }

  // Handle like story
  const handleLikeStory = () => {
    if (!currentStory || currentStory.isLiked) return
    likeMutation.mutate(currentStory._id)
  }

  // Handle reply to story
  const handleReply = () => {
    if (!currentStory || !replyText.trim()) return
    replyMutation.mutate({ 
      storyId: currentStory._id, 
      content: replyText.trim() 
    })
  }

  // Handle share story
  const handleShareStory = async () => {
    if (!currentStory) return
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Historia de ${currentStory.author.firstName}`,
          text: currentStory.content || 'Mira esta historia en EventConnect',
          url: `${window.location.origin}/stories/${currentStory._id}`
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${window.location.origin}/stories/${currentStory._id}`)
        toast.success('Link copiado al portapapeles')
      }
    } catch (err: any) {
      toast.error('Error al compartir')
    }
  }

  // Handle view story
  const handleViewStory = () => {
    if (!currentStory || currentStory.isViewed) return
    viewMutation.mutate(currentStory._id)
  }

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Hace menos de 1h'
    if (diffInHours < 24) return `Hace ${diffInHours}h`
    return `Hace ${Math.floor(diffInHours / 24)}d`
  }

  useEffect(() => {
    if (currentStory && isPlaying && !showReplies) {
      startProgress()
      handleViewStory()
    } else {
      stopProgress()
    }

    return () => {
      stopProgress()
    }
  }, [currentStory, isPlaying, showReplies])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ChevronLeft') previousStory()
      if (e.key === 'ArrowRight') nextStory()
      if (e.key === ' ') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
      if (e.key === 'Escape') {
        if (showReplies) {
          setShowReplies(false)
        } else if (showCreateModal) {
          setShowCreateModal(false)
        } else {
          router.push('/feed')
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, showReplies, showCreateModal])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-white">Cargando historias...</p>
        </div>
      </div>
    )
  }

  if (error || !stories.length) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4 text-lg">
            {error ? 'Error al cargar historias' : 'No hay historias disponibles'}
          </p>
          <p className="mb-6 text-gray-400">
            {!stories.length && '¡Sé el primero en crear una historia!'}
          </p>
          <div className="flex gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/feed')}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-medium transition-colors"
            >
              Volver
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Historia
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentStory) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">Historia no encontrada</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/feed')}
            className="px-4 py-2 bg-white text-black rounded-lg"
          >
            Volver
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Story Media */}
      <div className="absolute inset-0">
        {currentStory.mediaUrl ? (
          currentStory.mediaType === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Historia"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            {currentStory.content && (
              <div className="text-center px-8">
                <p className="text-white text-2xl font-bold leading-relaxed">
                  {currentStory.content}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/feed')}
            className="p-2 rounded-full bg-black/50 text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          
          <div className="flex items-center gap-2">
            {currentStory.mediaType === 'video' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full bg-black/50 text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-full bg-black/50 text-white"
            >
              <Plus className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-black/50 text-white"
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="flex gap-1">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: index < currentStoryIndex ? '100%' : 
                         index === currentStoryIndex ? `${progress}%` : '0%'
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Story Content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        {/* Author Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-white/20 flex items-center justify-center text-lg font-semibold text-white">
            {currentStory.author.avatar ? (
              <img 
                src={currentStory.author.avatar} 
                alt={currentStory.author.firstName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              currentStory.author.firstName[0]
            )}
          </div>
          <div>
            <h3 className="text-white font-medium">
              {currentStory.author.firstName} {currentStory.author.lastName}
            </h3>
            <p className="text-white/70 text-sm">{formatTime(currentStory.createdAt)}</p>
          </div>
        </div>

        {/* Story Text (only if no media or on top of media) */}
        {currentStory.content && currentStory.mediaUrl && (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 mb-4">
            <p className="text-white text-lg leading-relaxed">
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Event Info */}
        {currentStory.event && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-4"
          >
            <h4 className="text-white font-medium">{currentStory.event.title}</h4>
            <p className="text-white/70 text-sm">{currentStory.event.location.name}</p>
          </motion.div>
        )}

        {/* Music Info */}
        {currentStory.music && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{currentStory.music.title}</p>
                <p className="text-white/70 text-sm">{currentStory.music.artist}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Story Stats */}
        <div className="flex items-center gap-4 text-white/70 text-sm mb-4">
          <span>{currentStory.views} vistas</span>
          <span>{currentStory.likes} me gusta</span>
          <span>{currentStory.replies} respuestas</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLikeStory}
            disabled={likeMutation.isPending}
            className={`p-3 rounded-full ${
              currentStory.isLiked ? 'bg-red-500' : 'bg-white/20'
            } text-white transition-colors`}
          >
            <Heart className={`w-5 h-5 ${currentStory.isLiked ? 'fill-current' : ''}`} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowReplies(true)}
            className="p-3 rounded-full bg-white/20 text-white"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShareStory}
            className="p-3 rounded-full bg-white/20 text-white"
          >
            <Share className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Navigation Areas */}
      <div className="absolute inset-0 z-5">
        <div className="flex h-full">
          <div 
            className="w-1/3 h-full cursor-pointer flex items-center justify-start pl-4"
            onClick={previousStory}
          >
            {currentStoryIndex > 0 && (
              <div className="p-2 rounded-full bg-black/20 text-white/50">
                <ChevronLeft className="w-6 h-6" />
              </div>
            )}
          </div>
          <div 
            className="w-1/3 h-full cursor-pointer"
            onClick={() => setIsPlaying(!isPlaying)}
          />
          <div 
            className="w-1/3 h-full cursor-pointer flex items-center justify-end pr-4"
            onClick={nextStory}
          >
            {currentStoryIndex < stories.length - 1 && (
              <div className="p-2 rounded-full bg-black/20 text-white/50">
                <ArrowRight className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Play/Pause Indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-black/50 text-white"
          >
            <Play className="w-8 h-8" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies Modal */}
      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-end"
            onClick={() => setShowReplies(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="w-full bg-white dark:bg-gray-800 rounded-t-3xl max-h-[60vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Respuestas ({replies.length})
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowReplies(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-60">
                {replies.map((reply) => (
                  <div key={reply._id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
                      {reply.author.firstName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {reply.author.firstName} {reply.author.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))}
                
                {replies.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No hay respuestas aún. ¡Sé el primero en responder!
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe una respuesta..."
                    className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl border-0 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleReply()
                      }
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReply}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="px-4 py-3 bg-primary-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Story Modal Placeholder */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Crear Historia
                </h3>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              
              <div className="text-center py-8">
                <div className="flex justify-center gap-4 mb-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-6 bg-primary-500 text-white rounded-2xl"
                  >
                    <Camera className="w-8 h-8" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-6 bg-green-500 text-white rounded-2xl"
                  >
                    <ImageIcon className="w-8 h-8" />
                  </motion.button>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Funcionalidad de creación de historias próximamente
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl"
                >
                  Cerrar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}