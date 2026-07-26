'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, RefreshCw } from 'lucide-react'
import { useStoriesStore } from '@/stores/storiesStore'
import { useAuthStore } from '@/stores/authStore'
import CreateStory from './CreateStory'
import StoryViewer from './StoryViewer'
import * as storiesAPI from '@/lib/api/stories'

interface StoriesBarProps {
  eventId?: string
  tribeId?: string
  event?: {
    _id: string
    createdBy: {
      _id: string
      username: string
      firstName: string
      lastName: string
    }
  }
}

export default function StoriesBar({ eventId, tribeId, event }: StoriesBarProps = {}) {
  const { user } = useAuthStore()

  // Check if current user is the event organizer
  const isEventOrganizer = event && user && event.createdBy._id === user.id
  const {
    feedItems,
    myStories,
    fetchFeed,
    fetchMyStories,
    fetchEventStories,
    setViewingStories,
    isLoading,
    error,
    clearError
  } = useStoriesStore()

  const [showCreateStory, setShowCreateStory] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)

  useEffect(() => {
    console.log('StoriesBar mounted. eventId:', eventId);
    if (eventId) {
      fetchEventStories(eventId)
    } else {
      fetchFeed()
    }
    fetchMyStories()
  }, [eventId, fetchFeed, fetchMyStories, fetchEventStories])

  const handleMyStoryClick = () => {
    if (myStories.length > 0) {
      // View own stories - you could implement a separate viewer for own stories
      setShowStoryViewer(true)
      setViewingStories(true, -1, 0) // -1 for own stories
    } else {
      setShowCreateStory(true)
    }
  }

  const handleFeedItemClick = (feedIndex: number) => {
    setViewingStories(true, feedIndex, 0)
    setShowStoryViewer(true)
  }

  const handleRefresh = () => {
    clearError()
    fetchFeed()
    fetchMyStories()
  }

  const hasMyActiveStories = myStories.some(story => !storiesAPI.isStoryExpired(story.expiresAt))

  // Determine if the "My Story" button should be shown
  // Show if: no event context OR user is the event organizer
  const showMyStoryButton = !eventId || isEventOrganizer

  return (
    <>
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          {/* My Story - Only show if no event OR user is organizer */}
          {showMyStoryButton && (
            <button
              onClick={handleMyStoryClick}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className="relative">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg ${hasMyActiveStories
                  ? 'bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-0.5'
                  : 'bg-gray-200'
                  }`}>
                  {hasMyActiveStories ? (
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                        {user?.firstName?.[0] || '?'}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center relative">
                      <div className="text-gray-400 text-lg font-semibold">
                        {user?.firstName?.[0] || '?'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 text-center max-w-16 truncate">
                {hasMyActiveStories ? 'Tu historia' : eventId ? 'Historia del evento' : 'Agregar'}
              </span>
            </button>
          )}

          {/* Loading state */}
          {isLoading && feedItems.length === 0 && (
            <div className="flex gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
                  <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Feed Items */}
          {feedItems.map((feedItem, index) => (
            <motion.button
              key={feedItem.user._id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleFeedItemClick(index)}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className="relative">
                <div className={`w-16 h-16 rounded-full p-0.5 ${feedItem.hasUnviewed
                  ? 'bg-gradient-to-br from-purple-400 via-pink-400 to-red-400'
                  : 'bg-gray-300'
                  }`}>
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden">
                      {feedItem.user.avatar ? (
                        <img
                          src={feedItem.user.avatar}
                          alt={`${feedItem.user.firstName} ${feedItem.user.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                          {feedItem.user.firstName[0]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {feedItem.hasUnviewed && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                )}
              </div>

              <span className="text-xs text-gray-600 text-center max-w-16 truncate">
                {feedItem.user.firstName}
              </span>
            </motion.button>
          ))}

          {/* Refresh Button */}
          {feedItems.length > 0 && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-shrink-0 flex flex-col items-center gap-2 ml-2"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <RefreshCw className={`w-5 h-5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
              </div>
              <span className="text-xs text-gray-500">Actualizar</span>
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-red-600 text-sm">{error}</div>
              <button
                onClick={handleRefresh}
                className="text-red-600 text-sm font-medium hover:text-red-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && feedItems.length === 0 && !error && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📖</div>
            <div className="text-gray-600 text-sm">
              No hay historias disponibles
            </div>
            <div className="text-gray-400 text-xs mt-1">
              ¡Sé el primero en compartir una historia!
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateStory
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={() => {
          fetchMyStories()
          fetchFeed()
        }}
        eventId={eventId}
      />

      <StoryViewer
        isOpen={showStoryViewer}
        onClose={() => {
          setShowStoryViewer(false)
          setViewingStories(false)
        }}
      />
    </>
  )
}