'use client'

export default function EventCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="animate-pulse">
        {/* Image Skeleton */}
        <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer" />

        <div className="p-6">
          {/* Category Badge */}
          <div className="h-6 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-full mb-3 bg-[length:200%_100%] animate-shimmer" />

          {/* Title */}
          <div className="h-7 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg mb-2 w-3/4 bg-[length:200%_100%] animate-shimmer" />

          {/* Description Lines */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-full bg-[length:200%_100%] animate-shimmer" />
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-5/6 bg-[length:200%_100%] animate-shimmer" />
          </div>

          {/* Info Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="h-8 w-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-full bg-[length:200%_100%] animate-shimmer" />
            <div className="h-8 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-full bg-[length:200%_100%] animate-shimmer" />
            <div className="h-8 w-28 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-full bg-[length:200%_100%] animate-shimmer" />
          </div>

          {/* Button */}
          <div className="h-12 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-xl w-full bg-[length:200%_100%] animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

// Carousel Skeleton
export function CarouselSkeleton() {
  return (
    <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden rounded-3xl bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse">
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
        <div className="max-w-4xl space-y-4">
          {/* Category Badge */}
          <div className="h-8 w-32 bg-white/20 rounded-full backdrop-blur-md" />

          {/* Title */}
          <div className="space-y-2">
            <div className="h-12 bg-white/20 rounded-lg w-3/4 backdrop-blur-md" />
            <div className="h-12 bg-white/20 rounded-lg w-1/2 backdrop-blur-md" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="h-6 bg-white/20 rounded w-full backdrop-blur-md" />
            <div className="h-6 bg-white/20 rounded w-4/5 backdrop-blur-md" />
          </div>

          {/* Info Pills */}
          <div className="flex gap-3">
            <div className="h-10 w-40 bg-white/20 rounded-full backdrop-blur-md" />
            <div className="h-10 w-40 bg-white/20 rounded-full backdrop-blur-md" />
            <div className="h-10 w-32 bg-white/20 rounded-full backdrop-blur-md" />
          </div>

          {/* Button */}
          <div className="h-14 w-48 bg-white/40 rounded-full backdrop-blur-md" />
        </div>
      </div>
    </div>
  )
}

// Grid Skeleton
export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}
