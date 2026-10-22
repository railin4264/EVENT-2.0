'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { EventPlanB } from './EventPlanB'
export type BudgetRow = { label: string; amount: number; currency: string }
export type Planning = { eventId: string; canManage: boolean; practical: Record<string, string>; budget: { currency: string; entry: number | null; mandatory: BudgetRow[]; optional: BudgetRow[]; complete: boolean; knownMinimum: number | null }; alternativesAvailable: boolean }
export const practicalLabels: Record<string, string> = { arrival: 'Cómo llegar', bring: 'Qué llevar', accessibility: 'Accesibilidad', parking: 'Estacionamiento', welcoming: 'Quién te recibe' }
export function planningMoney(value: number, currency: string) { try { return new Intl.NumberFormat('es-DO', { style: 'currency', currency, currencyDisplay: 'code' }).format(value) } catch { return `${value.toFixed(2)} ${currency}` } }
export function EventPracticalInfo({ eventId }: { eventId: string }) {
  const user = useAuthStore(s => s.user)
  const identity = user?.id || user?._id || 'guest'
  const [data, setData] = useState<Planning | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => { let live = true; setData(null); setError(false); apiClient.get(`/event-planning/${eventId}`).then(res => { if (!res.data.success || !res.data.data) throw new Error(); if (live) setData(res.data.data) }).catch(() => { if (live) setError(true) }); return () => { live = false } }, [eventId, identity, retry])
  if (error) return <section className="rounded-3xl border border-white/10 p-6"><p>No pudimos cargar la información práctica.</p><button type="button" onClick={() => setRetry(x => x + 1)} className="mt-3 underline">Reintentar</button></section>
  if (!data) return <p role="status" className="p-6 text-sm text-slate-400">Cargando información para tu salida…</p>
  const budget = data.budget
  return <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-300">Ve con todo claro</p><h2 className="mt-2 text-xl font-semibold">¿Tu primera vez aquí?</h2></div>{data.canManage && <Link href={`/events/${eventId}/planning`} className="rounded-full border border-white/20 px-4 py-2 text-sm">Editar información</Link>}</div>
    <dl className="grid gap-5 sm:grid-cols-2">{Object.entries(practicalLabels).map(([key, label]) => <div key={key}><dt className="text-sm font-medium text-slate-200">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-400">{data.practical[key] || 'El anfitrión aún no ha informado este detalle.'}</dd></div>)}</dl>
    <div className="border-t border-white/10 pt-5"><h3 className="font-semibold">Presupuesto de la salida</h3><p className="mt-1 text-xs text-slate-400">Montos por persona informados por el anfitrión. No incluye gastos que no haya declarado.</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt>Entrada</dt><dd>{budget.entry === null ? 'Por informar' : planningMoney(budget.entry, budget.currency)}</dd></div>{budget.mandatory.map((row, i) => <div className="flex justify-between gap-3" key={i}><dt>{row.label} · obligatorio</dt><dd>{planningMoney(row.amount, budget.currency)}</dd></div>)}</dl><p className="mt-4 font-medium">{budget.complete ? 'Total informado' : 'Mínimo conocido'}: {budget.knownMinimum === null ? 'Por informar' : planningMoney(budget.knownMinimum, budget.currency)}</p>{!budget.complete && <p className="mt-1 text-sm text-amber-200">Hay gastos pendientes de confirmar. Consulta al anfitrión antes de decidir.</p>}{budget.optional.length > 0 && <div className="mt-4"><p className="text-sm text-slate-400">Opcionales, fuera del total</p>{budget.optional.map((row, i) => <p className="mt-1 flex justify-between gap-3 text-sm" key={i}><span>{row.label}</span><span>{planningMoney(row.amount, budget.currency)}</span></p>)}</div>}</div>
    {data.alternativesAvailable && <EventPlanB eventId={eventId} />}
  </section>
}
