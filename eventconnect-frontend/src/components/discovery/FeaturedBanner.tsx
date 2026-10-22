'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Lock, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { discoveryApi, type DiscoveryEvent, type DiscoveryGeo } from '@/lib/api/discovery'
import { categoryMeta } from '@/lib/categories'
import { eventImage, formatEventDate, formatPrice, locationLabel, paymentHint } from '@/lib/event-display'
import { usePublicConfig } from '@/hooks/usePublicConfig'
import { CategoryBadge } from './CategoryBadge'

type Geo = DiscoveryGeo

const SLIDE_MS = 6500

/** Banner principal: eventos destacados + tendencias. No renderiza nada si no hay datos. */
export function FeaturedBanner({ geo }: { geo?: Geo }) {
  const config = usePublicConfig()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['featured', geo?.lat, geo?.lng, geo?.radiusKm, geo?.radius, geo?.countryCode, geo?.city],
    queryFn: () => discoveryApi.getFeatured(geo, 6),
    staleTime: 60_000,
    retry: false
  })
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useRef(false)

  useEffect(() => {
    reduceMotion.current = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }, [])

  const count = events.length
  const go = useCallback((next: number) => setIndex(count ? (next + count) % count : 0), [count])

  useEffect(() => {
    if (count < 2 || paused || reduceMotion.current) return
    const id = window.setTimeout(() => go(index + 1), SLIDE_MS)
    return () => window.clearTimeout(id)
  }, [count, paused, index, go])

  useEffect(() => { if (index >= count) setIndex(0) }, [count, index])

  if (isLoading) {
    return <div className="mx-auto max-w-[1440px] px-5 sm:px-8"><div className="h-72 animate-pulse rounded-3xl bg-muted sm:h-96" aria-hidden="true" /></div>
  }
  if (!count) return null

  // Refetches may return fewer slides before the effect resets the old index.
  const activeIndex = index < count ? index : 0
  const current: DiscoveryEvent = events[activeIndex]
  const meta = categoryMeta(current.category)
  const image = eventImage(current)
  const hint = paymentHint(current, config.paymentsEnabled)

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Planes destacados y en tendencia"
      className="mx-auto max-w-[1440px] px-5 pb-8 sm:px-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div
          className="relative isolate min-h-[320px] overflow-hidden rounded-3xl text-white shadow-xl sm:min-h-[400px]"
          style={{ background: `linear-gradient(135deg, ${meta.color}, #1e1b4b 85%)` }}
        >
          {image && <img key={current._id} src={image} alt="" aria-hidden="true" loading="eager" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60 transition-opacity duration-700" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          <div className="flex h-full min-h-[320px] flex-col justify-between p-6 sm:min-h-[400px] sm:p-9" aria-live={paused ? 'polite' : 'off'}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-900">
                {current.badge === 'featured' ? <><Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />Destacado</> : current.badge === 'trending' ? <><span aria-hidden="true">🔥</span>En tendencia</> : <><Calendar className="h-3.5 w-3.5" aria-hidden="true" />Próximamente</>}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold backdrop-blur">
                <span aria-hidden="true">{meta.emoji}</span>{current.activityType || meta.label}
              </span>
              {current.isOrganizerVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur px-3 py-1 text-xs font-bold text-white shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Verificado
                </span>
              )}
              {current.isUnofficial && <span className="rounded-full bg-fuchsia-600/90 px-3 py-1 text-xs font-bold">🤫 Extraoficial</span>}
            </div>

            <div>
              <p className="max-w-2xl text-3xl font-bold leading-tight tracking-tight drop-shadow sm:text-5xl">{current.title}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/90">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />{formatEventDate(current.date, current.timeZone)}</span>
                <span className="inline-flex items-center gap-1.5">{current.isSecretLocation ? <Lock className="h-4 w-4" aria-hidden="true" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}{locationLabel(current)}</span>
                <span className="rounded-full bg-white/15 px-3 py-0.5 font-semibold">{formatPrice(current)}</span>
              </div>
              {hint && <p className="mt-2 text-xs text-white/75">{hint}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href={`/events/${current._id}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-900 shadow-lg transition hover:scale-[1.02]">
                  Descubrir plan <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                {count > 1 && (
                  <div className="ml-auto flex items-center gap-2">
                    <button type="button" onClick={() => go(index - 1)} aria-label="Plan anterior" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30"><ChevronLeft className="h-5 w-5" /></button>
                    <button type="button" onClick={() => go(index + 1)} aria-label="Siguiente plan" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30"><ChevronRight className="h-5 w-5" /></button>
                  </div>
                )}
              </div>
              {count > 1 && (
                <div className="mt-5 flex gap-1.5" role="tablist" aria-label="Elegir plan">
                  {events.map((e, i) => (
                    <button key={e._id} type="button" role="tab" aria-selected={i === activeIndex} aria-label={`Plan ${i + 1}: ${e.title}`} onClick={() => go(i)} className="flex h-11 min-w-11 items-center justify-center bg-transparent">
                      <span aria-hidden="true" className={`block h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ol className="hidden gap-3 lg:grid" aria-label="Más planes">
          {events.filter((_, i) => i !== index).slice(0, 4).map(e => {
            const realIndex = events.findIndex(x => x._id === e._id)
            return (
              <li key={e._id}>
                <button type="button" onClick={() => go(realIndex)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-primary/50 hover:shadow-md">
                  <CategoryBadge category={e.category} size="lg" showLabel={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{formatEventDate(e.date)}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-primary">{e.badge === 'featured' ? '✨ Destacado' : e.badge === 'trending' ? '🔥 En tendencia' : 'Próximamente'}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
