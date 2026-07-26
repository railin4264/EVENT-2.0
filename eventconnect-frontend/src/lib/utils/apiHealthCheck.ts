'use client'

import { API_BASE_URL } from '@/lib/constants'

export interface HealthCheckResult {
  available: boolean
  latency?: number
  error?: string
  timestamp: number
}

class ApiHealthChecker {
  private lastCheck: HealthCheckResult | null = null
  private checkInterval: number = 30000 // 30 seconds
  private listeners: ((result: HealthCheckResult) => void)[] = []

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

      // API_BASE_URL = 'http://localhost:5000/api' — so /health endpoint is at base + '/health'
      const healthUrl = API_BASE_URL.replace(/\/api$/, '/health') || 'http://localhost:5000/health'

      const response = await fetch(healthUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      })

      clearTimeout(timeoutId)

      const latency = Date.now() - startTime
      const result: HealthCheckResult = {
        available: response.ok || response.status === 404, // 404 means server is up but route unknown
        latency,
        timestamp: Date.now(),
        error: response.ok ? undefined : `HTTP ${response.status}`
      }

      this.lastCheck = result
      this.notifyListeners(result)
      return result

    } catch (error: any) {
      const latency = Date.now() - startTime
      const result: HealthCheckResult = {
        available: false,
        latency,
        error: error.name === 'AbortError' ? 'Timeout' : error.message,
        timestamp: Date.now()
      }

      this.lastCheck = result
      this.notifyListeners(result)
      return result
    }
  }

  getLastCheck(): HealthCheckResult | null {
    return this.lastCheck
  }

  onHealthChange(callback: (result: HealthCheckResult) => void) {
    this.listeners.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(result: HealthCheckResult) {
    this.listeners.forEach(listener => {
      try {
        listener(result)
      } catch (error) {
        console.warn('Health check listener error:', error)
      }
    })
  }

  startPeriodicCheck() {
    // Only enable health checks in production or when explicitly enabled
    const shouldCheck = process.env.NODE_ENV === 'production' ||
                       (typeof window !== 'undefined' && localStorage.getItem('enable-health-check'))

    if (!shouldCheck) {
      console.info('API health checking disabled in development. Set localStorage.setItem("enable-health-check", "true") to enable.')
      return () => {}
    }

    // Initial check
    this.checkHealth()

    // Periodic checks
    const interval = setInterval(() => {
      this.checkHealth()
    }, this.checkInterval)

    // Return cleanup function
    return () => clearInterval(interval)
  }
}

export const apiHealthChecker = new ApiHealthChecker()

// Hook for React components
import { useState, useEffect } from 'react'

export function useApiHealth() {
  const [health, setHealth] = useState<HealthCheckResult | null>(
    apiHealthChecker.getLastCheck()
  )

  useEffect(() => {
    // Subscribe to health changes
    const unsubscribe = apiHealthChecker.onHealthChange(setHealth)

    // Start periodic checks if not already running (respects internal shouldCheck logic)
    const stopPeriodicCheck = apiHealthChecker.startPeriodicCheck()

    return () => {
      unsubscribe()
      stopPeriodicCheck()
    }
  }, [])

  return health
}