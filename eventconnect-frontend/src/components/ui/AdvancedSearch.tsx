'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, Calendar, MapPin, Users, Star, Clock, DollarSign } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Badge } from './Badge'
import { Input } from './Input'

export interface SearchFilter {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'range' | 'date' | 'location' | 'checkbox'
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  value?: any
}

export interface SearchResult {
  id: string
  title: string
  description?: string
  type: 'event' | 'user' | 'group' | 'location'
  image?: string
  metadata?: Record<string, any>
  relevance?: number
}

interface AdvancedSearchProps {
  placeholder?: string
  filters?: SearchFilter[]
  onSearch: (query: string, filters: Record<string, any>) => Promise<SearchResult[]>
  onSelectResult?: (result: SearchResult) => void
  showFilters?: boolean
  showRecentSearches?: boolean
  debounceMs?: number
  maxResults?: number
  className?: string
}

export function AdvancedSearch({
  placeholder = 'Buscar eventos, usuarios, grupos...',
  filters = [],
  onSearch,
  onSelectResult,
  showFilters = true,
  showRecentSearches = true,
  debounceMs = 300,
  maxResults = 10,
  className
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      const saved = localStorage.getItem('recent-searches')
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved).slice(0, 5))
        } catch (error) {
          console.error('Failed to load recent searches:', error)
        }
      }
    }
  }, [showRecentSearches])

  // Handle search with debouncing
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const searchResults = await onSearch(searchQuery, selectedFilters)
      setResults(searchResults.slice(0, maxResults))
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [onSearch, selectedFilters, maxResults])

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, debounceMs)
  }, [performSearch, debounceMs])

  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query)
    } else {
      setResults([])
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, debouncedSearch])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectResult(results[selectedIndex])
        } else if (query.trim()) {
          saveRecentSearch(query)
          performSearch(query)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    saveRecentSearch(query)
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    onSelectResult?.(result)
  }

  const saveRecentSearch = (searchQuery: string) => {
    if (!showRecentSearches || !searchQuery.trim()) return

    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recent-searches', JSON.stringify(updated))
  }

  const handleFilterChange = (filterId: string, value: any) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  const clearFilters = () => {
    setSelectedFilters({})
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'event': return Calendar
      case 'user': return Users
      case 'group': return Users
      case 'location': return MapPin
      default: return Search
    }
  }

  const activeFilterCount = Object.values(selectedFilters).filter(Boolean).length

  return (
    <div ref={searchRef} className={cn('relative w-full max-w-2xl', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-20 h-12 text-base"
        />

        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
          
          {showFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={cn(
                'h-8 w-8 p-0',
                showFilterPanel && 'bg-gray-100 dark:bg-gray-700'
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}

          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('')
                setResults([])
                inputRef.current?.focus()
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Filtros de búsqueda</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-sm"
              >
                Limpiar filtros
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-2">
                  <label className="text-sm font-medium">{filter.label}</label>
                  
                  {filter.type === 'select' && (
                    <select
                      value={selectedFilters[filter.id] || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                    >
                      <option value="">Todos</option>
                      {filter.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {filter.type === 'checkbox' && (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters[filter.id] || false}
                        onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm">{filter.label}</span>
                    </label>
                  )}

                  {filter.type === 'range' && (
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={filter.min}
                        max={filter.max}
                        value={selectedFilters[filter.id] || filter.min}
                        onChange={(e) => handleFilterChange(filter.id, Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{filter.min}</span>
                        <span>{selectedFilters[filter.id] || filter.min}</span>
                        <span>{filter.max}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {isOpen && (query.trim() || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto z-40"
          >
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Buscando...</span>
              </div>
            )}

            {/* Results */}
            {!isLoading && results.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  Resultados
                </div>
                {results.map((result, index) => {
                  const Icon = getResultIcon(result.type)
                  
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left',
                        selectedIndex === index && 'bg-gray-50 dark:bg-gray-700'
                      )}
                    >
                      <div className="flex-shrink-0">
                        {result.image ? (
                          <img
                            src={result.image}
                            alt={result.title}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {result.title}
                        </p>
                        {result.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                      
                      <Badge variant="secondary" className="text-xs">
                        {result.type}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}

            {/* No results */}
            {!isLoading && query.trim() && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="w-8 h-8 mb-2" />
                <p className="text-sm">No se encontraron resultados</p>
              </div>
            )}

            {/* Recent searches */}
            {!query.trim() && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  Búsquedas recientes
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search)
                      performSearch(search)
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{search}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}