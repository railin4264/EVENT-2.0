'use client'

import { motion } from 'framer-motion'
import { Calendar, TrendingUp, Star, Flame, PartyPopper, DollarSign, Sparkles } from 'lucide-react'

// Alias for missing icons

export type QuickFilterType = 'now' | 'popular' | 'today' | 'weekend' | 'free' | 'new' | 'trending' | null

interface QuickFiltersProps {
  activeFilter: QuickFilterType
  onFilterChange: (filter: QuickFilterType) => void
}

const filters = [
  {
    id: 'now' as QuickFilterType,
    label: 'Ahora Mismo',
    icon: Flame,
    gradient: 'from-pink-500 to-rose-500',
    emoji: '🔴'
  },
  {
    id: 'popular' as QuickFilterType,
    label: 'Populares',
    icon: Flame,
    gradient: 'from-orange-500 to-red-500',
    emoji: '🔥'
  },
  {
    id: 'today' as QuickFilterType,
    label: 'Hoy',
    icon: Calendar,
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '📅'
  },
  {
    id: 'weekend' as QuickFilterType,
    label: 'Fin de Semana',
    icon: PartyPopper,
    gradient: 'from-purple-500 to-pink-500',
    emoji: '🎉'
  },
  {
    id: 'free' as QuickFilterType,
    label: 'Gratis',
    icon: DollarSign,
    gradient: 'from-green-500 to-emerald-500',
    emoji: '💰'
  },
  {
    id: 'new' as QuickFilterType,
    label: 'Nuevos',
    icon: Sparkles,
    gradient: 'from-yellow-500 to-orange-500',
    emoji: '🆕'
  },
  {
    id: 'trending' as QuickFilterType,
    label: 'Tendencia',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-purple-500',
    emoji: '📈'
  }
]

export default function QuickFilters({ activeFilter, onFilterChange }: QuickFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {filters.map((filter, index) => {
        const isActive = activeFilter === filter.id
        const Icon = filter.icon

        return (
          <motion.button
            key={filter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onFilterChange(isActive ? null : filter.id)}
            className={`
              group relative overflow-hidden rounded-full px-5 py-2.5 font-semibold text-sm
              transition-all duration-300 shadow-lg hover:shadow-xl
              ${isActive
                ? `bg-gradient-to-r ${filter.gradient} text-white`
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
          >
            {/* Gradient Border on Hover (for inactive state) */}
            {!isActive && (
              <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${filter.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
            )}

            {/* Content */}
            <div className="relative flex items-center gap-2">
              <span className="text-lg">{filter.emoji}</span>
              <span className="hidden sm:inline">{filter.label}</span>

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              )}
            </div>

            {/* Shine Effect on Active */}
            {isActive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear'
                }}
              />
            )}
          </motion.button>
        )
      })}

      {/* Clear All */}
      {activeFilter && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onFilterChange(null)}
          className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          ✕ Limpiar
        </motion.button>
      )}
    </div>
  )
}
