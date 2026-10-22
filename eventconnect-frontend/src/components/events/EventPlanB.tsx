'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
type Alternative = { id: string; title: string; date: string; city: string; timeZone?: string; budget?: { knownMinimum: number | null; currency: string; complete: boolean } }
export function formatAlternativeDate(date: string, timeZone?: string) {
  try { return new Date(date).toLocaleDateString('es-DO', { timeZone: timeZone || 'UTC' }) }
  catch { return new Date(date).toLocaleDateString('es-DO', { timeZone: 'UTC' }) }
}
export function formatAlternativeBudget(budget?: Alternative['budget']) {
  if (!budget || typeof budget.knownMinimum !== 'number' || !Number.isFinite(budget.knownMinimum) || budget.knownMinimum < 0 || typeof budget.currency !== 'string' || !/^[A-Z]{3}$/.test(budget.currency)) return 'Presupuesto por informar; puede haber gastos pendientes.'
  return `${budget.currency} ${budget.knownMinimum.toFixed(2)} · ${budget.complete === true ? 'total informado' : 'mínimo conocido; puede haber gastos pendientes'}`
}
export function EventPlanB({ eventId }: { eventId: string }) {
  const user = useAuthStore(s => s.user)
  const identity = user?.id || user?._id || 'guest'
  const [items, setItems] = useState<Alternative[]>([])
  const [state, setState] = useState('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => { let live = true; setItems([]); setState('loading'); apiClient.get(`/event-planning/${eventId}/alternatives`).then(res => { if (!res.data.success || !Array.isArray(res.data.data)) throw new Error(); if (live) { setItems(res.data.data); setState('ready') } }).catch(() => { if (live) setState('error') }); return () => { live = false } }, [eventId, identity, retry])
  return <aside className="rounded-2xl border border-amber-200/20 bg-amber-100/5 p-5"><h3 className="font-semibold">El plan cambió. Tú eliges qué sigue.</h3><p className="mt-2 text-sm text-slate-300">Este evento se canceló o cambió de fecha. Estas alternativas no trasladan tu inscripción ni tu pago. Comprueba horarios y condiciones en cada evento.</p>{state === 'loading' ? <p className="mt-3 text-sm" role="status">Buscando opciones…</p> : state === 'error' ? <button type="button" className="mt-3 underline" onClick={() => setRetry(x => x + 1)}>Reintentar alternativas</button> : items.length === 0 ? <p className="mt-3 text-sm text-slate-400">Todavía no hay opciones comparables en la misma ciudad y fechas cercanas.</p> : <ul className="mt-4 space-y-3">{items.map(item => <li key={item.id}><Link className="block rounded-xl border border-white/10 p-3 hover:border-amber-200/40" href={`/events/${item.id}`}><span className="font-medium">{item.title}</span><span className="mt-1 block text-sm text-slate-400">{item.city} · {formatAlternativeDate(item.date, item.timeZone)}</span><span className="mt-1 block text-xs text-slate-400">{formatAlternativeBudget(item.budget)}</span></Link></li>)}</ul>}</aside>
}
