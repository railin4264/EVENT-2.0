import React from 'react'
import { ExternalLink, Globe } from 'lucide-react'
import { safeEventLink } from './event-detail-utils'

export interface PublicEventSource {
  name?: string; datasetUrl?: string; license?: string; licenseUrl?: string; checkedAt?: string
}

export function ImportedEventSourceNotice({ source, externalUrl, organizer }: { source: PublicEventSource; externalUrl?: string; organizer?: string }) {
  const original = safeEventLink(externalUrl)
  const dataset = safeEventLink(source.datasetUrl)
  const license = safeEventLink(source.licenseUrl)
  return <section aria-label="Procedencia del evento" className="mb-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
    <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Globe className="h-4 w-4" />Agenda pública</p>
    <h3 className="mt-3 text-xl font-semibold">{source.name || 'Información de una fuente externa'}</h3>
    {organizer && organizer !== source.name && <p className="mt-2 text-sm text-muted-foreground">Según la fuente: {organizer}</p>}
    <p className="mt-3 text-sm leading-6 text-muted-foreground">EventNow te ayuda a descubrir esta actividad. Comprueba la inscripción, disponibilidad y cambios en la publicación original. Guardarla o marcar asistencia aquí no sustituye una reserva oficial.</p>
    {original && <a href={original} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Consultar evento original<ExternalLink className="h-4 w-4" /></a>}
    <p className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">{dataset && <a href={dataset} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Origen de los datos</a>}{license && <a href={license} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{source.license || 'Licencia de reutilización'}</a>}</p>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">Datos adaptados de formato. Sin afiliación ni patrocinio de la fuente.</p>
  </section>
}
