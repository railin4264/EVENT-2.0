'use client'

// Enhanced API caching with TTL and invalidation strategies
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  key: string
}

interface CacheOptions {
  ttl?: number // Default 5 minutes
  storage?: 'memory' | 'localStorage' | 'sessionStorage'
  serialize?: boolean
}

export class APICache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes
  
  constructor(private defaultOptions: CacheOptions = {}) {
    this.defaultTTL = defaultOptions.ttl || this.defaultTTL
    
    // Clean up expired entries every minute
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000)
    }
  }

  // Generate cache key from URL and parameters
  private generateKey(url: string, params?: Record<string, any>): string {
    const sortedParams = params ? 
      Object.keys(params)
        .sort()
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join('&') : ''
    
    return `${url}${sortedParams ? `?${sortedParams}` : ''}`
  }

  // Get storage based on options
  private getStorage(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): Storage | Map<string, CacheEntry<any>> {
    if (typeof window === 'undefined') return this.memoryCache
    
    switch (storage) {
      case 'localStorage':
        return window.localStorage
      case 'sessionStorage':
        return window.sessionStorage
      default:
        return this.memoryCache
    }
  }

  // Store data in cache
  set<T>(
    url: string, 
    data: T, 
    params?: Record<string, any>,
    options: CacheOptions = {}
  ): void {
    const key = this.generateKey(url, params)
    const storage = options.storage || this.defaultOptions.storage || 'memory'
    const ttl = options.ttl || this.defaultTTL
    const serialize = options.serialize ?? this.defaultOptions.serialize ?? true
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    }

    const store = this.getStorage(storage)
    
    if (store instanceof Map) {
      store.set(key, entry)
    } else {
      try {
        store.setItem(`api_cache_${key}`, JSON.stringify(entry))
      } catch (error) {
        console.warn('Failed to store in web storage, falling back to memory:', error)
        this.memoryCache.set(key, entry)
      }
    }
  }

  // Get data from cache
  get<T>(
    url: string, 
    params?: Record<string, any>,
    storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
  ): T | null {
    const key = this.generateKey(url, params)
    const store = this.getStorage(storage)
    
    let entry: CacheEntry<T> | null = null
    
    if (store instanceof Map) {
      entry = store.get(key) || null
    } else {
      try {
        const stored = store.getItem(`api_cache_${key}`)
        entry = stored ? JSON.parse(stored) : null
      } catch (error) {
        console.warn('Failed to parse cached data:', error)
        return null
      }
    }
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(url, params, storage)
      return null
    }
    
    return entry.data
  }

  // Delete specific cache entry
  delete(
    url: string, 
    params?: Record<string, any>,
    storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
  ): void {
    const key = this.generateKey(url, params)
    const store = this.getStorage(storage)
    
    if (store instanceof Map) {
      store.delete(key)
    } else {
      store.removeItem(`api_cache_${key}`)
    }
  }

  // Check if cache entry exists and is valid
  has(
    url: string, 
    params?: Record<string, any>,
    storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
  ): boolean {
    return this.get(url, params, storage) !== null
  }

  // Clear all cache entries
  clear(storage?: 'memory' | 'localStorage' | 'sessionStorage'): void {
    if (storage === 'memory' || !storage) {
      this.memoryCache.clear()
    }
    
    if (typeof window !== 'undefined') {
      if (storage === 'localStorage' || !storage) {
        Object.keys(window.localStorage)
          .filter(key => key.startsWith('api_cache_'))
          .forEach(key => window.localStorage.removeItem(key))
      }
      
      if (storage === 'sessionStorage' || !storage) {
        Object.keys(window.sessionStorage)
          .filter(key => key.startsWith('api_cache_'))
          .forEach(key => window.sessionStorage.removeItem(key))
      }
    }
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now()
    
    // Clean memory cache
    const entriesToDelete: string[] = []
    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        entriesToDelete.push(key)
      }
    })
    entriesToDelete.forEach(key => this.memoryCache.delete(key))
    
    // Clean web storage
    if (typeof window !== 'undefined') {
      [window.localStorage, window.sessionStorage].forEach(storage => {
        Object.keys(storage)
          .filter(key => key.startsWith('api_cache_'))
          .forEach(key => {
            try {
              const entry = JSON.parse(storage.getItem(key) || '{}')
              if (now - entry.timestamp > entry.ttl) {
                storage.removeItem(key)
              }
            } catch (error) {
              // Remove corrupted entries
              storage.removeItem(key)
            }
          })
      })
    }
  }

  // Get cache statistics
  getStats(): {
    memoryEntries: number
    localStorageEntries: number
    sessionStorageEntries: number
  } {
    let localStorageEntries = 0
    let sessionStorageEntries = 0
    
    if (typeof window !== 'undefined') {
      localStorageEntries = Object.keys(window.localStorage)
        .filter(key => key.startsWith('api_cache_')).length
      
      sessionStorageEntries = Object.keys(window.sessionStorage)
        .filter(key => key.startsWith('api_cache_')).length
    }
    
    return {
      memoryEntries: this.memoryCache.size,
      localStorageEntries,
      sessionStorageEntries
    }
  }

  // Invalidate cache by pattern
  invalidatePattern(pattern: RegExp, storage?: 'memory' | 'localStorage' | 'sessionStorage'): void {
    // Memory cache
    if (storage === 'memory' || !storage) {
      const keysToDelete: string[] = []
      this.memoryCache.forEach((_, key) => {
        if (pattern.test(key)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => this.memoryCache.delete(key))
    }
    
    // Web storage
    if (typeof window !== 'undefined') {
      [
        { store: window.localStorage, name: 'localStorage' },
        { store: window.sessionStorage, name: 'sessionStorage' }
      ].forEach(({ store, name }) => {
        if (storage === name || !storage) {
          Object.keys(store)
            .filter(key => key.startsWith('api_cache_') && pattern.test(key.slice(10)))
            .forEach(key => store.removeItem(key))
        }
      })
    }
  }

  // Preload cache with data
  preload<T>(entries: Array<{ url: string; data: T; params?: Record<string, any>; options?: CacheOptions }>): void {
    entries.forEach(({ url, data, params, options }) => {
      this.set(url, data, params, options)
    })
  }
}

// Global cache instance
export const apiCache = new APICache({
  ttl: 5 * 60 * 1000, // 5 minutes default
  storage: 'memory',
  serialize: true
})

// Cache decorator for API functions
export function cached<T extends (...args: any[]) => Promise<any>>(
  ttl: number = 5 * 60 * 1000,
  storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}_${JSON.stringify(args)}`
      
      // Try to get from cache first
      const cached = apiCache.get(cacheKey, undefined, storage)
      if (cached !== null) {
        return cached
      }
      
      // Execute original method and cache result
      const result = await originalMethod.apply(this, args)
      apiCache.set(cacheKey, result, undefined, { ttl, storage })
      
      return result
    }
    
    return descriptor
  }
}

// React Query cache integration
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return error?.response?.status === 408 || error?.response?.status === 429
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
}

// Cache invalidation strategies
export const cacheInvalidation = {
  // Invalidate user-related caches
  invalidateUserData: (userId?: string) => {
    const patterns = [
      /^\/users/,
      /^\/profile/,
      /^\/follows/,
      userId ? new RegExp(`userId=${userId}`) : /userId=/
    ]
    
    patterns.forEach(pattern => {
      apiCache.invalidatePattern(pattern)
    })
  },
  
  // Invalidate event-related caches
  invalidateEventData: (eventId?: string) => {
    const patterns = [
      /^\/events/,
      /^\/discovery/,
      eventId ? new RegExp(`eventId=${eventId}`) : /eventId=/
    ]
    
    patterns.forEach(pattern => {
      apiCache.invalidatePattern(pattern)
    })
  },
  
  // Invalidate all caches
  invalidateAll: () => {
    apiCache.clear()
  }
}