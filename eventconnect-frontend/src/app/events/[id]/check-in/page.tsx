'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import apiClient from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { CheckInCamera } from '@/components/events/CheckInCamera'
import { Admission, checkInFailure, confirmedAdmission, isAdmissionCode } from '@/components/events/check-in-contract'

export default function CheckInPage() {
  const params = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuthStore()
  const identity = isAuthenticated ? (user?.id || user?._id || '') : ''
  const scope = `${params.id}:${identity}:${user?.role || ''}`
  const [access, setAccess] = useState<{ scope: string; allowed: boolean; title: string; error?: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [admission, setAdmission] = useState<Admission | null>(null)
  const lock = useRef(false)
  const current = useRef(scope)
  current.current = scope
  const audio = useRef<AudioContext | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const permitted = access?.scope === scope && access.allowed && !!identity

  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    setAccess(null); setCode(''); setError(''); setAdmission(null); setBusy(false); lock.current = false
    if (identity) {
      void apiClient.get(`/events/${params.id}`, { signal: controller.signal }).then(response => {
        if (!alive) return
        const event = response.data?.event
        const owner = typeof event?.createdBy === 'string' ? event.createdBy : event?.createdBy?._id || event?.createdBy?.id
        setAccess({ scope, allowed: !!event && (owner === identity || user?.role === 'admin'), title: event?.title || 'Evento' })
      }).catch(() => { if (alive) setAccess({ scope, allowed: false, title: '', error: 'No pudimos comprobar tus permisos. Inténtalo de nuevo.' }) })
    }
    return () => { alive = false; controller.abort(); void audio.current?.close().catch(() => {}); audio.current = null }
  }, [scope, identity, params.id, user?.role, attempt])

  function prepareSound() {
    try { audio.current ??= new AudioContext(); void audio.current.resume().catch(() => {}) } catch { /* Sound is optional. */ }
  }

  function feedback() {
    try {
      const context = audio.current
      if (context?.state === 'running') {
        const tone = context.createOscillator(); const volume = context.createGain()
        tone.frequency.value = 880; volume.gain.value = 0.12
        tone.connect(volume); volume.connect(context.destination); tone.start(); tone.stop(context.currentTime + 0.14)
        tone.onended = () => { tone.disconnect(); volume.disconnect() }
      }
      navigator.vibrate?.(100)
    } catch { /* Optional feedback cannot alter the registration result. */ }
  }

  async function validate(value: string) {
    if (!permitted || lock.current) return
    setAdmission(null); setError('')
    if (!isAdmissionCode(value)) { setError('El código no tiene el formato de una entrada EventNow (EC).'); return }
    if (!navigator.onLine) { setError(checkInFailure(null, false)); return }
    const ownerScope = scope
    const session = useAuthStore.getState()
    if (!session.isAuthenticated || (session.user?.id || session.user?._id) !== identity) return
    lock.current = true; setBusy(true)
    try {
      const response = await apiClient.post('/tickets/validate-qr', { eventId: params.id, qrCode: value.trim() })
      const active = useAuthStore.getState()
      if (!mounted.current || current.current !== ownerScope || !active.isAuthenticated || (active.user?.id || active.user?._id) !== identity) return
      const result = confirmedAdmission(response.data)
      if (!result) { setError('El servidor no confirmó esta entrada. No permitas el acceso hasta verificarla.'); return }
      setAdmission(result); setCode(''); feedback()
    } catch (failure) {
      if (mounted.current && current.current === ownerScope) setError(checkInFailure(failure, navigator.onLine))
    } finally {
      if (mounted.current && current.current === ownerScope) { lock.current = false; setBusy(false) }
    }
  }

  function checkIn(event: FormEvent) { event.preventDefault(); prepareSound(); void validate(code) }

  return <section className="mx-auto max-w-xl px-5 py-12 text-foreground">
    <Link href={`/events/${params.id}`} className="text-sm text-primary hover:underline">← Volver al evento</Link>
    <h1 className="mt-6 text-3xl font-bold">Control de entradas</h1>
    {!identity ? <div className="mt-6 rounded-xl border border-border p-5"><p>Inicia sesión como organizador para registrar entradas.</p><Link className="mt-3 inline-block text-primary underline" href={`/login?redirect=${encodeURIComponent(`/events/${params.id}/check-in`)}`}>Iniciar sesión</Link></div>
      : access?.scope !== scope ? <p role="status" className="mt-6">Comprobando permisos…</p>
        : access.error ? <div className="mt-6"><p role="alert">{access.error}</p><button className="mt-3 text-primary underline" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>
          : !permitted ? <p role="alert" className="mt-6">Solo el organizador de este evento o un administrador puede registrar entradas.</p>
            : <>
              <p className="mt-3 font-medium">{access.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">Cada código admite al grupo completo una sola vez. La confirmación verde aparece únicamente después del registro en el servidor.</p>
              <CheckInCamera key={scope} disabled={busy} onCode={value => { setCode(value); void validate(value) }} onStart={() => { setAdmission(null); setError(''); prepareSound() }} />
              <form onSubmit={checkIn} className="mt-7 space-y-4">
                <label htmlFor="admission-code" className="block font-medium">O pega el código de la entrada</label>
                <textarea id="admission-code" value={code} disabled={busy} onChange={event => { setCode(event.target.value); setAdmission(null); setError('') }} rows={3} required maxLength={200} spellCheck={false} autoComplete="off" placeholder="EC:…" className="w-full rounded-xl border border-border bg-background p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button type="submit" disabled={busy || !code.trim()} className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Comprobando…' : 'Validar y registrar entrada'}</button>
              </form>
              {error && <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
              {admission && <div role="status" className="mt-5 rounded-xl border border-green-300 bg-green-50 p-5 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200"><p className="font-semibold">Entrada registrada · {admission.quantity} {admission.quantity === 1 ? 'persona' : 'personas'}</p><p className="mt-1 text-sm">Pedido {admission.orderNumber}. Ya puedes recibir al siguiente grupo.</p></div>}
            </>}
  </section>
}
