'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - increased to reduce requests
            gcTime: 10 * 60 * 1000, // 10 minutes cache (renamed from cacheTime)
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            refetchInterval: false, // Disable automatic refetching
            retry: (failureCount, error: any) => {
              // Don't retry on 401, 403, 404, 429 (rate limit)
              if (error?.response?.status && [401, 403, 404, 429].includes(error.response.status)) {
                return false
              }
              return failureCount < 2 // Reduced retry attempts
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}