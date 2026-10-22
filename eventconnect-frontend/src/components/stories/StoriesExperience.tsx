'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share, MoreVertical, X, Plus, Send, Camera, Image as ImageIcon, Loader2 } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const ArrowRight = ChevronRight
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

import { StoryItem as Story, StoryReply, readStories } from './story-contract'

export default function StoriesExperience({ storyId }: { storyId?: string }) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [showReplies, setShowReplies] = useState(false)
  const [replyText, setReplyText] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewedStories = useRef(new Set<string>())
  
  const progressRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const storyDuration = 7000 // 7 seconds per story

  // Fetch stories
  const { data: stories = [], isLoading, error, refetch } = useQuery({
    queryKey: ['stories', storyId || 'feed', user?._id || user?.id],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await apiClient.get(storyId ? `/stories/${storyId}` : '/stories', { params: storyId ? undefined : { limit: 100 } })
      return readStories(storyId ? { stories: [response.data.data] } : response.data)
    }
  })

  // Fetch story replies
  const { data: replies = [] } = useQuery({
    queryKey: ['story-replies', stories[currentStoryIndex]?._id],
    queryFn: async () => {
      if (!stories[currentStoryIndex]) return []
      const response = await apiClient.get(`/stories/${stories[currentStoryIndex]._id}/replies`)
      return response.data.replies as StoryReply[]
    },
    enabled: isAuthenticated && !!stories[currentStoryIndex] && showReplies
  })

  // Like story mutation
  const likeMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const response = await apiClient.post(`/stories/${storyId}/like`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })

    },
    onError: () => {
      toast.error('Error al dar me gusta')
    }
  })

  // Reply to story mutation
  const replyMutation = useMutation({
    mutationFn: async ({ storyId, content }: { storyId: string; content: string }) => {
      const response = await apiClient.post(`/stories/${storyId}/reply`, { reply: content })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-replies'] })
      setReplyText('')
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

  const currentStory = isAuthenticated ? stories[currentStoryIndex] : undefined

  const nextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(index => index + 1)
    } else {
      router.push('/feed')
    }
  }, [currentStoryIndex, stories.length, router])

  const previousStory = useCallback(() => {
    setCurrentStoryIndex(index => Math.max(0, index - 1))
  }, [])

  // Handle like story
  const handleLikeStory = () => {
    if (!currentStory) return
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
      if (err?.name !== 'AbortError') toast.error('Error al compartir')
    }
  }

  // Handle view story
  const handleViewStory = () => {
    if (!currentStory || currentStory.isViewed || viewedStories.current.has(currentStory._id)) return
    viewedStories.current.add(currentStory._id)
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

  useEffect(() => { setProgress(0) }, [currentStory?._id])

  useEffect(() => {
    if (!currentStory || !isPlaying || showReplies) return
    handleViewStory()
    const timer = setInterval(() => setProgress(value => Math.min(100, value + 100 / (storyDuration / 100))), 100)
    return () => clearInterval(timer)
  }, [currentStory?._id, isPlaying, showReplies])

  useEffect(() => {
    if (progress >= 100) nextStory()
  }, [progress, nextStory])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying && !showReplies) video.play().catch(() => setIsPlaying(false))
    else video.pause()
  }, [isPlaying, showReplies, currentStory?._id])

  useEffect(() => {
    if (!isAuthenticated) return
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.matches('input, textarea, button, a') || e.target.isContentEditable)) return
      if (e.key === 'ArrowLeft') previousStory()
      if (e.key === 'ArrowRight') nextStory()
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(value => !value) }
      if (e.key === 'Escape') {
        if (showReplies) setShowReplies(false)
        else router.push('/feed')
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isAuthenticated, nextStory, previousStory, showReplies, router])

  if (!isAuthenticated) {
    const destination = storyId ? `/stories/${storyId}` : '/stories'
    const redirect = encodeURIComponent(destination)
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <Camera className="mx-auto mb-5 h-12 w-12 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-bold">Las historias se viven en comunidad</h1>
        <p className="mt-4 text-muted-foreground">Inicia sesión para ver y compartir historias. Puedes seguir explorando los eventos públicos sin crear una cuenta.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/login?redirect=${redirect}`} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Entrar para ver historias</Link>
          <Link href={`/register?redirect=${redirect}`} className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 font-semibold">Crear cuenta</Link>
        </div>
        <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm text-primary underline">Seguir explorando eventos</Link>
      </div>
    </main>
  }

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
            {!error && !stories.length && '¡Sé el primero en crear una historia!'}
          </p>
          <div className="flex gap-3 justify-center">
            {error && <button className="px-6 py-3 border border-white/30 rounded-xl" onClick={() => refetch()}>Reintentar</button>}
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
              aria-label="Crear historia" onClick={() => router.push('/stories/create')}
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
    <div className="h-[100dvh] bg-black relative overflow-hidden">
      {/* Story Media */}
      <div className="absolute inset-0">
        {currentStory.media[0]?.url ? (
          currentStory.media[0]?.type === 'video' ? (
            <video
              ref={videoRef}
              key={currentStory._id}
              src={currentStory.media[0]?.url}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
            />
          ) : (
            <img
              src={currentStory.media[0]?.url}
              alt="Historia"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: currentStory.style?.backgroundColor || '#65439c', color: currentStory.style?.textColor || '#ffffff' }}>
            {currentStory.content && (
              <div className="text-center px-8">
                <p className="font-bold leading-relaxed whitespace-pre-wrap break-words" style={{ fontSize: currentStory.style?.fontSize === 'small' ? 20 : currentStory.style?.fontSize === 'large' ? 32 : 26 }}>
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
            {currentStory.media[0]?.type === 'video' && (
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
              aria-label="Crear historia" onClick={() => router.push('/stories/create')}
              className="p-2 rounded-full bg-black/50 text-white"
            >
              <Plus className="w-5 h-5" />
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
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 max-h-[55vh] overflow-y-auto">
        {/* Author Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-white/20 flex items-center justify-center text-lg font-semibold text-white">
            {currentStory.author.avatar ? (
              <img 
                src={currentStory.author.avatar} 
                alt={currentStory.author.firstName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              currentStory.author.firstName?.[0] || '?'
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
        {currentStory.content && currentStory.media[0]?.url && (
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
            <p className="text-white/70 text-sm">{currentStory.event.location}</p>
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
            aria-label={currentStory.isLiked ? 'Quitar me gusta' : 'Me gusta'}
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
            aria-label="Ver respuestas"
            onClick={() => setShowReplies(true)}
            className="p-3 rounded-full bg-white/20 text-white"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Compartir historia"
            onClick={handleShareStory}
            className="p-3 rounded-full bg-white/20 text-white"
          >
            <Share className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Navigation Areas */}
      <div className="absolute inset-0 z-0">
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-semibold text-white">
                      {reply.author?.firstName?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {reply.author?.firstName || 'Usuario'} {reply.author?.lastName}
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
                    aria-label="Tu respuesta"
                    maxLength={500}
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

    </div>
  )
}
