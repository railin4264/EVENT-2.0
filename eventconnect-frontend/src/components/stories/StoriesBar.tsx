'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { eventSignInHref } from '@/components/events/event-detail-utils'
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
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const identity = isAuthenticated ? user?.id || user?._id : undefined
  const requestSignIn = () => router.push(eventId ? eventSignInHref(eventId) : `/login?redirect=${encodeURIComponent(pathname || '/')}`)

  // Check if current user is the event organizer
  const isEventOrganizer = event && user && event.createdBy?._id === (user.id || user._id)
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

  const refreshStories = () => {
    if (eventId) {
      void fetchEventStories(eventId)
    } else if (identity) {
      void fetchFeed()
    }
    if (identity) void fetchMyStories()
  }

  useEffect(() => {
    // Never retain the previous account's private stories or viewer when identity changes.
    useStoriesStore.setState({ myStories: [], feedItems: [], currentStory: null, isViewingStories: false, error: null })
    setShowCreateStory(false)
    setShowStoryViewer(false)
    if (eventId) void fetchEventStories(eventId)
    else if (identity) void fetchFeed()
    if (identity) void fetchMyStories()
  }, [eventId, identity, fetchFeed, fetchMyStories, fetchEventStories])

  const handleMyStoryClick = () => {
    if (!identity) { requestSignIn(); return }
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
    refreshStories()
  }

  const hasMyActiveStories = myStories.some(story => !storiesAPI.isStoryExpired(story.expiresAt))

  // Determine if the "My Story" button should be shown
  // Show if: no event context OR user is the event organizer
  const showMyStoryButton = Boolean(identity) && (!eventId || isEventOrganizer)

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
          {/* My Story - Only show if no event OR user is organizer */}
          {showMyStoryButton && (
            <button
              onClick={handleMyStoryClick}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className="relative">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg ${hasMyActiveStories
                  ? 'bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-0.5'
                  : 'bg-muted border border-border'
                  }`}>
                  {hasMyActiveStories ? (
                    <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
                      <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-semibold">
                        {user?.firstName?.[0] || '?'}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-muted rounded-full flex items-center justify-center relative">
                      <div className="text-muted-foreground text-lg font-semibold">
                        {user?.firstName?.[0] || '?'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground text-center max-w-16 truncate">
                {hasMyActiveStories ? 'Tu historia' : eventId ? 'Historia del evento' : 'Agregar'}
              </span>
            </button>
          )}

          {/* Loading state */}
          {isLoading && feedItems.length === 0 && (
            <div className="flex gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-muted rounded-full animate-pulse" />
                  <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Feed Items */}
          {feedItems.map((feedItem, index) => feedItem?.user && (
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
                  : 'bg-muted-foreground/30'
                  }`}>
                  <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden">
                      {feedItem.user.avatar ? (
                        <img
                          src={feedItem.user.avatar}
                          alt={`${feedItem.user.firstName} ${feedItem.user.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
                          {feedItem.user.firstName?.[0] || 'H'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {feedItem.hasUnviewed && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background" />
                )}
              </div>

              <span className="text-xs text-muted-foreground text-center max-w-16 truncate">
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
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors">
                <RefreshCw className={`w-5 h-5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
              </div>
              <span className="text-xs text-muted-foreground">Actualizar</span>
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-destructive text-sm">{error}</div>
              <button
                onClick={handleRefresh}
                className="text-destructive text-sm font-medium hover:underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && feedItems.length === 0 && !error && (
          <div className="text-center py-6">
            <div className="text-2xl mb-1">📖</div>
            <div className="text-foreground text-sm font-medium">
              No hay historias disponibles
            </div>
            <div className="text-muted-foreground text-xs mt-1">
              ¡Sé el primero en compartir una historia de tus eventos!
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateStory && identity && <CreateStory
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={() => {
          refreshStories()
        }}
        eventId={eventId}
      />}

      {showStoryViewer && <StoryViewer
        isOpen={showStoryViewer}
        onClose={() => {
          setShowStoryViewer(false)
          setViewingStories(false)
        }}
      />}
    </>
  )
}