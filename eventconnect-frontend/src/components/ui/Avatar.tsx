'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/format'

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full border',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-20 w-20 text-xl',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  name?: string
  online?: boolean
  badge?: string | number
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, src, alt, fallback, name, online, badge, ...props }, ref) => {
  const displayFallback = fallback || (name ? getInitials(name) : '?')

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt || name}
          className="aspect-square h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center bg-muted font-medium">
          {displayFallback}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {/* Online indicator */}
      {online !== undefined && (
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            size === 'xs' && 'h-2 w-2',
            size === 'sm' && 'h-2.5 w-2.5',
            size === 'default' && 'h-3 w-3',
            size === 'lg' && 'h-3.5 w-3.5',
            size === 'xl' && 'h-4 w-4',
            size === '2xl' && 'h-5 w-5',
            online ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}

      {/* Badge */}
      {badge && (
        <div
          className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium min-w-5 h-5 px-1',
            size === 'xs' && 'min-w-4 h-4 text-[10px]',
            size === 'sm' && 'min-w-4 h-4 text-[10px]',
            size === 'lg' && 'min-w-6 h-6 text-sm',
            size === 'xl' && 'min-w-7 h-7 text-sm',
            size === '2xl' && 'min-w-8 h-8 text-base'
          )}
        >
          {badge}
        </div>
      )}
    </div>
  )
})
Avatar.displayName = 'Avatar'

const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    max?: number
    size?: VariantProps<typeof avatarVariants>['size']
  }
>(({ className, children, max = 3, size = 'default', ...props }, ref) => {
  const childrenArray = React.Children.toArray(children)
  const visibleChildren = childrenArray.slice(0, max)
  const remainingCount = childrenArray.length - max

  return (
    <div
      ref={ref}
      className={cn('flex items-center', className)}
      {...props}
    >
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className={cn(
            'relative',
            index > 0 && '-ml-2',
            'ring-2 ring-background rounded-full'
          )}
          style={{ zIndex: visibleChildren.length - index }}
        >
          {child}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={cn(
            avatarVariants({ size }),
            'bg-muted text-muted-foreground font-medium flex items-center justify-center -ml-2',
            'ring-2 ring-background'
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
})
AvatarGroup.displayName = 'AvatarGroup'

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarGroup, AvatarImage, AvatarFallback, avatarVariants }