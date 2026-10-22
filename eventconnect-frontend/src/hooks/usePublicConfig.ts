'use client'

import { useQuery } from '@tanstack/react-query'
import { discoveryApi, type PublicConfig } from '@/lib/api/discovery'

/** Configuración pública del backend (modo de pagos, promoción). Se cachea 10 min. */
export function usePublicConfig(): PublicConfig {
  const { data } = useQuery({
    queryKey: ['public-config'],
    queryFn: () => discoveryApi.getConfig(),
    staleTime: 10 * 60 * 1000
  })
  return data || { paymentsEnabled: false, mode: 'informational', features: {}, promotion: { contact: '', note: '' } }
}
