'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Send, MoreHorizontal, Volume2, VolumeX, Play, Pause } from 'lucide-react'
import { useStoriesStore } from '@/stores/storiesStore'
import { useAuthStore } from '@/stores/authStore'
import { useRouter, usePathname } from 'next/navigation'
import * as storiesAPI from '@/lib/api/stories'

interface StoryViewerProps {
  isOpen: boolean
  onClose: () => void
}

const STORY_DURATION = 5000 // 5 seconds per story
const reactions = ['❤️', '😂', '😮', '😢', '😡', '👏']

export default function StoryViewer({ isOpen, onClose }: StoryViewerProps) {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const requireAccount = () => {
    if (isAuthenticated && (user?.id || user?._id)) return true
    router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`)
    return false
  }
  const {
    feedItems,
    currentStory,
    selectedFeedIndex,
    selectedStoryIndex,
    nextStory,
    prevStory,
    nextUser,
    prevUser,
    reactToStory,
    removeStoryReaction
  } = useStoriesStore()

  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReactions, setShowReactions] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)

  const progressRef = useRef<NodeJS.Timeout>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentFeedItem = feedItems[selectedFeedIndex]
  const currentStories = currentFeedItem?.stories || []
  const hasNextStory = selectedStoryIndex < currentStories.length - 1 || selectedFeedIndex < feedItems.length - 1
  const hasPrevStory = selectedStoryIndex > 0 || selectedFeedIndex > 0

  // Auto-progress stories
  useEffect(() => {
    if (!isOpen || !isPlaying) return

    const startTime = Date.now()
    const duration = currentStory?.media?.[0]?.type === 'video' && videoRef.current 
      ? videoRef.current.duration * 1000 
      : STORY_DURATION

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progressPercent = (elapsed / duration) * 100

      if (progressPercent >= 100) {
        if (hasNextStory) {
          nextStory()
        } else {
          onClose()
        }
        setProgress(0)
      } else {
        setProgress(progressPercent)
      }
    }, 50)

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current)
      }
    }
  }, [isOpen, isPlaying, currentStory, hasNextStory, nextStory, onClose])

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0)
  }, [selectedFeedIndex, selectedStoryIndex])

  // Handle video events
  useEffect(() => {
    const video = videoRef.current
    if (!video || currentStory?.media?.[0]?.type !== 'video') return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      if (hasNextStory) {
        nextStory()
      } else {
        onClose()
      }
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentStory, hasNextStory, nextStory, onClose])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        if (hasNextStory) nextStory()
        break
      case 'ChevronLeft':
        if (hasPrevStory) prevStory()
        break
      case 'Escape':
        onClose()
        break
      case ' ':
        e.preventDefault()
        togglePlayPause()
        break
    }
  }

  const togglePlayPause = () => {
    if (currentStory?.media?.[0]?.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handleReaction = async (emoji: string) => {
    if (!currentStory || !requireAccount()) return

    try {
      if (currentStory.hasReacted) {
        await removeStoryReaction(currentStory._id)
      } else {
        await reactToStory(currentStory._id, 'like') // Map emoji to reaction type
      }
    } catch (error) {
      console.error('Error reacting to story:', error)
    }

    setShowReactions(false)
  }

  const handleReply = async () => {
    if (!currentStory || !replyText.trim() || !requireAccount()) return

    try {
      await storiesAPI.replyToStory(currentStory._id, replyText.trim())
      setReplyText('')
      setShowReplyInput(false)
    } catch (error) {
      console.error('Error replying to story:', error)
    }
  }

  if (!isOpen || !currentStory || !currentFeedItem) return null

  const isOwnStory = currentStory.author._id === user?.id
  const timeRemaining = storiesAPI.formatTimeRemaining(
    storiesAPI.getTimeRemaining(currentStory.expiresAt)
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
        onClick={onClose}
        onKeyDown={handleKeyPress}
        tabIndex={0}
      >
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className="flex gap-1">
            {currentStories.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width: index < selectedStoryIndex ? '100%' :
                           index === selectedStoryIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-semibold">
              {currentFeedItem.user.avatar || currentFeedItem.user.firstName[0]}
            </div>
            <div>
              <div className="font-medium">
                {currentFeedItem.user.firstName} {currentFeedItem.user.lastName}
              </div>
              <div className="text-sm text-white text-opacity-70">
                {timeRemaining}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentStory.media?.[0]?.type === 'video' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMuted(!isMuted)
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted
                  }
                }}
                className="w-10 h-10 rounded-full bg-black bg-opacity-30 flex items-center justify-center hover:bg-opacity-50 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="w-10 h-10 rounded-full bg-black bg-opacity-30 flex items-center justify-center hover:bg-opacity-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="absolute inset-0 flex">
          {/* Left half - previous */}
          {hasPrevStory && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevStory()
              }}
              className="flex-1 flex items-center justify-start pl-4"
            >
              <ChevronLeft className="w-8 h-8 text-white opacity-50" />
            </button>
          )}

          {/* Right half - next */}
          {hasNextStory && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextStory()
              }}
              className="flex-1 flex items-center justify-end pr-4"
            >
              <ChevronRight className="w-8 h-8 text-white opacity-50" />
            </button>
          )}
        </div>

        {/* Story Content */}
        <div className="w-full h-full flex items-center justify-center">
          {currentStory.media?.[0]?.type === 'image' && (
            <motion.img
              key={currentStory._id}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={currentStory.media[0].url}
              alt="Story"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {currentStory.media?.[0]?.type === 'video' && (
            <motion.video
              key={currentStory._id}
              ref={videoRef}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={currentStory.media[0].url}
              autoPlay
              muted={isMuted}
              playsInline
              className="max-w-full max-h-full object-contain"
              onClick={(e) => {
                e.stopPropagation()
                togglePlayPause()
              }}
            />
          )}

          {(!currentStory.media?.length && currentStory.content) && (
            <motion.div
              key={currentStory._id}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md mx-4 aspect-[9/16] rounded-2xl flex items-center justify-center p-8 text-center"
              style={{
                backgroundColor: '#6366F1', // Default background
                color: '#FFFFFF'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xl font-medium leading-relaxed">
                {currentStory.content}
              </div>
            </motion.div>
          )}
        </div>

        {/* Play/Pause indicator */}
        {!isPlaying && currentStory.media?.[0]?.type !== 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        {!isOwnStory && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="flex items-center gap-3">
              {/* Reaction Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowReactions(!showReactions)
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  currentStory.hasReacted 
                    ? 'bg-red-500 text-white' 
                    : 'bg-black bg-opacity-30 text-white hover:bg-opacity-50'
                }`}
              >
                <Heart className={`w-6 h-6 ${currentStory.hasReacted ? 'fill-current' : ''}`} />
              </button>

              {/* Reply Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowReplyInput(!showReplyInput)
                }}
                className="flex-1 p-3 bg-black bg-opacity-30 text-white rounded-full text-left hover:bg-opacity-50 transition-colors"
              >
                Enviar mensaje a {currentFeedItem.user.firstName}...
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle more options
                }}
                className="w-12 h-12 rounded-full bg-black bg-opacity-30 text-white flex items-center justify-center hover:bg-opacity-50 transition-colors"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </div>

            {/* Reactions */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-4 flex justify-center gap-3"
                >
                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReaction(emoji)
                      }}
                      className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-2xl hover:scale-110 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply Input */}
            <AnimatePresence>
              {showReplyInput && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-4 flex gap-3"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe una respuesta..."
                    className="flex-1 p-3 bg-black bg-opacity-50 text-white placeholder-white placeholder-opacity-70 rounded-full border-none outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleReply()
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReply()
                    }}
                    disabled={!replyText.trim()}
                    className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}