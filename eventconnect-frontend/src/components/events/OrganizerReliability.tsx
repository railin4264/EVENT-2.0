'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'

interface Reliability {
  scheduled: number; cancelled: number; markedCompleted: number; withCheckIns: number
  cancellationRate: number | null; reviews: { count: number; average: number | null }; methodology: string
}
const errorText = (error: unknown) => {
  const value = error as { response?: { data?: { message?: string } } }
  return value.response?.data?.message || 'No pudimos completar la solicitud. Inténtalo otra vez.'
}

type Props = { organizerId: string; eventId?: string; isPublic?: boolean }
export default function OrganizerReliability(props: Props) {
  const user = useAuthStore(state => state.user)
  return <ReliabilityContent key={`${user?._id || user?.id || 'guest'}:${props.eventId || ''}`} {...props} />
}

function ReliabilityContent({ organizerId, eventId, isPublic = false }: Props) {
  const { user } = useAuthStore()
  const ownerId = user?._id || user?.id || ''
  const cache = useQueryClient()
  const account = useRef(ownerId); account.current = ownerId
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const lock = useRef(false)
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const draftEdited = useRef(false), initialized = useRef(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const reliability = useQuery({ queryKey: ['organizer-reliability', organizerId], enabled: isPublic && Boolean(organizerId), queryFn: async () => {
    const response = await apiClient.get<{ success: boolean; data: Reliability }>(`/organizer-reputation/${organizerId}`)
    if (response.data.success !== true) throw new Error('Respuesta no válida')
    return response.data.data
  }, retry: false })
  const own = useQuery({ queryKey: ['event-review', eventId, ownerId], enabled: isPublic && Boolean(eventId && ownerId), queryFn: async () => {
    const response = await apiClient.get<{ success: boolean; data: { eligible: boolean; review: { rating: number; comment: string } | null; reason: string | null } }>(`/organizer-reputation/events/${eventId}/review`)
    if (response.data.success !== true) throw new Error('Respuesta no válida')
    return response.data.data
  }, retry: false })
  useEffect(() => {
    if (initialized.current || !own.data) return
    initialized.current = true
    if (!draftEdited.current && own.data.review) {
      setRating(own.data.review.rating)
      setComment(own.data.review.comment)
    }
  }, [own.data])
  if (!isPublic) return null
  const data = reliability.data
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (lock.current || !eventId || !ownerId || !own.data?.eligible || rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5) return
    lock.current = true; setBusy(true); setMessage('')
    const actor = ownerId
    try {
      const response = await apiClient.put<{ success: boolean }>(`/organizer-reputation/events/${eventId}/review`, { rating, comment })
      if (!response.data.success) throw new Error('Respuesta no válida')
      if (!mounted.current || account.current !== actor) return
      setMessage('Opinión guardada. Puedes actualizarla; cuenta una sola vez por evento.')
      await Promise.all([cache.invalidateQueries({ queryKey: ['event-review', eventId, actor] }), cache.invalidateQueries({ queryKey: ['organizer-reliability', organizerId] })])
    } catch (error) { if (mounted.current && account.current === actor) setMessage(errorText(error)) }
    finally { lock.current = false; if (mounted.current && account.current === actor) setBusy(false) }
  }
  return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4" aria-label="Historial del anfitrión">
    <div><p className="text-xs uppercase tracking-widest text-purple-300">Confianza con datos</p><h2 className="text-lg font-semibold text-white">Historial del anfitrión</h2><p className="text-sm text-slate-400">Eventos públicos · últimos 365 días</p></div>
    {reliability.isLoading && <p role="status">Consultando historial…</p>}
    {reliability.isError && <div><p className="text-sm text-slate-400">Historial no disponible.</p><button type="button" onClick={() => reliability.refetch()} className="text-sm text-purple-300 underline">Reintentar</button></div>}
    {data && <><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-400">Eventos con entradas registradas</dt><dd className="text-xl font-semibold text-white">{data.withCheckIns}</dd></div><div><dt className="text-slate-400">Marcados finalizados</dt><dd className="text-xl font-semibold text-white">{data.markedCompleted}</dd></div><div><dt className="text-slate-400">Cancelaciones</dt><dd className="text-white">{data.cancelled} de {data.scheduled}{data.cancellationRate !== null ? ` (${data.cancellationRate}%)` : ''}</dd></div><div><dt className="text-slate-400">Opiniones con entrada registrada</dt><dd className="text-white">{data.reviews.average === null ? 'Aún no hay opiniones' : `${data.reviews.average}/5 · ${data.reviews.count} opiniones`}</dd></div></dl><details className="text-xs text-slate-400"><summary className="cursor-pointer">Cómo se calcula</summary><p className="mt-2">{data.methodology}</p></details></>}
    {ownerId && eventId && own.isError && <button type="button" onClick={() => own.refetch()} className="text-sm text-purple-300 underline">Reintentar verificar mi entrada</button>}
    {ownerId && own.data && !own.data.eligible && <p className="text-xs text-slate-400">{own.data.reason}</p>}
    {ownerId && own.data?.eligible && <form key={ownerId} onSubmit={save} className="space-y-3 border-t border-white/10 pt-4">
      <h3 className="font-medium text-white">{own.data.review ? 'Actualizar mi opinión' : '¿Cómo estuvo el evento?'}</h3>
      {own.data.review && <p className="text-sm text-slate-400">Tu valoración actual: {own.data.review.rating}/5. Se reemplazará al guardar.</p>}
      <label className="block text-sm text-slate-300">Valoración<select aria-label="Valoración" value={rating ?? ''} onChange={event => { draftEdited.current = true; setRating(event.target.value ? Number(event.target.value) : null) }} className="ml-3 rounded-lg border border-white/20 bg-slate-900 p-2"><option value="">Elige tu valoración</option>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} de 5</option>)}</select></label>
      <label className="block text-sm text-slate-300">Comentario opcional<textarea value={comment} onChange={event => { draftEdited.current = true; setComment(event.target.value) }} maxLength={600} rows={3} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3" placeholder="Cuenta tu experiencia sin incluir datos personales." /></label>
      <p className="text-xs text-slate-400">Tu identidad no se muestra en este resumen. Tu puntuación entra en el promedio público; el comentario no se publica aquí.</p>
      <button disabled={busy || rating === null} type="submit" className="rounded-xl bg-purple-600 px-4 py-2 font-medium text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar opinión'}</button>
    </form>}
    {message && <p role="status" className="text-sm text-slate-300">{message}</p>}
  </section>
}
