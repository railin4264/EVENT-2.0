// ============================================================
// EVENTS SERVICE
// Handles all event-related API calls
// ============================================================

import { apiClient } from '../client'
import { API_ENDPOINTS, API_CONFIG } from '@/lib/config'
import type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  EventFilters,
  Comment,
  CreateCommentRequest,
  ApiResponse,
  PaginatedResponse,
  PublicUser,
  AttendeeStatus,
} from '@/types/models'

class EventsService {
  /**
   * Get list of events with optional filters
   */
  async getEvents(filters?: EventFilters): Promise<PaginatedResponse<Event>> {
    const params = {
      page: filters?.page || API_CONFIG.PAGINATION.DEFAULT_PAGE,
      limit: filters?.limit || API_CONFIG.PAGINATION.DEFAULT_LIMIT,
      ...filters,
    }

    const response = await apiClient.get<PaginatedResponse<Event>>(
      API_ENDPOINTS.EVENTS.LIST,
      { params }
    )

    return response.data
  }

  /**
   * Get cached list of events (faster for repeated requests)
   */
  async getCachedEvents(filters?: EventFilters): Promise<Event[]> {
    const cacheKey = API_ENDPOINTS.EVENTS.LIST
    const params = {
      page: filters?.page || API_CONFIG.PAGINATION.DEFAULT_PAGE,
      limit: filters?.limit || API_CONFIG.PAGINATION.DEFAULT_LIMIT,
      ...filters,
    }

    return await apiClient.getCached<Event[]>(cacheKey, params, true)
  }

  /**
   * Search events
   */
  async searchEvents(query: string, filters?: EventFilters): Promise<PaginatedResponse<Event>> {
    const params = {
      search: query,
      page: filters?.page || API_CONFIG.PAGINATION.DEFAULT_PAGE,
      limit: filters?.limit || API_CONFIG.PAGINATION.DEFAULT_LIMIT,
      ...filters,
    }

    const response = await apiClient.get<PaginatedResponse<Event>>(
      API_ENDPOINTS.EVENTS.SEARCH,
      { params }
    )

    return response.data
  }

  /**
   * Get nearby events based on geolocation
   */
  async getNearbyEvents(params: {
    latitude: number
    longitude: number
    radius: number
    limit?: number
  }): Promise<ApiResponse<Event[]>> {
    const response = await apiClient.get<ApiResponse<Event[]>>(
      API_ENDPOINTS.EVENTS.NEARBY,
      {
        params: {
          lat: params.latitude,
          lng: params.longitude,
          radius: params.radius,
          limit: params.limit
        }
      }
    )

    return response.data
  }

  /**
   * Get favorite events for current user
   */
  async getFavoriteEvents(): Promise<Event[]> {
    const response = await apiClient.get<ApiResponse<Event[]>>(
      API_ENDPOINTS.EVENTS.FAVORITES
    )

    return response.data.data || []
  }

  /**
   * Create a new event
   */
  async createEvent(data: CreateEventRequest): Promise<Event> {
    const response = await apiClient.post<ApiResponse<Event>>(
      API_ENDPOINTS.EVENTS.CREATE,
      data
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to create event')
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<Event> {
    const response = await apiClient.get<ApiResponse<Event>>(
      API_ENDPOINTS.EVENTS.GET(id)
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Event not found')
  }

  /**
   * Update event
   */
  async updateEvent(id: string, data: UpdateEventRequest): Promise<Event> {
    const response = await apiClient.put<ApiResponse<Event>>(
      API_ENDPOINTS.EVENTS.UPDATE(id),
      data
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to update event')
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.EVENTS.DELETE(id))
  }

  /**
   * Attend an event
   */
  async attendEvent(id: string, status: 'attending' | 'maybe' | 'not-attending' = 'attending'): Promise<Event> {
    const response = await apiClient.post<ApiResponse<Event>>(
      API_ENDPOINTS.EVENTS.ATTEND(id),
      { status }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to attend event')
  }

  /**
   * Join an event (alternative to attend)
   */
  async joinEvent(id: string): Promise<Event> {
    const response = await apiClient.post<ApiResponse<Event>>(
      API_ENDPOINTS.EVENTS.JOIN(id)
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to join event')
  }

  /**
   * Leave an event
   */
  async leaveEvent(id: string): Promise<Event> {
    const response = await apiClient.post<ApiResponse<Event>>(
      API_ENDPOINTS.EVENTS.LEAVE(id)
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to leave event')
  }

  /**
   * Toggle favorite status for an event
   */
  async toggleFavorite(id: string): Promise<Event> {
    const response = await apiClient.post<ApiResponse<Event>>(
      API_ENDPOINTS.EVENTS.FAVORITE(id)
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to favorite event')
  }

  /**
   * Get event attendees
   */
  async getEventAttendees(id: string): Promise<PublicUser[]> {
    const response = await apiClient.get<ApiResponse<PublicUser[]>>(
      API_ENDPOINTS.EVENTS.ATTENDEES(id)
    )

    return response.data.data || []
  }

  /**
   * Get event comments
   */
  async getEventComments(id: string): Promise<Comment[]> {
    const response = await apiClient.get<ApiResponse<Comment[]>>(
      API_ENDPOINTS.EVENTS.COMMENTS(id)
    )

    return response.data.data || []
  }

  /**
   * Create a comment on an event
   */
  async createComment(id: string, content: string): Promise<Comment> {
    const response = await apiClient.post<ApiResponse<Comment>>(
      API_ENDPOINTS.EVENTS.COMMENTS(id),
      { content } as CreateCommentRequest
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error(response.data.message || 'Failed to create comment')
  }

  /**
   * Delete a comment
   */
  async deleteComment(eventId: string, commentId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.EVENTS.COMMENT(eventId, commentId))
  }

  /**
   * Register a view for an event
   */
  async registerView(id: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.EVENTS.VIEW(id))
    } catch (error) {
      // Silently fail - view tracking is not critical
      console.error('Failed to register view:', error)
    }
  }

  /**
   * Register a share for an event
   */
  async registerShare(id: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.EVENTS.SHARE(id))
    } catch (error) {
      // Silently fail - share tracking is not critical
      console.error('Failed to register share:', error)
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Check if user is attending an event
   */
  isUserAttending(event: Event, userId: string): boolean {
    return event.attendees.some(
      (attendee) =>
        (typeof attendee.user === 'string' ? attendee.user : attendee.user._id) === userId &&
        attendee.status === 'attending'
    )
  }

  /**
   * Get user's attendance status for an event
   */
  getUserAttendanceStatus(
    event: Event,
    userId: string
  ): AttendeeStatus | null {
    const attendee = event.attendees.find(
      (a) => (typeof a.user === 'string' ? a.user : a.user._id) === userId
    )
    return attendee ? attendee.status : null
  }

  /**
   * Check if event is full
   */
  isEventFull(event: Event): boolean {
    if (!event.maxAttendees) return false
    return event.attendeesCount >= event.maxAttendees
  }

  /**
   * Check if event has started
   */
  hasEventStarted(event: Event): boolean {
    return new Date(event.date) < new Date()
  }

  /**
   * Check if event has ended
   */
  hasEventEnded(event: Event): boolean {
    const endDate = event.endDate ? new Date(event.endDate) : new Date(event.date)
    return endDate < new Date()
  }

  /**
   * Get time until event starts
   */
  getTimeUntilEvent(event: Event): number {
    return new Date(event.date).getTime() - Date.now()
  }

  /**
   * Format event date range
   */
  formatEventDateRange(event: Event): string {
    const startDate = new Date(event.date)
    const endDate = event.endDate ? new Date(event.endDate) : null

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }

    if (!endDate) {
      return startDate.toLocaleDateString('en-US', options)
    }

    const startStr = startDate.toLocaleDateString('en-US', options)
    const endStr = endDate.toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })

    return `${startStr} - ${endStr}`
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLng = this.toRad(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

// Export singleton instance
export const eventsService = new EventsService()
