'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { AREA_STORAGE_KEY, WORLD_AREA, validArea, type DiscoveryArea } from '@/lib/discovery-area'

interface AreaState {
  area: DiscoveryArea
  initialized: boolean
  initialize: () => void
  setArea: (area: DiscoveryArea) => void
}

export const useDiscoveryAreaStore = create<AreaState>((set, get) => ({
  area: WORLD_AREA,
  initialized: false,
  initialize: () => {
    if (get().initialized || typeof window === 'undefined') return
    let area = WORLD_AREA
    try { area = validArea(JSON.parse(localStorage.getItem(AREA_STORAGE_KEY) || 'null')) || WORLD_AREA } catch { /* Storage is optional. */ }
    set({ area, initialized: true })
  },
  setArea: area => {
    try { localStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(area.kind === 'nearby' ? WORLD_AREA : area)) } catch { /* Browsing also works without storage. */ }
    set({ area, initialized: true })
  }
}))

export function useDiscoveryArea() {
  const state = useDiscoveryAreaStore()
  useEffect(() => { state.initialize() }, [state.initialize])
  return state
}
