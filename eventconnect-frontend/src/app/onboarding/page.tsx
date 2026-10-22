'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Onboarding } from '@/components/redesign/Onboarding'
import { useAuthStore } from '@/stores/authStore'
import { authPageHref, safeRedirect } from '@/lib/auth/redirect'

function OnboardingRoute() {
  const router = useRouter()
  const params = useSearchParams()
  const user = useAuthStore(state => state.user)
  const authenticated = useAuthStore(state => state.isAuthenticated)
  const [hydrated, setHydrated] = useState(false)
  const requested = safeRedirect(params.get('redirect'))
  const destination = new URL(requested, 'https://eventnow.local').pathname === '/onboarding' ? '/events' : requested

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated())
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])
  useEffect(() => {
    if (hydrated && (!authenticated || !user)) {
      router.replace(authPageHref('/login', `/onboarding?redirect=${encodeURIComponent(destination)}`))
    }
  }, [hydrated, authenticated, user, destination, router])

  if (!hydrated || !authenticated || !user) return <Loading />
  return <Onboarding key={user.id || user._id} user={user} onComplete={() => router.replace(destination)} onSkip={() => router.replace(destination)} />
}

function Loading() {
  return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Cargando personalización" /></div>
}

export default function OnboardingPage() {
  return <Suspense fallback={<Loading />}><OnboardingRoute /></Suspense>
}
