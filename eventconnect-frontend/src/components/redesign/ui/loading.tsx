'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const loadingVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  text?: string
  fullscreen?: boolean
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size, text, fullscreen, ...props }, ref) => {
    const content = (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-3',
          fullscreen && 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50',
          className
        )}
        {...props}
      >
        <Loader2 className={cn(loadingVariants({ size }))} />
        {text && (
          <span className="text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    )

    return content
  }
)
Loading.displayName = 'Loading'

// Skeleton component for loading states
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  width?: string | number
  height?: string | number
  rounded?: boolean
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, lines = 1, width, height, rounded = true, ...props }, ref) => {
    if (lines === 1) {
      return (
        <div
          ref={ref}
          className={cn(
            'skeleton',
            rounded ? 'rounded' : '',
            className
          )}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height || '1rem',
          }}
          {...props}
        />
      )
    }

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn('skeleton h-4', rounded ? 'rounded' : '')}
            style={{
              width:
                index === lines - 1
                  ? '75%'
                  : typeof width === 'number'
                  ? `${width}px`
                  : width || '100%',
            }}
          />
        ))}
      </div>
    )
  }
)
Skeleton.displayName = 'Skeleton'

export { Loading, Skeleton, loadingVariants }