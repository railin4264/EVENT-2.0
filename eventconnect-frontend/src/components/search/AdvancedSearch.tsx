'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Calendar, X, Clock, Users, Star, Tag, Sliders, TrendingUp, Mic } from 'lucide-react'
import { eventsService } from '@/lib/api/services'

interface SearchFilters {
  category?: string
  location?: string
  dateRange?: { start: Date; end: Date }
  priceRange?: { min: number; max: number }
  attendees?: { min: number; max: number }
  tags?: string[]
  distance?: number
}

interface SearchSuggestion {
  type: 'event' | 'location' | 'category' | 'tag'
  value: string
  count?: number
  trending?: boolean
}

export default function AdvancedSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isListening, setIsListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Voice search setup
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'es-ES'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
        handleSearch(transcript)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  // Get real AI suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length > 2) {
        try {
          const response = await eventsService.searchEvents(query, { limit: 5 })
          if (response.success && response.data) {
            const realSuggestions: SearchSuggestion[] = response.data.map(event => ({
              type: 'event',
              value: event.title,
              count: event.attendeesCount || 0,
              trending: (event.attendeesCount || 0) > 20
            }))
            
            // Add a category suggestion if we have matches
            if (response.data.length > 0) {
              const mainCat = response.data[0].category
              realSuggestions.push({
                type: 'category',
                value: mainCat,
                count: response.data.length
              })
            }
            
            setSuggestions(realSuggestions)
          } else {
            setSuggestions([])
          }
        } catch (error) {
          console.error('Failed to fetch search suggestions', error)
          setSuggestions([])
        }
      } else {
        setSuggestions([])
      }
    }
    
    // Simple debounce
    const timeoutId = setTimeout(() => {
      fetchSuggestions()
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [query])

  const startVoiceSearch = () => {
    if (recognitionRef.current) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const handleSearch = (searchQuery: string = query) => {
    if (!searchQuery.trim()) return

    // Add to recent searches
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))

    // Perform search
    console.log('Searching:', { query: searchQuery, filters })
    setIsOpen(false)
  }

  const clearFilters = () => {
    setFilters({})
  }

  const activeFiltersCount = Object.keys(filters).filter(key =>
    filters[key as keyof SearchFilters] !== undefined
  ).length

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <motion.div
          className="relative flex items-center gap-2"
          whileFocus={{ scale: 1.02 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar eventos, lugares, categorías..."
              className="w-full pl-12 pr-32 py-4 rounded-2xl glass border border-white/20 focus:outline-none focus:border-primary-500 text-lg transition-all"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={startVoiceSearch}
                className={`p-2 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-2 rounded-xl transition-all ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-primary-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Sliders className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {activeFiltersCount}
                  </div>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Search Suggestions Dropdown */}
        <AnimatePresence>
          {isOpen && (query || recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
            >
              {/* Recent Searches */}
              {!query && recentSearches.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-500">Búsquedas recientes</h3>
                    <button
                      onClick={() => {
                        setRecentSearches([])
                        localStorage.removeItem('recentSearches')
                      }}
                      className="text-xs text-primary-500 hover:underline"
                    >
                      Limpiar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(search)
                          handleSearch(search)
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="flex-1">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions */}
              {query && suggestions.length > 0 && (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">Sugerencias</h3>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(suggestion.value)
                          handleSearch(suggestion.value)
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
                      >
                        {suggestion.type === 'event' && <Calendar className="w-4 h-4 text-blue-500" />}
                        {suggestion.type === 'location' && <MapPin className="w-4 h-4 text-green-500" />}
                        {suggestion.type === 'category' && <Tag className="w-4 h-4 text-purple-500" />}
                        {suggestion.type === 'tag' && <Tag className="w-4 h-4 text-orange-500" />}
                        <span className="flex-1">{suggestion.value}</span>
                        {suggestion.trending && (
                          <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                            <TrendingUp className="w-3 h-3" />
                            Trending
                          </span>
                        )}
                        {suggestion.count && (
                          <span className="text-xs text-gray-400">{suggestion.count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Filtros Avanzados</h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-500 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-2">Categoría</label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Todas las categorías</option>
                    <option value="music">Música</option>
                    <option value="sports">Deportes</option>
                    <option value="tech">Tecnología</option>
                    <option value="food">Gastronomía</option>
                    <option value="art">Arte y Cultura</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium mb-2">Ubicación</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.location || ''}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                      placeholder="Ciudad o dirección"
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium mb-2">Rango de Precio</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange?.min || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: { ...filters.priceRange, min: Number(e.target.value), max: filters.priceRange?.max || 0 }
                      })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange?.max || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: { min: filters.priceRange?.min || 0, max: Number(e.target.value) }
                      })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label className="block text-sm font-medium mb-2">Distancia (km)</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={filters.distance || 10}
                    onChange={(e) => setFilters({ ...filters, distance: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 km</span>
                    <span>{filters.distance || 10} km</span>
                    <span>100 km</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-6 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleSearch()
                    setShowFilters(false)
                  }}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold hover:shadow-lg transition-all"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
