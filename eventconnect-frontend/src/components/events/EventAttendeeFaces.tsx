'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { readEventAttendanceSummary, type VisibleEventAttendee } from './event-attendance-summary'

function AttendeeAvatar({ attendee }: { attendee: VisibleEventAttendee }) {
  const [failedImage, setFailedImage] = useState<string | undefined>()
  const name = attendee.firstName || attendee.username || 'Participante'
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es')
  return (
    <Link href={`/users/${attendee.id}`} aria-label={`Ver perfil de ${name}`}
      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-foreground ring-4 ring-background transition-transform hover:-translate-y-1 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-primary"
      title={name}>
      {attendee.avatar && failedImage !== attendee.avatar
        ? <img src={attendee.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailedImage(attendee.avatar)} />
        : <span aria-hidden="true">{initials}</span>}
    </Link>
  )
}

export function EventAttendeeFaces({ summary, ended = false }: { summary: unknown; ended?: boolean }) {
  const attendance = readEventAttendanceSummary(summary)
  const visible = attendance?.visibleAttendees || []
  const names = visible.slice(0, 3).map(attendee => attendee.firstName || attendee.username || 'Participante')
  const remainder = (attendance?.confirmedCount || 0) - names.length
  return (
    <section aria-labelledby="event-attendee-faces-title" className="mb-8 rounded-3xl bg-muted/35 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="event-attendee-faces-title" className="text-2xl font-bold tracking-tight">{ended ? 'Quién confirmó asistencia' : 'Quién va al coro'}</h2>
        {attendance && <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Users aria-hidden="true" className="h-4 w-4" /><span className="tabular-nums">{attendance.confirmedCount}</span> {attendance.confirmedCount === 1 ? 'confirmación' : 'confirmaciones'}</span>}
      </div>
      {!attendance ? <p className="mt-4 text-sm text-muted-foreground">La lista de confirmaciones no está disponible.</p>
        : attendance.confirmedCount === 0 ? <p className="mt-4 text-muted-foreground">Todavía no hay confirmaciones de asistencia.</p>
          : <>
            {visible.length > 0 && <>
              <div className="mt-6 flex -space-x-3 pl-1" role="group" aria-label="Perfiles públicos de asistentes confirmados">
                {visible.slice(0, 6).map(attendee => <AttendeeAvatar key={attendee.id} attendee={attendee} />)}
              </div>
              <p className="mt-4 max-w-prose font-medium">{names.join(', ')}{remainder > 0 ? ` y ${remainder} más` : ''} {attendance.confirmedCount === 1 ? 'confirmó asistencia' : 'confirmaron asistencia'}.</p>
              {visible.length > 6 && <details className="mt-4">
                <summary className="cursor-pointer rounded-lg py-2 text-sm font-medium text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Ver {visible.length - 6} perfiles públicos más</summary>
                <ul className="mt-3 flex flex-wrap gap-4">
                  {visible.slice(6).map(attendee => <li key={attendee.id}><AttendeeAvatar attendee={attendee} /></li>)}
                </ul>
              </details>}
            </>}
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">{visible.length === 0 ? 'Las personas confirmadas mantienen su perfil reservado. ' : 'Mostramos los perfiles que permiten compartir su asistencia. '}Las confirmaciones no indican presencia en el lugar.</p>
          </>}
    </section>
  )
}
