'use client'

import { useRouter } from 'next/navigation'
import { eventSignInHref } from './event-detail-utils'
import { eventRsvpSignInHref } from './event-rsvp-intent'

export function useEventSignIn(eventId: string) {
  const router = useRouter()
  return (intent?: 'rsvp') => router.push(intent === 'rsvp' ? eventRsvpSignInHref(eventId) : eventSignInHref(eventId))
}
