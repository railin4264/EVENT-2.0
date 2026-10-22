'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  getEvents, 
  getEvent, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  attendEvent,
  leaveEvent,
  searchEvents,
  viewEvent,
  addEventComment,
  toggleEventCommentLike,
  type CreateEventData,
  type EventFilters,
  type EventSearchFilters
} from '@/lib/api/events'
import type { Event } from '@/types/api.types'

interface EventsState {
  events: Event[]
  currentEvent: Event | null
  userEvents: Event[]
  attendingEvents: Event[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  } | null
  
  // Actions
  fetchEvents: (filters?: EventFilters) => Promise<void>
  searchEventsAction: (filters?: EventSearchFilters) => Promise<void>
  fetchEvent: (id: string) => Promise<void>
  createEventAction: (eventData: CreateEventData) => Promise<Event>
  updateEventAction: (id: string, eventData: Partial<CreateEventData>) => Promise<Event>
  deleteEventAction: (id: string) => Promise<void>
  attendEventAction: (id: string) => Promise<void>
  leaveEventAction: (id: string) => Promise<void>
  addCommentAction: (eventId: string, content: string) => Promise<void>
  toggleCommentLikeAction: (eventId: string, commentId: string) => Promise<void>
  viewEventAction: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentEvent: () => void
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => {
      // One intent sequence covers both list APIs; obsolete requests never commit.
      let latestListRequest = 0
      return {
      events: [],
      currentEvent: null,
      userEvents: [],
      attendingEvents: [],
      isLoading: false,
      error: null,
      pagination: null,

      fetchEvents: async (filters: EventFilters = {}) => {
        const requestId = ++latestListRequest
        try {
          set({ isLoading: true, error: null })
          
          const response = await getEvents(filters)
          if (requestId !== latestListRequest) return
          
          set({
            events: response.events,
            pagination: response.pagination,
            isLoading: false,
          })
        } catch (error: any) {
          if (requestId !== latestListRequest) return
          const message = error.response?.data?.message || 'Failed to fetch events'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      searchEventsAction: async (filters: EventSearchFilters = {}) => {
        const requestId = ++latestListRequest
        try {
          set({ isLoading: true, error: null })
          
          const response = await searchEvents(filters)
          if (requestId !== latestListRequest) return
          
          set({
            events: response.events,
            pagination: response.pagination,
            isLoading: false,
          })
        } catch (error: any) {
          if (requestId !== latestListRequest) return
          const message = error.response?.data?.message || 'Failed to search events'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      fetchEvent: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await getEvent(id)
          
          // Track view
          await viewEvent(id).catch(() => {}) // Don't fail if view tracking fails
          
          set({
            currentEvent: response.event,
            isLoading: false,
          })
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to fetch event'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      createEventAction: async (eventData: CreateEventData) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await createEvent(eventData)
          
          // Add to events list
          set((state) => ({
            events: [response.event, ...state.events],
            userEvents: [response.event, ...state.userEvents],
            isLoading: false,
          }))
          
          return response.event
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to create event'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      updateEventAction: async (id: string, eventData: Partial<CreateEventData>) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await updateEvent(id, eventData)
          
          // Update in events list
          set((state) => ({
            events: state.events.map(event => 
              event._id === id ? response.event : event
            ),
            userEvents: state.userEvents.map(event => 
              event._id === id ? response.event : event
            ),
            currentEvent: state.currentEvent?._id === id ? response.event : state.currentEvent,
            isLoading: false,
          }))
          
          return response.event
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to update event'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      deleteEventAction: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          
          await deleteEvent(id)
          
          // Remove from events list
          set((state) => ({
            events: state.events.filter(event => event._id !== id),
            userEvents: state.userEvents.filter(event => event._id !== id),
            attendingEvents: state.attendingEvents.filter(event => event._id !== id),
            currentEvent: state.currentEvent?._id === id ? null : state.currentEvent,
            isLoading: false,
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to delete event'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      attendEventAction: async (id: string) => {
        try {
          set({ error: null })
          
          const response = await attendEvent(id)
          
          // Update event in all lists
          set((state) => ({
            events: state.events.map(event => 
              event._id === id ? response.event : event
            ),
            attendingEvents: response.event.attendees.some((a: any) => a.user === get().currentEvent?.createdBy._id) 
              ? [...state.attendingEvents, response.event]
              : state.attendingEvents,
            currentEvent: state.currentEvent?._id === id ? response.event : state.currentEvent,
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to join event'
          set({ error: message })
          throw error
        }
      },

      leaveEventAction: async (id: string) => {
        try {
          set({ error: null })
          
          const response = await leaveEvent(id)
          
          // Update event in all lists
          set((state) => ({
            events: state.events.map(event => 
              event._id === id ? response.event : event
            ),
            attendingEvents: state.attendingEvents.filter(event => event._id !== id),
            currentEvent: state.currentEvent?._id === id ? response.event : state.currentEvent,
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to leave event'
          set({ error: message })
          throw error
        }
      },

      addCommentAction: async (eventId: string, content: string) => {
        try {
          const response = await addEventComment(eventId, content)
          
          // Refresh the current event to get updated comments
          if (get().currentEvent?._id === eventId) {
            await get().fetchEvent(eventId)
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to add comment'
          set({ error: message })
          throw error
        }
      },

      toggleCommentLikeAction: async (eventId: string, commentId: string) => {
        try {
          await toggleEventCommentLike(eventId, commentId)
          
          // Refresh the current event to get updated likes
          if (get().currentEvent?._id === eventId) {
            await get().fetchEvent(eventId)
          }
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to toggle like'
          set({ error: message })
          throw error
        }
      },

      viewEventAction: async (id: string) => {
        try {
          await viewEvent(id)
        } catch (error) {
          // Silently fail - view tracking is not critical
        }
      },

      clearError: () => {
        set({ error: null })
      },

      clearCurrentEvent: () => {
        set({ currentEvent: null })
      },
      }
    },
    {
      name: 'events-storage',
      partialize: (state) => ({
        userEvents: state.userEvents,
        attendingEvents: state.attendingEvents,
      }),
    }
  )
)