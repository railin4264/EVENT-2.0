'use client'

import { useEffect } from 'react'
import { API_BASE_URL } from '@/lib/constants'
import { ERROR_REPORTING_CONFIG, shouldReportError } from '@/lib/utils/errorConfig'

interface ConsoleError {
  level: 'error' | 'warn' | 'info'
  message: string
  url: string
  line?: number
  column?: number
  error?: string
  timestamp: number
  userAgent: string
}

interface NetworkError {
  url: string
  method: string
  status: number
  statusText: string
  response?: any
  timestamp: number
}

// Throttling to prevent excessive requests
const errorThrottle = new Map<string, number>()
const THROTTLE_WINDOW = 30000 // 30 seconds
const MAX_ERRORS_PER_WINDOW = 5

// Función para enviar errores al backend con throttling
const sendErrorToBackend = async (type: 'console' | 'network', data: any) => {
  // Use centralized configuration to check if should report
  if (!shouldReportError(data.message, data.url)) {
    return
  }

  try {
    // Create a throttle key based on error type and message
    const throttleKey = `${type}-${data.message?.substring(0, 50) || 'unknown'}`
    const now = Date.now()
    const lastSent = errorThrottle.get(throttleKey) || 0

    // Use config values for throttling
    if (now - lastSent < ERROR_REPORTING_CONFIG.throttleWindow) {
      return // Skip this error
    }

    // Check total errors sent in the last window
    const recentErrors = Array.from(errorThrottle.values()).filter(
      timestamp => now - timestamp < ERROR_REPORTING_CONFIG.throttleWindow
    )

    if (recentErrors.length >= ERROR_REPORTING_CONFIG.maxErrorsPerWindow) {
      return // Too many errors, skip
    }

    errorThrottle.set(throttleKey, now)

    // Clean up old entries
    const entriesToDelete: string[] = []
    errorThrottle.forEach((timestamp, key) => {
      if (now - timestamp > ERROR_REPORTING_CONFIG.throttleWindow * 2) {
        entriesToDelete.push(key)
      }
    })
    entriesToDelete.forEach(key => errorThrottle.delete(key))

    await fetch(`${API_BASE_URL}/debug/${type === 'console' ? 'console-errors' : 'network-errors'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
  } catch (error) {
    // Silently fail to prevent infinite loops
  }
}

export const useConsoleErrorReporter = (enabled: boolean = true) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return

    // Capturar errores de JavaScript
    const handleError = (event: ErrorEvent) => {
      const errorData: ConsoleError = {
        level: 'error',
        message: event.message,
        url: event.filename || window.location.href,
        line: event.lineno,
        column: event.colno,
        error: event.error?.stack || event.error?.toString(),
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }

      sendErrorToBackend('console', errorData)
    }

    // Capturar rechazos de promesas no manejados
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorData: ConsoleError = {
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        url: window.location.href,
        error: event.reason?.stack || event.reason?.toString(),
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }

      sendErrorToBackend('console', errorData)
    }

    // Interceptar console.error para capturar errores de React y otros
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    console.error = (...args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')

      const errorData: ConsoleError = {
        level: 'error',
        message,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }

      sendErrorToBackend('console', errorData)

      originalConsoleError.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')

      const errorData: ConsoleError = {
        level: 'warn',
        message,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }

      sendErrorToBackend('console', errorData)

      originalConsoleWarn.apply(console, args)
    }

    // Interceptar fetch para capturar errores de red
    const originalFetch = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await originalFetch(...args)

        // Reportar errores HTTP (4xx, 5xx) but filter debug endpoints
        if (!response.ok) {
          const url = args[0] as string

          // Don't report errors from debug endpoints to prevent infinite loops
          if (url.includes('/debug/') || url.includes('console-errors') || url.includes('network-errors')) {
            return response
          }

          // Don't report common 404s or 401s that are expected
          if (response.status === 404 || response.status === 401) {
            return response
          }

          const networkError: NetworkError = {
            url,
            method: (args[1]?.method || 'GET').toUpperCase(),
            status: response.status,
            statusText: response.statusText,
            timestamp: Date.now()
          }

          try {
            const responseText = await response.clone().text()
            networkError.response = responseText
          } catch (e) {
            // No problem if we can't read the response
          }

          sendErrorToBackend('network', networkError)
        }

        return response
      } catch (error) {
        // Error de red (sin conexión, etc.)
        const url = args[0] as string

        // Don't report errors from debug endpoints
        if (!url.includes('/debug/') && !url.includes('console-errors') && !url.includes('network-errors')) {
          const networkError: NetworkError = {
            url,
            method: (args[1]?.method || 'GET').toUpperCase(),
            status: 0,
            statusText: 'Network Error',
            response: error?.toString(),
            timestamp: Date.now()
          }

          sendErrorToBackend('network', networkError)
        }

        throw error
      }
    }

    // Agregar event listeners
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      window.fetch = originalFetch
    }
  }, [enabled])
}

export default useConsoleErrorReporter