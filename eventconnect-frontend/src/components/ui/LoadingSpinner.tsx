'use client'

import { motion } from 'framer-motion'
import { Loader2, Calendar } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'pulse' | 'branded'
  text?: string
  fullScreen?: boolean
}

export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner', 
  text, 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex items-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-primary-500 rounded-full"
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        )

      case 'pulse':
        return (
          <motion.div
            className={`${sizeClasses[size]} bg-primary-500 rounded-full`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity
            }}
          />
        )

      case 'branded':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className={`${sizeClasses[size]} rounded-xl gradient-primary flex items-center justify-center`}>
              <Calendar className="w-1/2 h-1/2 text-white" />
            </div>
          </motion.div>
        )

      case 'spinner':
      default:
        return (
          <Loader2 className={`${sizeClasses[size]} animate-spin text-primary-500`} />
        )
    }
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {renderSpinner()}
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-400 font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

// Skeleton components for different content types
export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-48 mb-4"></div>
    <div className="space-y-2">
      <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-3/4"></div>
      <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-1/2"></div>
    </div>
  </div>
)

export const SkeletonList = ({ items = 5, className = '' }: { items?: number; className?: string }) => (
  <div className={`space-y-4 ${className}`}>
    {[...Array(items)].map((_, i) => (
      <div key={i} className="animate-pulse flex items-center space-x-4">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-10 w-10"></div>
        <div className="flex-1 space-y-2">
          <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-3/4"></div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonText = ({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number; 
  className?: string 
}) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <div
        key={i}
        className={`bg-gray-200 dark:bg-gray-700 rounded h-4 ${
          i === lines - 1 ? 'w-2/3' : 'w-full'
        }`}
      ></div>
    ))}
  </div>
)

export const SkeletonAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}></div>
  )
}