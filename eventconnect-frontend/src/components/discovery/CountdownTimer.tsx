'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar } from 'lucide-react'

interface CountdownTimerProps {
  eventDate: string
  compact?: boolean
  showIcon?: boolean
  className?: string
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isStarted: boolean
  isEnded: boolean
}

export default function CountdownTimer({
  eventDate,
  compact = false,
  showIcon = true,
  className = ''
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const eventTime = new Date(eventDate).getTime()
      const difference = eventTime - now

      if (difference > 0) {
        // Event hasn't started yet
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
          isStarted: false,
          isEnded: false
        }
      } else if (difference > -86400000) {
        // Event is happening now (within 24 hours after start)
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isStarted: true,
          isEnded: false
        }
      } else {
        // Event has ended
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isStarted: false,
          isEnded: true
        }
      }
    }

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining())

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [eventDate])

  if (!timeRemaining) {
    return null
  }

  // Event has ended
  if (timeRemaining.isEnded) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 ${className}`}>
        {showIcon && <Calendar className="w-4 h-4" />}
        <span className="text-sm font-medium">Finalizado</span>
      </div>
    )
  }

  // Event is happening now
  if (timeRemaining.isStarted) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showIcon && (
          <div className="relative">
            <Clock className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping" />
          </div>
        )}
        <span className="text-sm font-bold text-green-600 dark:text-green-400 animate-pulse">
          ¡En vivo ahora!
        </span>
      </div>
    )
  }

  // Compact version (for cards)
  if (compact) {
    let timeText = ''

    if (timeRemaining.days > 0) {
      timeText = `En ${timeRemaining.days}d ${timeRemaining.hours}h`
    } else if (timeRemaining.hours > 0) {
      timeText = `En ${timeRemaining.hours}h ${timeRemaining.minutes}m`
    } else if (timeRemaining.minutes > 0) {
      timeText = `En ${timeRemaining.minutes}m`
    } else {
      timeText = `En ${timeRemaining.seconds}s`
    }

    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {showIcon && <Clock className="w-3.5 h-3.5 text-orange-500" />}
        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
          {timeText}
        </span>
      </div>
    )
  }

  // Full version (for event details)
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {showIcon && <Clock className="w-5 h-5 text-primary-500" />}
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Comienza en
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Days */}
        <div className="flex flex-col items-center p-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl">
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
            {String(timeRemaining.days).padStart(2, '0')}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
            Días
          </div>
        </div>

        {/* Hours */}
        <div className="flex flex-col items-center p-3 bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 rounded-xl">
          <div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400 tabular-nums">
            {String(timeRemaining.hours).padStart(2, '0')}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
            Horas
          </div>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center p-3 bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 rounded-xl">
          <div className="text-3xl font-bold text-accent-600 dark:text-accent-400 tabular-nums">
            {String(timeRemaining.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
            Min
          </div>
        </div>

        {/* Seconds */}
        <div className="flex flex-col items-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
            {String(timeRemaining.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
            Seg
          </div>
        </div>
      </div>
    </div>
  )
}
