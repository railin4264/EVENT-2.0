'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { geolocationNotifications } from '@/lib/geolocation-notifications'
import { useLiveLocation } from '@/hooks/useLiveLocation'
import { useDiscoveryArea } from '@/stores/discoveryAreaStore'
import { WORLD_AREA } from '@/lib/discovery-area'

export default function GeolocationNotificationProvider() {
  const { user, isAuthenticated } = useAuth()
  const { location, syncToBackend } = useLiveLocation(true)
  const { area, initialized, setArea } = useDiscoveryArea()
  const hasAutoSetDiscoveryRef = useRef(false)

  // Sync live GPS coordinates into discoveryArea when user gets a real GPS fix and hasn't locked another city
  useEffect(() => {
    if (!initialized || hasAutoSetDiscoveryRef.current) return
    if (location.source === 'gps' && area.kind === WORLD_AREA.kind) {
      hasAutoSetDiscoveryRef.current = true
      setArea({
        kind: 'nearby',
        label: `Cerca de ti · ${location.city}`,
        lat: location.lat,
        lng: location.lng,
        radius: 50,
        source: 'gps'
      })
    }
  }, [initialized, location, area.kind, setArea])

  // Sync confirmed location separately from notification lifecycle.
  useEffect(() => { if (isAuthenticated && user) void syncToBackend(location) }, [isAuthenticated, user?.id, location, syncToBackend])

  const pushEnabled = (user as any)?.settings?.notifications?.push === true
  // Background initialization never opens permission prompts.
  useEffect(() => {
    if (!isAuthenticated || !user || !pushEnabled) { geolocationNotifications.stopWatching(); return }

    const initializeNotifications = async () => {
      try {
        await geolocationNotifications.initialize({
          enabled: true,
          radiusKm: 10,
          checkIntervalMinutes: 20,
          categories: []
        })
      } catch (error) {
        console.warn('Error initializing geolocation notifications:', error)
      }
    }

    void initializeNotifications()

    return () => {
      geolocationNotifications.stopWatching()
    }
  }, [isAuthenticated, user?.id, user?._id, pushEnabled])

  return null
}
