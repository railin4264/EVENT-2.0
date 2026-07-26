'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAnalytics } from '@/components/providers/AnalyticsProvider'

const FAVORITES_KEY = 'eventconnect_favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const { trackEventInteraction } = useAnalytics()

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setFavorites(new Set(parsed))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)))
      } catch (error) {
        console.error('Error saving favorites:', error)
      }
    }
  }, [favorites, isLoading])

  const toggleFavorite = useCallback((eventId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      const isAdding = !newFavorites.has(eventId)

      if (isAdding) {
        newFavorites.add(eventId)
        trackEventInteraction?.('favorite', eventId, { action: 'add' })
      } else {
        newFavorites.delete(eventId)
        trackEventInteraction?.('favorite', eventId, { action: 'remove' })
      }

      return newFavorites
    })
  }, [trackEventInteraction])

  const isFavorite = useCallback((eventId: string) => {
    return favorites.has(eventId)
  }, [favorites])

  const clearFavorites = useCallback(() => {
    setFavorites(new Set())
    trackEventInteraction?.('favorite', 'all', { action: 'clear_all' })
  }, [trackEventInteraction])

  return {
    favorites: Array.from(favorites),
    toggleFavorite,
    isFavorite,
    clearFavorites,
    isLoading,
    count: favorites.size
  }
}
