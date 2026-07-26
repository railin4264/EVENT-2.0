'use client'

import { useApiHealth } from '@/lib/utils/apiHealthCheck'
import { cn } from '@/lib/utils'

interface ApiStatusIndicatorProps {
  className?: string
  showText?: boolean
}

export function ApiStatusIndicator({ className, showText = false }: ApiStatusIndicatorProps) {
  const health = useApiHealth()

  if (!health) {
    return null // Don't show anything until first check
  }

  const isAvailable = health.available
  const isRecent = Date.now() - health.timestamp < 60000 // Last check within 1 minute

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isAvailable && isRecent
              ? 'bg-green-500'
              : !isAvailable && isRecent
              ? 'bg-red-500'
              : 'bg-yellow-500'
          )}
        />
        {isAvailable && isRecent && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-20" />
        )}
      </div>

      {showText && (
        <span className="text-xs text-muted-foreground">
          {isAvailable && isRecent
            ? `API (${health.latency}ms)`
            : !isAvailable && isRecent
            ? 'API offline'
            : 'API status unknown'
          }
        </span>
      )}
    </div>
  )
}

interface ApiStatusBannerProps {
  className?: string
}

export function ApiStatusBanner({ className }: ApiStatusBannerProps) {
  const health = useApiHealth()

  if (!health || health.available) {
    return null // Only show when API is unavailable
  }

  return (
    <div className={cn(
      'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 text-sm',
      'dark:bg-yellow-900/20 dark:border-yellow-500 dark:text-yellow-400',
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <span>
          Backend API is currently unavailable. Some features may not work properly.
          {health.error && ` (${health.error})`}
        </span>
      </div>
    </div>
  )
}