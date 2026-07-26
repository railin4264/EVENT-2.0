'use client'

import { motion, Variants } from 'framer-motion'
import { Loader2, Calendar, Users, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  rows?: number
  showAvatar?: boolean
}

// Skeleton loading component
export function LoadingSkeleton({ className, rows = 3, showAvatar = false }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {showAvatar && (
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          )}
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Card skeleton for event cards
export function EventCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4 animate-pulse">
      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

// Animated spinner with different variants
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'branded' | 'dots' | 'pulse'
  text?: string
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default', 
  text,
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  if (variant === 'branded') {
    return (
      <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-transparent border-t-primary-500 border-r-primary-500" />
          <Calendar className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary-500" />
        </motion.div>
        {text && (
          <motion.p
            className={cn('text-gray-600 dark:text-gray-400 font-medium', textSizeClasses[size])}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    )
  }

  if (variant === 'dots') {
    const dotVariants: Variants = {
      start: { y: '0%' },
      end: { y: '100%' }
    }

    return (
      <div className={cn('flex flex-col items-center space-y-4', className)}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn('bg-primary-500 rounded-full', {
                'w-2 h-2': size === 'sm',
                'w-3 h-3': size === 'md',
                'w-4 h-4': size === 'lg'
              })}
              variants={dotVariants}
              initial="start"
              animate="end"
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: i * 0.1
              }}
            />
          ))}
        </div>
        {text && (
          <p className={cn('text-gray-600 dark:text-gray-400', textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center space-y-4', className)}>
        <motion.div
          className={cn('bg-primary-500 rounded-full', {
            'w-8 h-8': size === 'sm',
            'w-12 h-12': size === 'md',
            'w-16 h-16': size === 'lg'
          })}
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {text && (
          <p className={cn('text-gray-600 dark:text-gray-400', textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Loader2 className={cn('animate-spin text-primary-500', sizeClasses[size])} />
      {text && (
        <span className={cn('text-gray-600 dark:text-gray-400', textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  )
}

// Page loading overlay
export function PageLoadingOverlay({ isLoading, text = 'Cargando...' }: { 
  isLoading: boolean
  text?: string 
}) {
  if (!isLoading) return null

  return (
    <motion.div
      className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <LoadingSpinner variant="branded" size="lg" text={text} />
    </motion.div>
  )
}

// Content loading states for different sections
export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Feed section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <LoadingSkeleton rows={3} showAvatar={true} />
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <LoadingSkeleton rows={3} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DiscoveryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// Loading state with icon
export function IconLoadingState({ 
  icon: Icon, 
  text, 
  size = 'md' 
}: { 
  icon: React.ComponentType<any>
  text: string
  size?: 'sm' | 'md' | 'lg' 
}) {
  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Icon className={cn('text-gray-400 dark:text-gray-600', iconSizeClasses[size])} />
      </motion.div>
      <p className={cn('text-gray-600 dark:text-gray-400 text-center', textSizeClasses[size])}>
        {text}
      </p>
    </div>
  )
}

// Specific loading states for different content types
export function EventsLoadingState() {
  return <IconLoadingState icon={Calendar} text="Cargando eventos..." />
}

export function UsersLoadingState() {
  return <IconLoadingState icon={Users} text="Cargando usuarios..." />
}

export function LocationLoadingState() {
  return <IconLoadingState icon={MapPin} text="Obteniendo ubicación..." />
}