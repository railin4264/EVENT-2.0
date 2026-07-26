'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedLikeButtonProps {
  isLiked: boolean
  likeCount: number
  onLike: () => void
  onUnlike: () => void
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  disabled?: boolean
}

export function AnimatedLikeButton({
  isLiked,
  likeCount,
  onLike,
  onUnlike,
  size = 'md',
  showCount = true,
  disabled = false
}: AnimatedLikeButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [particles, setParticles] = useState<number[]>([])

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const handleClick = async () => {
    if (disabled || isAnimating) return

    setIsAnimating(true)

    if (!isLiked) {
      // Trigger particle explosion
      setParticles([1, 2, 3, 4, 5, 6, 7, 8])
      setTimeout(() => setParticles([]), 1000)

      onLike()
    } else {
      onUnlike()
    }

    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative flex items-center gap-1.5 transition-all rounded-full px-3 py-1.5',
        'hover:bg-red-50 dark:hover:bg-red-950/20',
        disabled && 'opacity-50 cursor-not-allowed',
        isLiked && 'text-red-500'
      )}
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      {/* Particle Explosion Effect */}
      <AnimatePresence>
        {particles.map((particle, index) => (
          <motion.div
            key={`particle-${particle}-${index}`}
            initial={{
              opacity: 1,
              scale: 0,
              x: 0,
              y: 0
            }}
            animate={{
              opacity: 0,
              scale: 1,
              x: Math.cos((index * 45) * Math.PI / 180) * 30,
              y: Math.sin((index * 45) * Math.PI / 180) * 30
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute"
            style={{ pointerEvents: 'none' }}
          >
            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Heart Icon with Scale Animation */}
      <motion.div
        animate={{
          scale: isAnimating ? [1, 1.3, 1] : 1,
        }}
        transition={{
          duration: 0.3,
          times: [0, 0.5, 1],
          ease: 'easeInOut'
        }}
      >
        <Heart
          className={cn(
            sizeClasses[size],
            'transition-all',
            isLiked && 'fill-red-500 text-red-500'
          )}
        />
      </motion.div>

      {/* Like Count with Bounce Animation */}
      {showCount && (
        <AnimatePresence mode="wait">
          <motion.span
            key={likeCount}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'font-medium',
              textSizeClasses[size],
              isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {likeCount}
          </motion.span>
        </AnimatePresence>
      )}

      {/* Ripple Effect */}
      {isAnimating && !isLiked && (
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-full bg-red-500"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </button>
  )
}
