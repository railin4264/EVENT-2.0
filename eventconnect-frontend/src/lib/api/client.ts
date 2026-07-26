import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/lib/constants'
import { apiCache } from '@/lib/performance/apiCache'
import toast from 'react-hot-toast'

// Extend InternalAxiosRequestConfig to include metadata and retry state
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number
  }
  _retryCount?: number
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Rate limiting to prevent excessive requests
const requestQueue = new Map<string, number>()
const REQUEST_LIMIT_WINDOW = 1000 // 1 second
const MAX_REQUESTS_PER_WINDOW = 50

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web',
  },
})

// Request interceptor for auth token, rate limiting, and performance monitoring
api.interceptors.request.use(
  (config) => {
    // Rate limiting check
    const now = Date.now()
    const endpoint = config.url || 'unknown'
    const recentRequests = Array.from(requestQueue.values()).filter(
      timestamp => now - timestamp < REQUEST_LIMIT_WINDOW
    )

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      return Promise.reject(new Error('Rate limit exceeded'))
    }

    requestQueue.set(`${endpoint}-${now}`, now)

    // Clean up old entries
    const entriesToDelete: string[] = []
    requestQueue.forEach((timestamp, key) => {
      if (now - timestamp > REQUEST_LIMIT_WINDOW * 2) {
        entriesToDelete.push(key)
      }
    })
    entriesToDelete.forEach(key => requestQueue.delete(key))

    // Add auth token from sessionStorage (NOT localStorage for tab isolation)
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('auth-token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    // Add cache headers for GET requests
    if (config.method === 'get') {
      config.headers['Cache-Control'] = 'max-age=300'
    }

    // Add performance monitoring
    (config as ExtendedAxiosRequestConfig).metadata = { startTime: Date.now() }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling, caching, and performance monitoring
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as ExtendedAxiosRequestConfig
    
    // Performance monitoring - only in development
    if (process.env.NODE_ENV === 'development' && config.metadata?.startTime) {
      const duration = Date.now() - config.metadata.startTime
      if (duration > 3000) { // Increased threshold to 3 seconds
        console.warn(`Slow API request: ${config.method?.toUpperCase()} ${config.url} took ${duration}ms`)
      }
    }

    // Cache GET responses
    if (config.method === 'get' && response.status === 200) {
      const url = config.url || ''
      const params = config.params
      
      // Define cache TTL based on endpoint
      let ttl = 5 * 60 * 1000 // 5 minutes default
      
      if (url.includes('/users/profile') || url.includes('/dashboard/stats')) {
        ttl = 2 * 60 * 1000 // 2 minutes for user data
      } else if (url.includes('/events') || url.includes('/discovery')) {
        ttl = 10 * 60 * 1000 // 10 minutes for events
      } else if (url.includes('/notifications')) {
        ttl = 30 * 1000 // 30 seconds for notifications
      }
      
      apiCache.set(url, response.data, params, { 
        ttl,
        storage: 'memory'
      })
    }
    
    return response
  },
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig
    
    // Performance monitoring for failed requests - only in development
    if (process.env.NODE_ENV === 'development' && config?.metadata?.startTime) {
      const duration = Date.now() - config.metadata.startTime
      console.error(`Failed API request: ${config.method?.toUpperCase()} ${config.url} failed after ${duration}ms`)
    }

    // Handle 401 errors by redirecting to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname

        console.log('401 error received:', {
          url: config?.url,
          currentPath,
          isLoginPage: currentPath === '/login',
          isLoginRequest: config?.url?.includes('/auth/login')
        })

        // Don't auto-logout if already on login/register pages or if it's a login request
        if (currentPath !== '/login' && currentPath !== '/register' && !config?.url?.includes('/auth/login')) {
          console.log('Auto-logout triggered due to 401')

          // Clear all auth data
          localStorage.removeItem('auth-token')
          localStorage.removeItem('refresh-token')
          localStorage.removeItem('auth-storage')
          document.cookie = 'auth-token=; path=/; max-age=0'

          // Prevent redirect loops by checking if we're already redirecting
          const isRedirecting = sessionStorage.getItem('auth-redirecting')
          if (!isRedirecting) {
            sessionStorage.setItem('auth-redirecting', 'true')

            // Add a small delay to prevent immediate redirect loops
            setTimeout(() => {
              sessionStorage.removeItem('auth-redirecting')
              window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
            }, 100)
          }
        } else {
          console.log('401 ignored - on login page or login request')
        }
      }
    }

    // Handle 429 rate limit - show user feedback
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 60
      toast.error(`Too many requests. Please wait ${waitSeconds} seconds before trying again.`, {
        duration: waitSeconds * 1000,
        id: 'rate-limit',
      })
      return Promise.reject(error)
    }

    // Retry on network errors and 5xx server errors (not on 4xx client errors)
    const isNetworkError = !error.response
    const isServerError = error.response && error.response.status >= 500
    const isRetryableMethod = ['get', 'put', 'patch'].includes(config?.method?.toLowerCase() || '')

    if ((isNetworkError || isServerError) && isRetryableMethod && config) {
      const retryCount = (config as ExtendedAxiosRequestConfig)._retryCount || 0

      if (retryCount < MAX_RETRIES) {
        ;(config as ExtendedAxiosRequestConfig)._retryCount = retryCount + 1
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)))
        return api(config)
      }
    }

    // Network error feedback
    if (isNetworkError) {
      toast.error('Network error. Please check your connection.', { id: 'network-error' })
    }

    return Promise.reject(error)
  }
)

// Enhanced API methods with caching support
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => 
    api.get<T>(url, config),
    
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    const result = api.post<T>(url, data, config)
    // Invalidate related caches on mutations
    invalidateRelatedCaches(url)
    return result
  },
    
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    const result = api.put<T>(url, data, config)
    // Invalidate related caches on mutations
    invalidateRelatedCaches(url)
    return result
  },
    
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    const result = api.patch<T>(url, data, config)
    // Invalidate related caches on mutations
    invalidateRelatedCaches(url)
    return result
  },
    
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => {
    const result = api.delete<T>(url, config)
    // Invalidate related caches on mutations
    invalidateRelatedCaches(url)
    return result
  },

  // Cached version of GET method
  getCached: async <T = any>(url: string, params?: Record<string, any>, useCache = true): Promise<T> => {
    // Try cache first if enabled
    if (useCache) {
      const cached = apiCache.get<{ data: T }>(url, params)
      if (cached !== null) {
        return cached.data
      }
    }
    
    const response = await api.get<T>(url, { params })
    return response.data
  },
}

// Cache invalidation helper
function invalidateRelatedCaches(url: string): void {
  // Define cache invalidation patterns based on URL
  if (url.includes('/users/') || url.includes('/profile')) {
    apiCache.invalidatePattern(/^\/users/)
    apiCache.invalidatePattern(/^\/dashboard/)
  }
  
  if (url.includes('/events/')) {
    apiCache.invalidatePattern(/^\/events/)
    apiCache.invalidatePattern(/^\/discovery/)
    apiCache.invalidatePattern(/^\/dashboard/)
  }
  
  if (url.includes('/follows/')) {
    apiCache.invalidatePattern(/^\/follows/)
    apiCache.invalidatePattern(/^\/dashboard/)
  }
  
  if (url.includes('/notifications/')) {
    apiCache.invalidatePattern(/^\/notifications/)
  }
}

export default api