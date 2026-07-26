'use client'

import { API_BASE_URL } from '@/lib/constants'

// Analytics and event tracking system
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: number
  userId?: string
  sessionId?: string
}

export interface UserProperties {
  userId?: string
  email?: string
  name?: string
  role?: string
  plan?: string
  signupDate?: string
  location?: string
  preferences?: Record<string, any>
}

export interface PageViewData {
  page: string
  title?: string
  referrer?: string
  timestamp?: number
  userId?: string
  sessionId?: string
  duration?: number
}

export interface PerformanceMetrics {
  pageName: string
  loadTime: number
  renderTime: number
  interactionTime?: number
  errorCount: number
  timestamp: number
}

class AnalyticsTracker {
  private sessionId: string
  private userId: string | null = null
  private isEnabled: boolean = true
  private queue: AnalyticsEvent[] = []
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map()
  private pageStartTime: number = Date.now()
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true

  constructor() {
    this.sessionId = this.generateSessionId()

    // Only initialize client-side features when in browser
    if (typeof window !== 'undefined') {
      this.initializeEventListeners()
      this.setupPerformanceMonitoring()
      this.loadStoredEvents()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private initializeEventListeners(): void {
    // Page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // Online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushQueue()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
    
    // Page unload
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this))
    
    // Error tracking
    window.addEventListener('error', this.handleError.bind(this))
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this))
  }

  private setupPerformanceMonitoring(): void {
    // Monitor page load performance
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            this.trackPerformance({
              pageName: window.location.pathname,
              loadTime: navigation.loadEventEnd - navigation.fetchStart,
              renderTime: navigation.domContentLoadedEventEnd - navigation.fetchStart,
              errorCount: 0,
              timestamp: Date.now()
            })
          }
        }, 0)
      })
    }
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('analytics_queue')
      if (stored) {
        this.queue = JSON.parse(stored)
        localStorage.removeItem('analytics_queue')
        this.flushQueue()
      }
    } catch (error) {
      console.warn('Failed to load stored analytics events:', error)
    }
  }

  // Public methods
  setUserId(userId: string): void {
    this.userId = userId
  }

  setUserProperties(properties: UserProperties): void {
    this.track('user_properties_updated', properties)
  }

  enable(): void {
    this.isEnabled = true
  }

  disable(): void {
    this.isEnabled = false
  }

  // Core tracking method
  track(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        language: typeof navigator !== 'undefined' ? navigator.language : '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: typeof screen !== 'undefined' ? {
          width: screen.width,
          height: screen.height,
          pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1
        } : { width: 0, height: 0, pixelRatio: 1 }
      },
      timestamp: Date.now(),
      userId: this.userId || undefined,
      sessionId: this.sessionId
    }

    this.queue.push(event)
    this.processQueue()
  }

  // Page tracking
  trackPageView(data: Partial<PageViewData> = {}): void {
    const pageData: PageViewData = {
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      title: typeof document !== 'undefined' ? document.title : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: Date.now(),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      ...data
    }

    this.track('page_view', pageData)
    this.pageStartTime = Date.now()
  }

  // Performance tracking
  trackPerformance(metrics: Partial<PerformanceMetrics>): void {
    const pageName = metrics.pageName || (typeof window !== 'undefined' ? window.location.pathname : '')
    const performanceData: PerformanceMetrics = {
      pageName,
      loadTime: 0,
      renderTime: 0,
      errorCount: 0,
      timestamp: Date.now(),
      ...metrics
    }

    this.performanceMetrics.set(pageName, performanceData)
    this.track('performance_metric', performanceData)
  }

  // Event-specific tracking methods
  trackEvent(category: string, action: string, label?: string, value?: number): void {
    this.track('custom_event', {
      category,
      action,
      label,
      value
    })
  }

  trackClick(element: string, properties: Record<string, any> = {}): void {
    this.track('click', {
      element,
      ...properties
    })
  }

  trackForm(formName: string, action: 'submit' | 'abandon' | 'error', properties: Record<string, any> = {}): void {
    this.track('form_interaction', {
      formName,
      action,
      ...properties
    })
  }

  trackSearch(query: string, resultCount: number, filters: Record<string, any> = {}): void {
    this.track('search', {
      query,
      resultCount,
      filters
    })
  }

  trackError(error: string, context: Record<string, any> = {}): void {
    this.track('error', {
      error,
      context,
      stack: new Error().stack
    })
  }

  // Business-specific tracking
  trackEventInteraction(action: string, eventId: string, properties: Record<string, any> = {}): void {
    this.track('event_interaction', {
      action, // 'view', 'join', 'leave', 'share', 'like'
      eventId,
      ...properties
    })
  }

  trackSocialInteraction(action: string, targetUserId: string, properties: Record<string, any> = {}): void {
    this.track('social_interaction', {
      action, // 'follow', 'unfollow', 'message', 'profile_view'
      targetUserId,
      ...properties
    })
  }

  trackFeatureUsage(featureName: string, usage: 'start' | 'complete' | 'abandon', properties: Record<string, any> = {}): void {
    this.track('feature_usage', {
      featureName,
      usage,
      ...properties
    })
  }

  // Event handlers
  private handleVisibilityChange(): void {
    if (document.hidden) {
      const duration = Date.now() - this.pageStartTime
      this.track('page_visibility_hidden', { duration })
    } else {
      this.track('page_visibility_visible')
      this.pageStartTime = Date.now()
    }
  }

  private handlePageUnload(): void {
    const duration = Date.now() - this.pageStartTime
    this.track('page_unload', { duration })
    
    // Store unprocessed events
    if (this.queue.length > 0) {
      try {
        localStorage.setItem('analytics_queue', JSON.stringify(this.queue))
      } catch (error) {
        console.warn('Failed to store analytics queue:', error)
      }
    }
  }

  private handleError(event: ErrorEvent): void {
    this.trackError(event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    })
  }

  private handlePromiseRejection(event: PromiseRejectionEvent): void {
    this.trackError('Unhandled Promise Rejection', {
      reason: event.reason?.toString(),
      stack: event.reason?.stack
    })
  }

  // Queue processing
  private processQueue(): void {
    if (!this.isOnline || this.queue.length === 0) return

    // Process queue in batches
    const batchSize = 10
    if (this.queue.length >= batchSize) {
      this.flushQueue()
    } else {
      // Debounced flush
      setTimeout(() => this.flushQueue(), 1000)
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    try {
      // Send to analytics endpoint
      await this.sendEvents(events)
    } catch (error) {
      // Use console.warn instead of console.error to avoid triggering error reporter
      console.warn('Failed to send analytics events:', error)
      // Re-queue events if send failed (but limit retries)
      if (events.length < 50) { // Prevent infinite growth
        this.queue.unshift(...events)
      }
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    // In production, this would send to your analytics service
    // For now, we'll just log to console and store locally
    
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Analytics Events')
      events.forEach(event => {
        console.log(`${event.name}:`, event.properties)
      })
      console.groupEnd()
    }

    // Store in IndexedDB for offline support
    try {
      await this.storeEventsLocally(events)
    } catch (error) {
      console.warn('Failed to store events locally:', error)
    }

    // Only send to backend in production or when explicitly enabled in development
    const shouldSendToBackend = process.env.NODE_ENV === 'production' ||
                               (typeof window !== 'undefined' && localStorage.getItem('enable-analytics-backend'))

    if (API_BASE_URL && shouldSendToBackend) {
      try {
        const response = await fetch(`${API_BASE_URL}/analytics/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events })
        })

        if (!response.ok) {
          console.warn(`Analytics API returned ${response.status}, events stored locally`)
        }
      } catch (error) {
        // In development or when backend is down, just log and continue
        console.warn('Analytics backend unavailable, events stored locally only')
        // Don't throw in development - this is expected when backend isn't running
      }
    }
  }

  private async storeEventsLocally(events: AnalyticsEvent[]): Promise<void> {
    if (!('indexedDB' in window)) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EventConnectAnalytics', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['events'], 'readwrite')
        const store = transaction.objectStore('events')
        
        events.forEach(event => {
          store.add(event)
        })
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { autoIncrement: true })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('name', 'name', { unique: false })
        }
      }
    })
  }

  // Analytics utilities
  getSessionId(): string {
    return this.sessionId
  }

  getUserId(): string | null {
    return this.userId
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
  }

  getQueueLength(): number {
    return this.queue.length
  }
}

// Global analytics instance (only create on client side)
export const analytics = typeof window !== 'undefined' ? new AnalyticsTracker() : null as any

// React hook for analytics
export function useAnalytics() {
  const noOp = () => {}

  if (!analytics) {
    return {
      track: noOp,
      trackPageView: noOp,
      trackClick: noOp,
      trackEvent: noOp,
      trackForm: noOp,
      trackSearch: noOp,
      trackError: noOp,
      trackEventInteraction: noOp,
      trackSocialInteraction: noOp,
      trackFeatureUsage: noOp,
      setUserId: noOp,
      setUserProperties: noOp
    }
  }

  return {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackClick: analytics.trackClick.bind(analytics),
    trackEvent: analytics.trackEvent.bind(analytics),
    trackForm: analytics.trackForm.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackEventInteraction: analytics.trackEventInteraction.bind(analytics),
    trackSocialInteraction: analytics.trackSocialInteraction.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    setUserId: analytics.setUserId.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics)
  }
}