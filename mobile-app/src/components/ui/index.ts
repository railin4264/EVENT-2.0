/**
 * ui/index.ts - UI Components Export
 *
 * Barrel export para todos los componentes UI base
 * Permite imports limpios: import { Button, Card, Input, Skeleton } from '@/components/ui'
 *
 * Fecha: 2025-10-21
 */

export { Button } from './Button';
export { Card } from './Card';
export { Badge } from './Badge';
export { Avatar } from './Avatar';
export { Input } from './Input';
export { PriceTag } from './PriceTag';
export { AvatarStack } from './AvatarStack';
export { CategoryChip } from './CategoryChip';
export { ActionBottomSheet } from './ActionBottomSheet';
export {
  Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonEventCard,
  SkeletonProfile,
} from './Skeleton';

// Re-export types for convenience
export type { ButtonProps } from './Button';
export type { CardProps } from './Card';
export type { BadgeProps } from './Badge';
export type { AvatarProps } from './Avatar';
export type { InputProps } from './Input';
export type { SkeletonProps } from './Skeleton';
