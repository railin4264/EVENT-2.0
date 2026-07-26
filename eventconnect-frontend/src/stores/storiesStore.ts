'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as storiesAPI from '@/lib/api/stories'
import type { Story, StoryFeedItem, CreateStoryData, CreateTextStoryData } from '@/lib/api/stories'

interface StoriesState {
  // Stories data
  feedItems: StoryFeedItem[]
  myStories: Story[]
  currentStory: Story | null
  viewingUserStories: Story[]
  
  // UI state
  isLoading: boolean
  isCreating: boolean
  error: string | null
  selectedFeedIndex: number
  selectedStoryIndex: number
  isViewingStories: boolean
  
  // Creation state
  isCreatingStory: boolean
  creationStep: 'media' | 'text' | 'details' | 'preview'
  
  // Actions
  fetchFeed: (page?: number) => Promise<void>
  fetchEventStories: (eventId: string) => Promise<void>
  fetchMyStories: () => Promise<void>
  fetchUserStories: (userId: string) => Promise<void>
  createStory: (data: CreateStoryData) => Promise<Story>
  createTextStory: (data: CreateTextStoryData) => Promise<Story>
  viewStory: (storyId: string) => Promise<void>
  reactToStory: (storyId: string, type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry') => Promise<void>
  removeStoryReaction: (storyId: string) => Promise<void>
  deleteStory: (storyId: string) => Promise<void>
  
  // Navigation actions
  setCurrentStory: (story: Story | null) => void
  setViewingStories: (isViewing: boolean, feedIndex?: number, storyIndex?: number) => void
  nextStory: () => void
  prevStory: () => void
  nextUser: () => void
  prevUser: () => void
  
  // Creation actions
  setCreatingStory: (isCreating: boolean, step?: StoriesState['creationStep']) => void
  
  // Utility actions
  clearError: () => void
  updateStoryInFeed: (storyId: string, updates: Partial<Story>) => void
  markStoryAsViewed: (storyId: string) => void
}

export const useStoriesStore = create<StoriesState>()(
  persist(
    (set, get) => ({
      // Initial state
      feedItems: [],
      myStories: [],
      currentStory: null,
      viewingUserStories: [],
      isLoading: false,
      isCreating: false,
      error: null,
      selectedFeedIndex: 0,
      selectedStoryIndex: 0,
      isViewingStories: false,
      isCreatingStory: false,
      creationStep: 'media',

      // Fetch actions
      fetchFeed: async (page = 1) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await storiesAPI.getStoriesFeed(page)
          
          // Calculate time remaining for each story
          const feedWithTimeRemaining = response.data.map(feedItem => ({
            ...feedItem,
            stories: feedItem.stories.map(story => ({
              ...story,
              timeRemaining: storiesAPI.getTimeRemaining(story.expiresAt)
            }))
          }))
          
          set({
            feedItems: page === 1 ? feedWithTimeRemaining : [...get().feedItems, ...feedWithTimeRemaining],
            isLoading: false
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al cargar historias',
            isLoading: false
          })
        }
      },

      fetchEventStories: async (eventId: string) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await storiesAPI.getEventStories(eventId)
          
          const storiesWithTimeRemaining = response.stories.map(story => ({
            ...story,
            timeRemaining: storiesAPI.getTimeRemaining(story.expiresAt)
          }))
          
          // Create a feed item for the event
          const eventAvatar =
            storiesWithTimeRemaining[0]?.media?.[0]?.thumbnail ||
            storiesWithTimeRemaining[0]?.media?.[0]?.url ||
            ''

          const eventFeedItem: StoryFeedItem = {
            user: {
              _id: 'event',
              username: 'Event Stories',
              firstName: 'Historias',
              lastName: 'del Evento',
              avatar: eventAvatar
            },
            stories: storiesWithTimeRemaining,
            hasUnviewed: storiesWithTimeRemaining.some(s => !s.isViewed),
            latestStory: storiesWithTimeRemaining[0]?.createdAt || new Date(),
            storyCount: storiesWithTimeRemaining.length
          }

          set({
            feedItems: [eventFeedItem], // Only show event stories
            isLoading: false
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al cargar historias del evento',
            isLoading: false
          })
        }
      },

      fetchMyStories: async () => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await storiesAPI.getMyStories()
          
          const storiesWithTimeRemaining = (response.stories || []).map((story: any) => ({
            ...story,
            timeRemaining: storiesAPI.getTimeRemaining(story.expiresAt)
          }))
          
          set({
            myStories: storiesWithTimeRemaining,
            isLoading: false
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al cargar tus historias',
            isLoading: false
          })
        }
      },

      fetchUserStories: async (userId: string) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await storiesAPI.getUserStories(userId)
          
          const storiesWithTimeRemaining = response.data.map(story => ({
            ...story,
            timeRemaining: storiesAPI.getTimeRemaining(story.expiresAt)
          }))
          
          set({
            viewingUserStories: storiesWithTimeRemaining,
            isLoading: false
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al cargar historias del usuario',
            isLoading: false
          })
        }
      },

      createStory: async (data: CreateStoryData) => {
        try {
          set({ isCreating: true, error: null })
          
          const response = await storiesAPI.createStory(data)
          
          // Add to my stories
          set((state) => ({
            myStories: [response.data, ...state.myStories],
            isCreating: false,
            isCreatingStory: false
          }))
          
          return response.data
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al crear historia',
            isCreating: false
          })
          throw error
        }
      },

      createTextStory: async (data: CreateTextStoryData) => {
        try {
          set({ isCreating: true, error: null })
          
          const response = await storiesAPI.createTextStory(data)
          
          // Add to my stories
          set((state) => ({
            myStories: [response.data, ...state.myStories],
            isCreating: false,
            isCreatingStory: false
          }))
          
          return response.data
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al crear historia de texto',
            isCreating: false
          })
          throw error
        }
      },

      viewStory: async (storyId: string) => {
        try {
          await storiesAPI.viewStory(storyId)
          
          // Mark story as viewed in local state
          get().markStoryAsViewed(storyId)
        } catch (error: any) {
          console.error('Error viewing story:', error)
        }
      },

      reactToStory: async (storyId: string, type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry') => {
        try {
          const response = await storiesAPI.reactToStory(storyId, type)
          
          // Update story in local state
          get().updateStoryInFeed(storyId, {
            hasReacted: true,
            reactions: response.data.reactionCount
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al reaccionar a la historia'
          })
        }
      },

      removeStoryReaction: async (storyId: string) => {
        try {
          const response = await storiesAPI.removeStoryReaction(storyId)
          
          // Update story in local state
          get().updateStoryInFeed(storyId, {
            hasReacted: false,
            reactions: response.data.reactionCount
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al quitar reacción'
          })
        }
      },

      deleteStory: async (storyId: string) => {
        try {
          await storiesAPI.deleteStory(storyId)
          
          // Remove from my stories
          set((state) => ({
            myStories: state.myStories.filter(story => story._id !== storyId)
          }))
          
          // Remove from feed if present
          set((state) => ({
            feedItems: state.feedItems.map(feedItem => ({
              ...feedItem,
              stories: feedItem.stories.filter(story => story._id !== storyId)
            })).filter(feedItem => feedItem.stories.length > 0)
          }))
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Error al eliminar historia'
          })
        }
      },

      // Navigation actions
      setCurrentStory: (story: Story | null) => {
        set({ currentStory: story })
      },

      setViewingStories: (isViewing: boolean, feedIndex = 0, storyIndex = 0) => {
        set({
          isViewingStories: isViewing,
          selectedFeedIndex: feedIndex,
          selectedStoryIndex: storyIndex
        })
        
        if (isViewing) {
          const { feedItems } = get()
          const currentFeedItem = feedItems[feedIndex]
          if (currentFeedItem && currentFeedItem.stories[storyIndex]) {
            const story = currentFeedItem.stories[storyIndex]
            get().setCurrentStory(story)
            get().viewStory(story._id)
          }
        } else {
          get().setCurrentStory(null)
        }
      },

      nextStory: () => {
        const { feedItems, selectedFeedIndex, selectedStoryIndex } = get()
        const currentFeedItem = feedItems[selectedFeedIndex]
        
        if (!currentFeedItem) return
        
        if (selectedStoryIndex < currentFeedItem.stories.length - 1) {
          // Move to next story in current user's stories
          const newStoryIndex = selectedStoryIndex + 1
          const story = currentFeedItem?.stories[newStoryIndex]
          
          set({ selectedStoryIndex: newStoryIndex })
          get().setCurrentStory(story || null)
          if (story) {
            get().viewStory(story._id)
          }
        } else {
          // Move to next user
          get().nextUser()
        }
      },

      prevStory: () => {
        const { selectedStoryIndex } = get()
        
        if (selectedStoryIndex > 0) {
          // Move to previous story in current user's stories
          const newStoryIndex = selectedStoryIndex - 1
          const { feedItems, selectedFeedIndex } = get()
          const currentFeedItem = feedItems[selectedFeedIndex]
          const story = currentFeedItem?.stories[newStoryIndex]
          
          set({ selectedStoryIndex: newStoryIndex })
          get().setCurrentStory(story || null)
          if (story) {
            get().viewStory(story._id)
          }
        } else {
          // Move to previous user
          get().prevUser()
        }
      },

      nextUser: () => {
        const { feedItems, selectedFeedIndex } = get()
        
        if (selectedFeedIndex < feedItems.length - 1) {
          const newFeedIndex = selectedFeedIndex + 1
          const newFeedItem = feedItems[newFeedIndex]
          const firstStory = newFeedItem?.stories[0]
          
          set({
            selectedFeedIndex: newFeedIndex,
            selectedStoryIndex: 0
          })
          
          get().setCurrentStory(firstStory || null)
          if (firstStory) {
            get().viewStory(firstStory._id)
          }
        }
      },

      prevUser: () => {
        const { feedItems, selectedFeedIndex } = get()
        
        if (selectedFeedIndex > 0) {
          const newFeedIndex = selectedFeedIndex - 1
          const newFeedItem = feedItems[newFeedIndex]
          const lastStoryIndex = newFeedItem?.stories.length ? newFeedItem.stories.length - 1 : 0
          const lastStory = newFeedItem?.stories[lastStoryIndex]
          
          set({
            selectedFeedIndex: newFeedIndex,
            selectedStoryIndex: lastStoryIndex
          })
          
          get().setCurrentStory(lastStory || null)
          if (lastStory) {
            get().viewStory(lastStory._id)
          }
        }
      },

      // Creation actions
      setCreatingStory: (isCreating: boolean, step = 'media') => {
        set({
          isCreatingStory: isCreating,
          creationStep: step
        })
      },

      // Utility actions
      clearError: () => {
        set({ error: null })
      },

      updateStoryInFeed: (storyId: string, updates: Partial<Story>) => {
        set((state) => ({
          feedItems: state.feedItems.map(feedItem => ({
            ...feedItem,
            stories: feedItem.stories.map(story =>
              story._id === storyId ? { ...story, ...updates } : story
            )
          })),
          myStories: state.myStories.map(story =>
            story._id === storyId ? { ...story, ...updates } : story
          ),
          viewingUserStories: state.viewingUserStories.map(story =>
            story._id === storyId ? { ...story, ...updates } : story
          )
        }))
      },

      markStoryAsViewed: (storyId: string) => {
        get().updateStoryInFeed(storyId, { isViewed: true })
        
        // Update hasUnviewed status for feed items
        set((state) => ({
          feedItems: state.feedItems.map(feedItem => {
            const hasUnviewedStory = feedItem.stories.some(story => 
              story._id === storyId ? false : !story.isViewed
            )
            
            return {
              ...feedItem,
              hasUnviewed: hasUnviewedStory
            }
          })
        }))
      },
    }),
    {
      name: 'stories-storage',
      partialize: (state) => ({
        myStories: state.myStories.filter(story => !storiesAPI.isStoryExpired(story.expiresAt)),
      }),
    }
  )
)