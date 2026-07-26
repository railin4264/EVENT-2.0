'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Calendar, MapPin, Users, Clock, Star, TrendingUp, History, X, User, Heart, MessageCircle, DollarSign } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
import { apiClient } from '@/lib/api/client'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'event' | 'user' | 'tribe'
  title: string
  description: string
  image?: string
  metadata?: any
  relevance: number
}

interface SearchFilters {
  type: 'all' | 'events' | 'users' | 'tribes'
  category?: string
  location?: string
  dateRange?: {
    start?: string
    end?: string
  }
  priceRange?: {
    min: number
    max: number
  }
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<SearchFilters>({ type: 'all' })
  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-searches')
    if (stored) {
      setRecentSearches(JSON.parse(stored))
    }
  }, [])

  // Save search to recent searches
  const saveSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return
    
    const updated = [
      searchTerm,
      ...recentSearches.filter(s => s !== searchTerm)
    ].slice(0, 10)
    
    setRecentSearches(updated)
    localStorage.setItem('recent-searches', JSON.stringify(updated))
  }

  // Search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return []

      const params = new URLSearchParams({
        q: debouncedQuery,
        type: filters.type,
        ...(filters.category && { category: filters.category }),
        ...(filters.location && { location: filters.location }),
        ...(filters.dateRange?.start && { startDate: filters.dateRange.start }),
        ...(filters.dateRange?.end && { endDate: filters.dateRange.end }),
        ...(filters.priceRange && { 
          minPrice: filters.priceRange.min.toString(),
          maxPrice: filters.priceRange.max.toString()
        })
      })

      const response = await apiClient.get(`/search?${params}`)
      return response.data.results as SearchResult[]
    },
    enabled: !!debouncedQuery.trim()
  })

  // Trending searches
  const { data: trendingSearches } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      const response = await apiClient.get('/search/trending')
      return response.data.trending as string[]
    }
  })

  const handleSearch = (searchTerm: string = query) => {
    if (searchTerm.trim()) {
      saveSearch(searchTerm)
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`)
    }
  }

  const clearRecentSearch = (searchTerm: string) => {
    const updated = recentSearches.filter(s => s !== searchTerm)
    setRecentSearches(updated)
    localStorage.setItem('recent-searches', JSON.stringify(updated))
  }

  const clearAllRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recent-searches')
  }

  const resultsByType = useMemo(() => {
    if (!searchResults) return { events: [], users: [], tribes: [] }
    
    return {
      events: searchResults.filter(r => r.type === 'event'),
      users: searchResults.filter(r => r.type === 'user'),
      tribes: searchResults.filter(r => r.type === 'tribe')
    }
  }, [searchResults])

  const totalResults = searchResults?.length || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search Header */}
        <div className="mb-8">
          <div className="relative mb-4">
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0 p-4">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                placeholder="Buscar eventos, personas, tribus..."
                className="flex-1 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
              />
              
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="flex-shrink-0 p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-shrink-0 p-2 mr-2 rounded-full transition-colors ${
                  showFilters ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'events', 'users', 'tribes'].map((type) => (
              <button
                key={type}
                onClick={() => setFilters(prev => ({ ...prev, type: type as any }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filters.type === type
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {debouncedQuery.trim() ? (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resultados para "{debouncedQuery}"
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : totalResults === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No se encontraron resultados
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Intenta con otros términos o ajusta los filtros
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Events Results */}
                {resultsByType.events.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Eventos ({resultsByType.events.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {resultsByType.events.map((result) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/events/${result.id}`)}
                        >
                          {result.image && (
                            <img 
                              src={result.image} 
                              alt={result.title}
                              className="w-full h-32 object-cover"
                            />
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {result.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {result.description}
                            </p>
                            {result.metadata && (
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(result.metadata.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {result.metadata.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users Results */}
                {resultsByType.users.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personas ({resultsByType.users.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {resultsByType.users.map((result) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/profile?id=${result.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {result.image ? (
                                <img 
                                  src={result.image} 
                                  alt={result.title}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                result.title[0]
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {result.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                                {result.description}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tribes Results */}
                {resultsByType.tribes.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Tribus ({resultsByType.tribes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {resultsByType.tribes.map((result) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/tribes/${result.id}`)}
                        >
                          {result.image && (
                            <img 
                              src={result.image} 
                              alt={result.title}
                              className="w-full h-24 object-cover"
                            />
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {result.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {result.description}
                            </p>
                            {result.metadata && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {result.metadata.members} miembros
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Search Suggestions */
          <div className="space-y-8">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Búsquedas recientes
                  </h3>
                  <button
                    onClick={clearAllRecentSearches}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Limpiar todo
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <div key={index} className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setQuery(search)
                          handleSearch(search)
                        }}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        {search}
                      </button>
                      <button
                        onClick={() => clearRecentSearch(search)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            {trendingSearches && trendingSearches.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tendencias
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(search)
                        handleSearch(search)
                      }}
                      className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg px-3 py-2 text-sm hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>}>
      <SearchContent />
    </Suspense>
  )
}
