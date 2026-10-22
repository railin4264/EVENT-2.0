'use client'

import React, { useState } from 'react'
import { Car, Home, Building2, ExternalLink, Users, Clock, MapPin, Tag, Compass, Check, Copy } from 'lucide-react'
import { hospitalityPlan, type HospitalityEvent } from '@/lib/hospitality-plan'

const action = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px'
const secondary = `${action} border border-border bg-background hover:bg-muted text-foreground`

function ProviderLink({ href, children, primary = false }: { href: string | null; children: React.ReactNode; primary?: boolean }) {
  const className = primary ? `${action} bg-primary text-primary-foreground hover:opacity-90` : secondary
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
    {children}<ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="sr-only"> (sitio externo)</span>
  </a> : <span aria-disabled="true" className={`${className} cursor-not-allowed opacity-50`}>{children}</span>
}

export function EventTravelPanel({ event, onOpenSerrucho }: { event: HospitalityEvent; onOpenSerrucho?: () => void }) {
  const [stayOptions, setStayOptions] = useState({ nightsBefore: 0, nightsAfter: 1, guests: 4 })
  const plan = hospitalityPlan(event, stayOptions)
  const [copyStatus, setCopyStatus] = useState('')
  async function copyLocation() {
    try {
      await navigator.clipboard.writeText([event.title, plan.venue, plan.destination, plan.uber].filter(Boolean).join('\n'))
      setCopyStatus('Ubicación copiada')
    } catch {
      setCopyStatus('No se pudo copiar. Puedes seleccionar el destino que aparece aquí.')
    }
  }
  return <div className="my-8 space-y-5">
    {(event.isRecurring || event.isCommercialDeal || event.isTourOrTrip) && <section aria-label="Sobre esta experiencia" className="divide-y divide-border rounded-2xl border border-border bg-card px-5 sm:px-6">
      {event.isRecurring && <div className="flex gap-4 py-5"><Clock className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-semibold tracking-wide text-muted-foreground">Actividad recurrente</p><h3 className="mt-1 text-base font-semibold text-foreground">{plan.recurrence}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Confirma la próxima sesión y el horario antes de salir.</p></div></div>}
      {event.isCommercialDeal && <div className="flex gap-4 py-5"><Tag className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-semibold tracking-wide text-muted-foreground">Promoción comercial</p><h3 className="mt-1 text-base font-semibold text-foreground">{event.commercialBrand || 'Oferta del organizador'}</h3><p className="mt-1 text-sm leading-6 text-foreground">{event.commercialOffer || 'Consulta los beneficios y condiciones con el organizador.'}</p></div></div>}
      {event.isTourOrTrip && <div className="flex gap-4 py-5"><Compass className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-semibold tracking-wide text-muted-foreground">Tour o excursión</p><h3 className="mt-1 text-base font-semibold text-foreground">Antes de partir</h3>
        {!plan.reserved && event.tourDetails?.departurePoint && <p className="mt-2 text-sm leading-6 text-foreground">Salida: {event.tourDetails.departurePoint}</p>}
        {!!event.tourDetails?.includes?.length && <ul className="mt-3 grid gap-2 sm:grid-cols-2">{event.tourDetails.includes.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-6 text-muted-foreground"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul>}
      </div></div>}
    </section>}
    <section aria-label="Llegada y hospedaje" className="overflow-hidden rounded-3xl border border-border bg-card text-foreground">
      <header className="px-5 pb-5 pt-6 sm:px-7 sm:pt-7"><p className="mb-2 text-xs font-semibold tracking-wide text-primary">Tu plan, bien organizado</p><h2 className="text-2xl font-semibold tracking-tight">Llega fácil. Quédate cerca.</h2><p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">Transporte para llegar y opciones para quedarte con tu coro.</p></header>
      <div className="mx-5 flex items-start gap-3 rounded-2xl bg-muted/60 p-4 sm:mx-7"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{plan.reserved ? 'Ubicación reservada' : plan.venue || 'Lugar por confirmar'}</p>{plan.destination && <p className="mt-1 break-words text-sm text-muted-foreground">{plan.destination}</p>}</div>{plan.uber && <button type="button" onClick={copyLocation} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Copiar ubicación"><Copy className="h-4 w-4" /></button>}</div>
      <p role="status" className="px-5 pt-2 text-sm text-muted-foreground">{copyStatus}</p>
      <div className="grid gap-6 px-5 py-5 sm:px-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        <div className="flex flex-col items-start gap-4"><div><Car className="mb-3 h-6 w-6 text-primary" aria-hidden="true" /><h3 className="text-lg font-semibold">Cómo llegar</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.reserved ? 'El transporte estará disponible cuando la ubicación sea pública.' : plan.uber ? 'Consulta el viaje y su precio antes de solicitarlo en Uber.' : 'El organizador todavía debe confirmar el destino.'}</p></div><ProviderLink href={plan.uber} primary>Abrir Uber</ProviderLink></div>
        <div className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><Home className="mb-3 h-6 w-6 text-primary" aria-hidden="true" /><h3 className="text-lg font-semibold">¿Te quedas por la zona?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.destination ? `Busca alojamiento en ${plan.destination}. Airbnb abre una búsqueda para ${plan.guests} personas; puedes ajustar el grupo.` : 'Las opciones se activarán cuando se publique la ciudad.'}</p>
          {plan.stay && <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {([['nightsBefore', 'Llegar antes', [0, 1, 2, 3, 7]], ['nightsAfter', 'Noches al terminar', [1, 2, 3, 7, 14]], ['guests', 'Adultos', [1, 2, 3, 4, 6, 8, 12, 16]]] as const).map(([key, label, values]) => <label key={key} className="text-xs font-medium text-muted-foreground">{label}<select aria-label={label} value={stayOptions[key]} onChange={e => setStayOptions(current => ({ ...current, [key]: Number(e.target.value) }))} className="mt-2 min-h-12 min-w-0 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{values.map(value => <option key={value} value={value}>{key === 'guests' ? value : `${value} ${value === 1 ? 'noche' : 'noches'}`}</option>)}</select></label>)}
          </div>}
          {plan.stay && <p className="mt-3 text-xs leading-5 text-muted-foreground">Fechas sugeridas: <span className="font-medium tabular-nums">{plan.stay}</span>. Comprueba las fechas al abrir cada servicio.</p>}
          <div className="mt-4 flex flex-wrap gap-2"><ProviderLink href={plan.airbnb}>Airbnb · {plan.guests} personas</ProviderLink><ProviderLink href={plan.booking}>Booking.com</ProviderLink><ProviderLink href={plan.trivago}><Building2 className="h-4 w-4" aria-hidden="true" />Trivago</ProviderLink></div>
        </div>
      </div>
      {onOpenSerrucho && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7"><div className="flex items-start gap-3"><Users className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-sm font-semibold">Los gastos, entre todos</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Calcula cuánto aporta cada persona al plan.</p></div></div><button type="button" onClick={onOpenSerrucho} className={secondary}>Dividir Serrucho</button></div>}
      <p className="bg-muted/40 px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-7">Los enlaces abren servicios externos. Revisa allí las fechas, disponibilidad y tarifas.</p>
    </section>
  </div>
}
