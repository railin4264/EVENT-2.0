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
    // Silently catch Leaflet initialization errors caused by React StrictMode
    if (!error.message?.includes('Map container is already initialized')) {
      console.error('Map error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-gray-600 dark:text-gray-400">Unable to load map</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorCount: 0 })
                this.props.onReset?.()
              }}
              className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

interface LazyMapComponentProps {
  userLocation?: {
    lat: number
    lng: number
    address?: string
  }
  events?: any[] // Accept any event type from discovery page
  tribes?: any[] // Accept any tribe type from discovery page
  onEventClick?: (event: any) => void
  onLocationChange?: (location: { lat: number; lng: number; address?: string }) => void
  onLocationUpdate?: (location: { lat: number; lng: number; address?: string }) => void
  showRadius?: boolean
  radiusKm?: number
  radius?: number
  className?: string
  height?: string
  selectedEvent?: any | null
  selectedItem?: any | null
  viewType?: 'events' | 'tribes'
  onEventSelect?: (event: any | null) => void
  onTribeSelect?: (tribe: any | null) => void
  categoryColors?: { [key: string]: string }
}

// Loading component for map
const MapLoadingFallback = () => (
  <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
    </div>
  </div>
)

export default function LazyMapComponent(props: LazyMapComponentProps) {
  const defaultProps = {
    userLocation: { lat: 0, lng: 0 },
    events: [],
    tribes: [],
    selectedEvent: null,
    selectedItem: null,
    viewType: 'events',
    onEventSelect: () => { },
    onTribeSelect: () => { },
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