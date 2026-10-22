const readDebugMode = (): boolean => {
  try { return typeof window !== 'undefined' && window.localStorage.getItem('debug-mode') === 'true' }
  catch { return false }
}

// Configuration for error reporting
export const ERROR_REPORTING_CONFIG = {
  // Only report errors in production or when explicitly enabled
  enabled: process.env.NODE_ENV === 'production' ||
           readDebugMode(),

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

export const shouldReportError = (message: unknown, url?: unknown): boolean => {
  let messageText = 'Unknown error'
  let urlText = ''
  try { messageText = typeof message === 'string' ? message : message == null ? 'Unknown error' : String(message) } catch { /* Ignore hostile string conversion. */ }
  try {
    const request = url && typeof url === 'object' ? url as { url?: unknown } : null
    urlText = typeof url === 'string' ? url : typeof request?.url === 'string' ? request.url : url == null ? '' : String(url)
  } catch { /* Ignore hostile string conversion. */ }
  // Check if error reporting is enabled
  if (!ERROR_REPORTING_CONFIG.enabled) {
    return false
  }

  // Check session limit
  if (sessionErrorCount >= ERROR_REPORTING_CONFIG.maxErrorsPerSession) {
    return false
  }

  // Check excluded endpoints
  if (urlText && ERROR_REPORTING_CONFIG.excludeEndpoints.some(endpoint => urlText.includes(endpoint))) {
    return false
  }

  // Check ignored messages
  if (ERROR_REPORTING_CONFIG.ignoreMessages.some(ignore => messageText.includes(ignore))) {
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
  if (typeof window === 'undefined') return
  try {
    if (enabled) window.localStorage.setItem('debug-mode', 'true')
    else window.localStorage.removeItem('debug-mode')
    window.location.reload()
  } catch { /* Reporting preferences must not break the app when storage is blocked. */ }
}

// Get current debug mode status without assuming storage is available.
export const isDebugMode = readDebugMode
