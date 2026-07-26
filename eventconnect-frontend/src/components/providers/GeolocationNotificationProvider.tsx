'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { geolocationNotifications } from '@/lib/geolocation-notifications'
import { toast } from 'react-hot-toast'

export default function GeolocationNotificationProvider() {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    // Only initialize if user is authenticated
    if (!isAuthenticated || !user) return

    // Initialize geolocation notifications
    const initializeNotifications = async () => {
      try {
        const initialized = await geolocationNotifications.initialize({
          enabled: true,
          radiusKm: 2, // 2km radius
          checkIntervalMinutes: 30, // Check every 30 minutes
          categories: [] // All categories
        })

        if (initialized) {
          console.log('Geolocation notifications initialized')
        } else {
          console.warn('Could not initialize geolocation notifications')
        }
      } catch (error) {
        console.error('Error initializing geolocation notifications:', error)
      }
    }

    initializeNotifications()

    // Cleanup on unmount
    return () => {
      geolocationNotifications.stopWatching()
    }
  }, [isAuthenticated, user])

  return null // This is a provider component, no UI
}
