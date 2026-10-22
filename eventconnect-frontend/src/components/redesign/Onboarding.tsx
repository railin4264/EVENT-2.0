'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, Check, Loader2, MapPin, Search, ShieldCheck } from 'lucide-react'
import { CATEGORY_LIST } from '@/lib/categories'
import { initialInterests, loadOnboardingSettings, saveOnboardingSettings, choicesFromSettings,
  MAX_ONBOARDING_INTERESTS, type OnboardingChoices } from '@/lib/auth/onboarding'
import { usersService } from '@/lib/api/services/users.service'
import { useAuthStore } from '@/stores/authStore'

interface OnboardingProps {
  user: { id?: string; _id?: string; firstName?: string; name?: string; username?: string; interests?: string[] }
  onComplete: () => void
  onSkip?: () => void
}

const identity = (user?: { id?: string; _id?: string } | null) => String(user?._id || user?.id || '')

export function Onboarding({ user, onComplete, onSkip = onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [search, setSearch] = useState('')
  const [interests, setInterests] = useState(() => initialInterests(user?.interests))
  const [choices, setChoices] = useState<OnboardingChoices>({ email: false, push: false, showLocation: false })
  const [settingsReady, setSettingsReady] = useState(false)
  const [modifiedChoices, setModifiedChoices] = useState<Partial<OnboardingChoices>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const requestVersion = useRef(0)
  const busy = useRef(false)
  const mounted = useRef(false)

  const loadSettings = async () => {
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const settings = await loadOnboardingSettings()
      if (version !== requestVersion.current) return
      setChoices(choicesFromSettings(settings))
      setSettingsReady(true)
    } catch {
      if (version === requestVersion.current) setError('No pudimos cargar tus ajustes. Reintenta o continúa sin personalizar.')
    } finally { if (version === requestVersion.current) setLoading(false) }
  }

  useEffect(() => {
    mounted.current = true
    void loadSettings()
    return () => { mounted.current = false; requestVersion.current += 1 }
  }, [])
  useEffect(() => { heading.current?.focus() }, [step])

  const toggleInterest = (slug: string) => {
    setSelectionError('')
    if (interests.includes(slug)) setInterests(previous => previous.filter(value => value !== slug))
    else if (interests.length >= MAX_ONBOARDING_INTERESTS) setSelectionError(`Puedes elegir hasta ${MAX_ONBOARDING_INTERESTS} intereses. Quita uno para añadir otro.`)
    else setInterests(previous => [...previous, slug])
  }

  const finish = async () => {
    const ownerId = identity(user)
    const stillCurrent = () => {
      const current = useAuthStore.getState()
      return mounted.current && Boolean(ownerId) && current.isAuthenticated && identity(current.user) === ownerId
    }
    if (busy.current || !stillCurrent()) return
    if (interests.length > MAX_ONBOARDING_INTERESTS) {
      setSelectionError(`Tienes más de ${MAX_ONBOARDING_INTERESTS} intereses. Quita algunos para guardar.`)
      setStep(0)
      return
    }
    busy.current = true
    setSaving(true)
    setError('')
    let interestsSaved = false
    try {
      await usersService.updateProfile({ interests })
      if (!stillCurrent()) return
      interestsSaved = true
      useAuthStore.setState(state => mounted.current && state.isAuthenticated && identity(state.user) === ownerId ? { user: { ...state.user, interests } } : {})
      if (Object.keys(modifiedChoices).length) {
        if (!stillCurrent()) return
        const settings = await saveOnboardingSettings(modifiedChoices)
        if (!stillCurrent()) return
        useAuthStore.setState(state => mounted.current && state.isAuthenticated && identity(state.user) === ownerId ? { user: { ...state.user, settings: { ...state.user.settings, ...settings } } } : {})
      }
      if (stillCurrent()) onComplete()
    } catch {
      if (stillCurrent()) setError(interestsSaved ? 'Tus intereses se guardaron, pero faltan los ajustes. Puedes reintentar sin perder tu selección.' : 'No pudimos guardar tus intereses. Tu selección sigue aquí; inténtalo de nuevo.')
    } finally {
      busy.current = false
      if (stillCurrent()) setSaving(false)
    }
  }

  const name = user?.firstName || user?.name || user?.username
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const query = normalize(search.trim())
  const visibleCategories = CATEGORY_LIST.filter(category => normalize([category.label, category.slug, ...category.examples].join(' ')).includes(query))
  return (
    <section aria-label="Personalización de tu cuenta" className="min-h-screen bg-background px-5 pb-32 pt-8 text-foreground sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight">EventNow<span className="text-primary">.</span></span>
          <button type="button" onClick={onSkip} disabled={saving} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">Omitir sin guardar</button>
        </div>
        <div className="mb-8 flex gap-2" aria-label={`Personalización: paso ${step + 1} de 2`}>
          {[0, 1].map(index => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`} />)}
        </div>
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Personalización opcional · {step + 1} de 2</p>
          <h1 ref={heading} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none sm:text-4xl">{step === 0 ? `Encuentra lo que te mueve${name ? `, ${name}` : ''}.` : 'Tu selección, a tu manera.'}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{step === 0 ? 'Elige lo que te interesa para orientar tus recomendaciones. Puedes no elegir nada y cambiarlo después.' : 'Revisa tus intereses antes de guardar. Puedes volver atrás o continuar sin personalizar.'}</p>

          {step === 0 ? <div className="mt-7">
            <label htmlFor="interest-search" className="mb-2 block text-sm font-medium">Buscar intereses</label>
            <div className="relative mb-3"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><input id="interest-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Música, senderismo, ciencia…" className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>
            <div role="group" aria-label="Categorías de intereses" tabIndex={0} className="max-h-[45dvh] overflow-y-auto overscroll-contain rounded-xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleCategories.map(category => {
                const selected = interests.includes(category.slug)
                return <button key={category.slug} type="button" aria-pressed={selected} onClick={() => toggleInterest(category.slug)} className={`flex min-h-16 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:border-primary/40 hover:bg-muted'}`}>
                  <span className="text-xl" aria-hidden="true">{category.emoji}</span><span className="flex-1 leading-snug">{category.label}</span>{selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              })}
            </div>
            {!visibleCategories.length && <p role="status" className="p-4 text-sm text-muted-foreground">No encontramos ese interés. Prueba otra palabra o explora todas las categorías.</p>}
            </div>
            {interests.filter(slug => !CATEGORY_LIST.some(category => category.slug === slug)).map(slug => <button key={slug} type="button" aria-pressed="true" onClick={() => toggleInterest(slug)} className="mr-2 mt-3 rounded-xl border border-primary bg-primary/10 px-3 py-2 text-sm">{slug} · Quitar</button>)}
            <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">{interests.length} de {MAX_ONBOARDING_INTERESTS} intereses seleccionados</p>
            {selectionError && <p role="alert" className="mt-2 text-sm text-red-500">{selectionError}</p>}
          </div> : <div className="mt-7 space-y-4">
            <div className="rounded-2xl bg-muted/50 p-4"><p className="mb-3 text-sm font-semibold">{interests.length ? `${interests.length} intereses elegidos` : 'Explorar sin intereses elegidos'}</p><div className="flex flex-wrap gap-2">{interests.map(slug => <span key={slug} className="rounded-full border border-border bg-background px-3 py-1 text-xs">{CATEGORY_LIST.find(category => category.slug === slug)?.label || slug}</span>)}</div></div>
            <details className="rounded-2xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">Privacidad y avisos (opcional)</summary>
            {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Leyendo tus ajustes actuales…</p>}
            <fieldset disabled={!settingsReady || saving} className="mt-4 space-y-3 disabled:opacity-60">
              {[
                { key: 'showLocation' as const, title: 'Compartir mi ubicación guardada', description: 'Muestra la dirección de tu perfil. No activa el GPS ni obtiene tu ubicación.', icon: MapPin },
                { key: 'email' as const, title: 'Recibir avisos por correo', description: 'Puedes cambiar esta preferencia en cualquier momento desde Ajustes.', icon: Bell },
                { key: 'push' as const, title: 'Permitir avisos de la app', description: 'El permiso del navegador se gestiona por separado en Ajustes. No se solicita ahora.', icon: ShieldCheck },
              ].map(option => <label key={option.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
                <option.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-semibold">{option.title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span></span>
                <input type="checkbox" checked={choices[option.key]} onChange={event => {
                  const checked = event.target.checked
                  setChoices(previous => ({ ...previous, [option.key]: checked }))
                  setModifiedChoices(previous => ({ ...previous, [option.key]: checked }))
                }} className="mt-1 h-4 w-4 accent-primary" />
              </label>)}
            </fieldset>
            </details>
          </div>}

          {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm"><p>{error}</p>{!settingsReady && <button type="button" onClick={() => void loadSettings()} disabled={loading} className="mt-2 font-semibold text-primary underline disabled:opacity-50">Reintentar carga</button>}</div>}
          <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-3 border-t border-border bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] sm:static sm:mt-8 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-6 sm:shadow-none">
            {step === 1 && <button type="button" disabled={saving} onClick={() => setStep(0)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Atrás</button>}
            <button type="button" disabled={saving} onClick={() => step === 0 ? setStep(1) : void finish()} className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-50">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</> : step === 0 ? <>Siguiente<ArrowRight className="h-4 w-4" /></> : <>Guardar y continuar<ArrowRight className="h-4 w-4" /></>}</button>
          </div>
        </section>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">Tu cuenta ya está creada. Personalizarla es opcional y puedes volver desde Ajustes.</p>
      </div>
    </section>
  )
}
