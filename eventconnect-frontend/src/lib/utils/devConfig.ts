'use client'

// Development configuration helper
export class DevConfig {
  static enableAnalyticsBackend() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enable-analytics-backend', 'true')
      console.info('Analytics backend enabled. Refresh to take effect.')
    }
  }

  static disableAnalyticsBackend() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('enable-analytics-backend')
      console.info('Analytics backend disabled. Refresh to take effect.')
    }
  }

  static enableHealthCheck() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enable-health-check', 'true')
      console.info('API health checking enabled. Refresh to take effect.')
    }
  }

  static disableHealthCheck() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('enable-health-check')
      console.info('API health checking disabled. Refresh to take effect.')
    }
  }

  static enableDebugMode() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-mode', 'true')
      console.info('Debug mode enabled. Refresh to take effect.')
    }
  }

  static disableDebugMode() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debug-mode')
      console.info('Debug mode disabled. Refresh to take effect.')
    }
  }

  static showCurrentConfig() {
    if (typeof window !== 'undefined') {
      const config = {
        analyticsBackend: !!localStorage.getItem('enable-analytics-backend'),
        healthCheck: !!localStorage.getItem('enable-health-check'),
        debugMode: !!localStorage.getItem('debug-mode'),
      }
      console.table(config)
      return config
    }
    return null
  }

  static resetConfig() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('enable-analytics-backend')
      localStorage.removeItem('enable-health-check')
      localStorage.removeItem('debug-mode')
      console.info('Development configuration reset. Refresh to take effect.')
    }
  }
}

// Make it available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).DevConfig = DevConfig
  console.info('DevConfig available globally. Use DevConfig.showCurrentConfig() to see current settings.')
}