// ============================================================
// GEOLOCATION-BASED NOTIFICATIONS SYSTEM
// Handles location tracking and nearby event notifications
// ============================================================

import { notificationsService } from './api/services/notifications.service'
import { eventsService } from './api/services/events.service'

interface LocationNotificationConfig {
  enabled: boolean
  radiusKm: number
  checkIntervalMinutes: number
  categories: string[]
}

interface NearbyEvent {
  eventId: string
  title: string
  distance: number
  category: string
}

class GeolocationNotificationService {
  private watchId: number | null = null
  private generation = 0
  private lastNotificationCheck: Date | null = null
  private notifiedEvents: Set<string> = new Set()
  private config: LocationNotificationConfig = {
    enabled: false,
    radiusKm: 2, // Default: notify for events within 2km
    checkIntervalMinutes: 30, // Check every 30 minutes
    categories: [] // Empty = all categories
  }

  /**
   * Initialize location-based notifications
   */
  async initialize(config?: Partial<LocationNotificationConfig>): Promise<boolean> {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      console.warn('Geolocation not available')
      return false
    }

    const generation = this.generation
    if (!('Notification' in window) || Notification.permission !== 'granted') return false
    try {
      if (!navigator.permissions || (await navigator.permissions.query({ name: 'geolocation' })).state !== 'granted') return false
    } catch { return false }
    if (generation !== this.generation) return false

    // Update config
    if (config) {
      this.config = { ...this.config, ...config }
    }

    if (!this.config.enabled) return false
    // Both permissions already exist; this does not request a new one.
    this.startWatching()

    // Load previously notified events from localStorage
    try {
      const stored = localStorage.getItem('notified_events')
      if (stored) {
        this.notifiedEvents = new Set(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Could not load notified events from storage')
    }

    return true
  }

  /**
   * Start watching user position
   */
  private startWatching(): void {
    if (this.watchId !== null) return

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.onLocationUpdate(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        if (error.code === 1) this.stopWatching()
      },
      {
        enableHighAccuracy: false, // Don't drain battery
        maximumAge: 300000, // 5 minutes
        timeout: 10000
      }
    )
  }

  /**
   * Stop watching user position
   */
  stopWatching(): void {
    this.generation++
    this.config.enabled = false
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  /**
   * Called when user location updates
   */
  private async onLocationUpdate(lat: number, lng: number): Promise<void> {
    if (!this.config.enabled) return

    // Check if enough time has passed since last check
    const now = new Date()
    if (this.lastNotificationCheck) {
      const minutesSinceLastCheck = (now.getTime() - this.lastNotificationCheck.getTime()) / 60000
      if (minutesSinceLastCheck < this.config.checkIntervalMinutes) {
        return // Too soon to check again
      }
    }

    this.lastNotificationCheck = now

    try {
      // Fetch nearby events
      const response = await eventsService.getNearbyEvents({
        latitude: lat,
        longitude: lng,
        radius: this.config.radiusKm,
        limit: 20
      })

      if (!this.config.enabled || !response.success || !response.data) return

      const nearbyEvents = response.data
        .filter(event => {
          // Filter by categories if specified
          if (this.config.categories.length > 0) {
            return this.config.categories.includes(event.category)
          }
          return true
        })
        .filter(event => {
          // Only notify for events that haven't been notified yet
          return !this.notifiedEvents.has(event._id)
        })
        .filter(event => {
          // Only notify for upcoming events
          const eventDate = new Date(event.date)
          return eventDate > now
        })
        .slice(0, 3) // Max 3 notifications at once

      // Send notifications for new nearby events
      for (const event of nearbyEvents) {
        this.sendNotification(event, lat, lng)
        this.notifiedEvents.add(event._id)
      }

      // Persist notified events
      this.saveNotifiedEvents()

    } catch (error) {
      console.error('Error checking nearby events:', error)
    }
  }

  /**
   * Send browser notification for nearby event
   */
  private sendNotification(event: any, userLat: number, userLng: number): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    // Calculate distance
    const [eventLng, eventLat] = event.location.coordinates
    const distance = this.calculateDistance(userLat, userLng, eventLat, eventLng)
    const distanceText = distance < 1
      ? `${Math.round(distance * 1000)} metros`
      : `${distance.toFixed(1)} km`

    // Get category emoji
    const categoryEmojis: { [key: string]: string } = {
      'tecnología': '💻',
      'música': '🎵',
      'arte': '🎨',
      'gastronomía': '🍴',
      'deportes': '⚽',
      'educación': '📚',
      'networking': '🤝',
      'entretenimiento': '🎭',
      'cultura': '🎪',
      'salud': '❤️'
    }
    const emoji = categoryEmojis[event.category.toLowerCase()] || '📍'

    const notification = new Notification(`${emoji} Evento cerca de ti`, {
      body: `${event.title} - A solo ${distanceText}`,
      icon: event.images?.[0]?.url || '/logo.png',
      tag: event._id,
      requireInteraction: false,
      data: {
        eventId: event._id,
        url: `/events/${event._id}`
      }
    })

    notification.onclick = (e) => {
      e.preventDefault()
      window.focus()
      window.location.href = `/events/${event._id}`
      notification.close()
    }

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000)
  }

  /**
   * Calculate distance using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Save notified events to localStorage
   */
  private saveNotifiedEvents(): void {
    try {
      localStorage.setItem('notified_events', JSON.stringify(Array.from(this.notifiedEvents)))
    } catch (error) {
      console.warn('Could not save notified events to storage')
    }
  }

  /**
   * Update notification config
   */
  updateConfig(config: Partial<LocationNotificationConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.enabled !== undefined) {
      if (config.enabled) {
        void this.initialize(this.config)
      } else {
        this.stopWatching()
      }
    }
  }

  /**
   * Get current config
   */
  getConfig(): LocationNotificationConfig {
    return { ...this.config }
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.notifiedEvents.clear()
    try {
      localStorage.removeItem('notified_events')
    } catch (error) {
      console.warn('Could not clear notification history from storage')
    }
  }

  /**
   * Check notification permission status
   */
  getPermissionStatus(): NotificationPermission | null {
    if ('Notification' in window) {
      return Notification.permission
    }
    return null
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission()
    }
    return 'denied'
  }
}

// Export singleton instance
export const geolocationNotifications = new GeolocationNotificationService()
