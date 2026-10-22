'use client'

import dynamic from 'next/dynamic'

// Leaflet accesses window when imported; its entire implementation must be client-only.
const MapComponent = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => <div role="status" className="flex h-full min-h-64 items-center justify-center bg-muted text-muted-foreground">Preparando el mapa…</div>,
})

export default MapComponent
