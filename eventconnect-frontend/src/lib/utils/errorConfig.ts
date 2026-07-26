// Configuration for error reporting
export const ERROR_REPORTING_CONFIG = {
  // Only report errors in production or when explicitly enabled
  enabled: process.env.NODE_ENV === 'production' ||
           (typeof window !== 'undefined' && localStorage.getItem('debug-mode') === 'true'),

  // Maximum errors to report per session
  maxErrorsPerSession: 50,

  // Throttle window in milliseconds
  throttleWindow: 30000, // 30 seconds

  // Maximum errors per throttle window
  maxErrorsPerWindow: 5,

  // Endpoints to exclude from error reporting
  excludeEndpoints: [
    '/debug/',
    '/console-errors',
    '/network-errors',
    'maps.googleapis.com',
    'cdnjs.cloudflare.com'
  ],

  // Error messages to ignore
  ignoreMessages: [
    'Failed to send error to backend',
    'Geolocation error',
    'Socket',
    'network error',
    'reverse geocoding',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
    'ResizeObserver loop limit exceeded',
    'defaultProps',
    'componentWillReceiveProps',
    'Slow API request',
    'Socket is not connected'
  ]
}

// Session error counter
let sessionErrorCount = 0

export const shouldReportError = (message: string, url?: string): boolean => {
  // Check if error reporting is enabled
  if (!ERROR_REPORTING_CONFIG.enabled) {
    return false
  }

  // Check session limit
  if (sessionErrorCount >= ERROR_REPORTING_CONFIG.maxErrorsPerSession) {
    return false
  }

  // Check excluded endpoints
  if (url && ERROR_REPORTING_CONFIG.excludeEndpoints.some(endpoint => url.includes(endpoint))) {
    return false
  }

  // Check ignored messages
  if (ERROR_REPORTING_CONFIG.ignoreMessages.some(ignore => message.includes(ignore))) {
    return false
  }

  sessionErrorCount++
  return true
}

// Reset session counter (call this when user navigates or reloads)
export const resetSessionErrorCount = () => {
  sessionErrorCount = 0
}

// Enable/disable debug mode
export const setDebugMode = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    if (enabled) {
      localStorage.setItem('debug-mode', 'true')
    } else {
      localStorage.removeItem('debug-mode')
    }
    window.location.reload() // Reload to apply changes
  }
}

// Get current debug mode status
export const isDebugMode = (): boolean => {
  return typeof window !== 'undefined' && localStorage.getItem('debug-mode') === 'true'
}