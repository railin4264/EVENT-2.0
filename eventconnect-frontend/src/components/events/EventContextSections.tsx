'use client'

import type { ComponentProps } from 'react'
import StoriesBar from '@/components/stories/StoriesBar'
import { useAuthStore } from '@/stores/authStore'
import { EventSectionDisclosure } from './EventSectionDisclosure'
import { SoloGoersSection } from './SoloGoersSection'
import { EventPlusOneSection } from './EventPlusOneSection'
import { EventSongVotingSection } from './EventSongVotingSection'
import VibeRadarSection from './VibeRadarSection'
import SafetyCoroSection from './SafetyCoroSection'
import { EventAfterRadarSection } from './EventAfterRadarSection'
import { EventMemoriesSection } from './EventMemoriesSection'
import { MutualReconnectSection } from './MutualReconnectSection'
import type { EventPhase } from './event-phase'

interface ContextEvent {
  _id: string
  title: string
  isAttending?: boolean
  location?: { venue?: string; address?: string }
  createdBy: { _id: string; username: string; firstName: string; lastName: string }
  vibeRadar?: ComponentProps<typeof VibeRadarSection>['initialData']
}

export function EventContextSections({ event, phase, isOrganizer, onUpdate }: {
  event: ContextEvent; phase: EventPhase; isOrganizer: boolean; onUpdate: () => void
}) {
  const { isAuthenticated } = useAuthStore()
  const isAttendee = Boolean(isAuthenticated && event.isAttending)
  const canParticipate = isAttendee || (isAuthenticated && isOrganizer)

  if (phase === 'cancelled') return null

  if (phase === 'upcoming') return (
    <EventSectionDisclosure title="Organiza tu plan" description="Acompañantes, mesa para quienes van solos y canciones para el evento.">
      <SoloGoersSection eventId={event._id} isOrganizer={isOrganizer} />
      <EventPlusOneSection eventId={event._id} />
      <EventSongVotingSection eventId={event._id} />
      <EventSectionDisclosure title="Historias del evento" description="Mira lo que comparte la comunidad antes de llegar.">
        <StoriesBar eventId={event._id} event={event} />
      </EventSectionDisclosure>
    </EventSectionDisclosure>
  )

  if (phase === 'live') return (
    <section aria-label="Durante el evento" className="mb-6 space-y-6">
      {canParticipate ? <>
        <VibeRadarSection eventId={event._id} initialData={event.vibeRadar} isLiveOrToday />
        <SafetyCoroSection event={event} onUpdate={onUpdate} />
      </> : (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">
          El evento está en curso. Las herramientas de ambiente y retorno están disponibles para asistentes confirmados.
        </p>
      )}
      <EventSectionDisclosure title="Historias y planes al salir" description="Historias del evento y propuestas para continuar el encuentro.">
        <StoriesBar eventId={event._id} event={event} />
        <EventAfterRadarSection eventId={event._id} />
      </EventSectionDisclosure>
    </section>
  )

  return (
    <section aria-label="Después del evento" className="mb-6 space-y-6">
      <EventMemoriesSection eventId={event._id} isAttendee={isAttendee} isOrganizer={Boolean(isAuthenticated && isOrganizer)} />
      {isAttendee && <MutualReconnectSection eventId={event._id} isAttendee />}
    </section>
  )
}
