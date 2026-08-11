'use client'

import { cn } from '@/lib/utils'

type DotMatrixVariant = 'wave' | 'spiral' | 'radar' | 'pulse'

interface DotMatrixLoaderProps {
  variant?: DotMatrixVariant
  size?: number
  dotColor?: string
  className?: string
}

const GRID = 5 // 5x5 = 25 dots

function delayFor(variant: DotMatrixVariant, row: number, col: number): number {
  const cx = (GRID - 1) / 2
  const cy = (GRID - 1) / 2
  switch (variant) {
    case 'spiral':
      return Math.sqrt((row - cy) ** 2 + (col - cx) ** 2) * 0.16
    case 'radar':
      return (row + col) * 0.1
    case 'pulse':
      return 0
    case 'wave':
    default:
      return (row + col) * 0.12
  }
}

/**
 * DotMatrixLoader — dot-matrix loading animation (dotmatrix tool style, MIT).
 * A grid of dots that light up in a wave / spiral / radar / pulse pattern.
 */
export function DotMatrixLoader({
  variant = 'wave',
  size = 120,
  dotColor = '#8B5CF6',
  className,
}: DotMatrixLoaderProps) {
  const dots = []
  for (let i = 0; i < GRID * GRID; i++) {
    const row = Math.floor(i / GRID)
    const col = i % GRID
    const dot = size / (GRID * 2.4)
    dots.push(
      <span
        key={i}
        className="dotmatrix-dot"
        style={{
          animationDelay: `${delayFor(variant, row, col)}s`,
          background: dotColor,
          width: `${dot}px`,
          height: `${dot}px`,
        }}
      />,
    )
  }
  return (
    <div
      className={cn('dotmatrix-grid', className)}
      style={
        {
          '--dm-size': `${size}px`,
          '--dm-color': dotColor,
        } as React.CSSProperties
      }
      role="status"
      aria-label="Cargando"
    >
      {dots}
    </div>
  )
}
