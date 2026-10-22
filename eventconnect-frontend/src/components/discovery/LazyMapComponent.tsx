'use client'

import { lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react'
import LoadingSpinner from '@/components/redesign/ui/ticket-loader'

// Lazy load the heavy MapComponent
const MapComponent = lazy(() => import('./MapComponent'))

// ErrorBoundary specifically for map initialization errors
class MapErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; errorCount: number }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error) {
    // Suppress Leaflet re-initialization errors in development
    if (error.message?.includes('Map container is already initialized')) {
      return { hasError: false, errorCount: 0 }
    }
    return { hasError: true, errorCount: 1 }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!error.message?.includes('Map container is already initialized')) {
      console.error('Map error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[360px] bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
          <div className="text-center p-6 max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mx-auto mb-3 text-2xl">
              🗺️
            </div>
            <p className="text-white font-semibold mb-1">No se pudo inicializar el mapa</p>
            <p className="text-xs text-slate-400 mb-4">Reintenta cargar el lienzo interactivo</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorCount: 0 })
                this.props.onReset?.()
              }}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-colors"
            >
              Reintentar mapa
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export interface LazyMapComponentProps {
  userLocation?: {
    lat: number
    lng: number
    address?: string
  }
  events?: any[]
  tribes?: any[]
  ideas?: any[]
  onEventClick?: (event: any) => void
  onLocationChange?: (location: { lat: number; lng: number; address?: string }) => void
  onLocationUpdate?: (location: { lat: number; lng: number; address?: string }) => void
  showRadius?: boolean
  /** Show only when userLocation is an actual user-provided GPS position. */
  showUserLocation?: boolean
  suppressSelectionPopup?: boolean
  fitToEvents?: boolean
  overviewMode?: 'world' | 'country' | 'city'
  radiusKm?: number
  radius?: number
  className?: string
  height?: string
  selectedEvent?: any | null
  selectedItem?: any | null
  viewType?: 'events' | 'tribes' | 'ideas'
  onEventSelect?: (event: any | null) => void
  onTribeSelect?: (tribe: any | null) => void
  onIdeaSelect?: (idea: any | null) => void
  categoryColors?: { [key: string]: string }
  mapStyle?: 'dark' | 'light' | 'satellite'
  onMapStyleChange?: (style: 'dark' | 'light' | 'satellite') => void
  onMoveEnd?: (center: { lat: number; lng: number }) => void
  onSearchArea?: (center: { lat: number; lng: number }) => void
  flyToTarget?: { lat: number; lng: number; zoom?: number; ts?: number } | null
}

const MapLoadingFallback = () => (
  <div className="w-full h-full min-h-[360px] bg-slate-950 flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)] animate-pulse" />
    <div className="text-center relative z-10">
      <LoadingSpinner size="lg" />
      <p className="mt-3 text-sm font-medium text-slate-300">Calibrando radar de eventos…</p>
    </div>
  </div>
)

export default function LazyMapComponent(props: LazyMapComponentProps) {
  const defaultProps = {
    userLocation: { lat: 18.4721, lng: -69.9192, address: 'Santo Domingo, República Dominicana' },
    events: [],
    tribes: [],
    selectedEvent: null,
    selectedItem: null,
    viewType: 'events',
    onEventSelect: () => {},
    onTribeSelect: () => {},
    categoryColors: {},
    ...props
  }

  return (
    <MapErrorBoundary>
      <Suspense fallback={<MapLoadingFallback />}>
        <MapComponent {...(defaultProps as any)} />
      </Suspense>
    </MapErrorBoundary>
  )
}
