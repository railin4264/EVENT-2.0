import { apiClient } from './client'
import type { Event, ApiResponse, PaginatedResponse } from '@/types/api.types'

export interface CreateEventData {
  title: string
  description: string
  category: string
  date: string
  endDate?: string
  location: {
    type: 'Point'
    coordinates: [number, number]
    address: string
    city?: string
    country?: string
  }
  images?: string[]
  maxAttendees?: number
  isPrivate: boolean
  tags: string[]
  price?: {
    amount: number
    currency: string
  }
}

export interface EventFilters {
  category?: string
  categories?: string | string[]
  excludeCategories?: string
  hidePolitical?: string | boolean
  hideReligious?: string | boolean
  search?: string
  timeFilter?: string
  isUnofficial?: string
  page?: number
  limit?: number
  [key: string]: any
}

export interface EventSearchFilters extends EventFilters {
  dateRange?: string
  priceRange?: string
  distance?: number
  attendees?: string
  rating?: number
  tags?: string
  isOnline?: boolean
  isFree?: boolean
  hasFood?: boolean
  hasDrinks?: boolean
  isWheelchairAccessible?: boolean
  isFamilyFriendly?: boolean
  sortBy?: string
  lat?: number
  lng?: number
  radius?: number
  categories?: string[]
  priceMin?: number
  priceMax?: number
  startDate?: string
  endDate?: string
}

export interface DiscoveryEvent extends Event {
  publicSource?: { name?: string; datasetUrl?: string; license?: string; licenseUrl?: string }
  distance?: number
}

// Get all events with pagination and filters
export const getEvents = async (filters: EventFilters = {}) => {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await apiClient.get<{
    success: boolean
    count: number
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
    events: Event[]
  }>(`/events?${params.toString()}`)
  
  return response.data
}

// Search events with advanced filters
export const searchEvents = async (filters: EventSearchFilters = {}) => {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })

  const response = await apiClient.get<{
    success: boolean
    count: number
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
    events: Event[]
  }>(`/events/search?${params.toString()}`)
  
  return response.data
}

// Get single event by ID
export const getEvent = async (id: string) => {
  const response = await apiClient.get<{
    success: boolean
    event: Event
  }>(`/events/${id}`)
  
  return response.data
}

// Create new event
export const createEvent = async (eventData: CreateEventData) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    event: Event
  }>('/events', eventData)
  
  return response.data
}

// Update event
export const updateEvent = async (id: string, eventData: Partial<CreateEventData>) => {
  const response = await apiClient.put<{
    success: boolean
    message: string
    event: Event
  }>(`/events/${id}`, eventData)
  
  return response.data
}

// Delete event
export const deleteEvent = async (id: string) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
  }>(`/events/${id}`)
  
  return response.data
}

// Attend event
export const attendEvent = async (id: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    event: Event
  }>(`/events/${id}/attend`)
  
  return response.data
}

// Leave event
export const leaveEvent = async (id: string) => {
  const response = await apiClient.delete<{
    success: boolean
    message: string
    event: Event
  }>(`/events/${id}/attend`)
  
  return response.data
}

// Add comment to event
export const addEventComment = async (id: string, content: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    comment: any
  }>(`/events/${id}/comments`, { content })
  
  return response.data
}

// Like/unlike event comment
export const toggleEventCommentLike = async (eventId: string, commentId: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
  }>(`/events/${eventId}/comments/${commentId}/like`)
  
  return response.data
}

// View event (for analytics)
export const viewEvent = async (id: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
  }>(`/events/${id}/view`)
  
  return response.data
}

// Share event
export const shareEvent = async (id: string, platform?: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
  }>(`/events/${id}/share`, { platform })
  
  return response.data
}

// Get discovery events with location-based filtering
export const getDiscoveryEvents = async (filters: EventSearchFilters = {}): Promise<DiscoveryEvent[]> => {
  const params = new URLSearchParams()

  // Add all filter parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.append(key, value.join(','))
        }
      } else {
        params.append(key, value.toString())
      }
    }
  })

  const response = await apiClient.get<{
    success: boolean
    count: number
    events: Event[]
  }>(`/events?${params.toString()}`)

  // Calculate distances if lat/lng provided
  if (Number.isFinite(filters.lat) && Number.isFinite(filters.lng) && response.data.events) {
    const eventsWithDistance = response.data.events.map(event => {
      const distance = event.location?.coordinates
        ? calculateDistance(
            filters.lat!,
            filters.lng!,
            event.location.coordinates[1], // latitude
            event.location.coordinates[0]  // longitude
          )
        : undefined

      return {
        ...event,
        distance
      }
    })

    return eventsWithDistance
  }

  return response.data.events as DiscoveryEvent[] || []
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Get event categories
export const getEventCategories = async (): Promise<string[]> => {
  try {
    const response = await apiClient.get<ApiResponse<string[]>>('/events/categories')
    return response.data.data || []
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return [
      'tecnología',
      'música', 
      'arte',
      'gastronomía',
      'deportes',
      'educación',
      'networking',
      'entretenimiento',
      'cultura',
      'salud'
    ]
  }
}
