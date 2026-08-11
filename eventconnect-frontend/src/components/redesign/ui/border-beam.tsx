'use client'

import { cn } from '@/lib/utils'

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  anchor?: number
  borderWidth?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
}

/**
 * BorderBeam — animated luminous border (Magic UI style, MIT).
 * Wrap a relatively-positioned, rounded container; the beam rotates around it.
 */
export function BorderBeam({
  className,
  size = 220,
  duration = 12,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = '#8B5CF6',
  colorTo = '#3B82F6',
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          borderWidth: `${borderWidth}px`,
          borderStyle: 'solid',
          borderColor: 'transparent',
          background: `radial-gradient(${size}px circle at ${anchor}deg, ${colorFrom}, ${colorTo}, transparent 35%)`,
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: `${borderWidth}px`,
          animation: `border-beam ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          pointerEvents: 'none',
        } as React.CSSProperties
      }
      className={cn('pointer-events-none', className)}
    />
  )
}
