import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onLike: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  likesCount,
  onLike,
  size = 'md',
  showCount = true,
  className
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
  const [optimisticCount, setOptimisticCount] = useState(likesCount);
  const [isLoading, setIsLoading] = useState(false);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const handleClick = async () => {
    if (isLoading) return;

    // Optimistic update
    const newLikedState = !optimisticLiked;
    setOptimisticLiked(newLikedState);
    setOptimisticCount(prev => newLikedState ? prev + 1 : prev - 1);

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    setIsLoading(true);
    try {
      await onLike();
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticLiked(!newLikedState);
      setOptimisticCount(prev => newLikedState ? prev - 1 : prev + 1);
      console.error('Error liking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors rounded-full px-3 py-1.5',
        'hover:bg-red-50 dark:hover:bg-red-950/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        className
      )}
      aria-label={optimisticLiked ? 'Unlike' : 'Like'}
    >
      <div className="relative">
        <Heart
          className={cn(
            sizeClasses[size],
            'transition-all duration-200',
            optimisticLiked
              ? 'fill-red-500 text-red-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-red-500',
            isAnimating && 'animate-like-bounce'
          )}
        />
        {isAnimating && (
          <>
            <Heart
              className={cn(
                sizeClasses[size],
                'absolute inset-0 fill-red-500 text-red-500 animate-like-pop'
              )}
            />
            {/* Particle effects */}
            <div className="absolute inset-0">
              <div className="absolute -top-1 -left-1 w-1 h-1 bg-red-400 rounded-full animate-like-particle-1" />
              <div className="absolute -top-1 -right-1 w-1 h-1 bg-red-400 rounded-full animate-like-particle-2" />
              <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-red-400 rounded-full animate-like-particle-3" />
              <div className="absolute -bottom-1 -right-1 w-1 h-1 bg-red-400 rounded-full animate-like-particle-4" />
            </div>
          </>
        )}
      </div>
      {showCount && (
        <span
          className={cn(
            textSizeClasses[size],
            'font-medium tabular-nums',
            optimisticLiked
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          {optimisticCount}
        </span>
      )}
    </button>
  );
};
