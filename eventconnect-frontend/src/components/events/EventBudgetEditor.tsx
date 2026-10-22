'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { BudgetRow, Planning, practicalLabels } from './EventPracticalInfo'
type DraftRow = { label: string; amount: string }
export function EventBudgetEditor({ eventId }: { eventId: string }) {
  const user = useAuthStore(s => s.user)
  const identity = user?.id || user?._id || 'guest'
  return <Editor key={`${eventId}:${identity}`} eventId={eventId} identity={identity} />
}
function Editor({ eventId, identity }: { eventId: string; identity: string }) {
  const [data, setData] = useState<Planning | null>(null)
  const [practical, setPractical] = useState<Record<string, string>>({})
  const [mandatory, setMandatory] = useState<DraftRow[]>([])
  const [optional, setOptional] = useState<DraftRow[]>([])
  const [complete, setComplete] = useState(false)
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    let live = true
    if (identity === 'guest') return
    setMessage(''); setData(null)
    apiClient.get(`/event-planning/${eventId}`).then(res => { if (!res.data.success || !res.data.data) throw new Error(); if (!live) return; const result: Planning = res.data.data; setData(result); setPractical(result.practical); setComplete(result.budget.complete); const draft = (rows: BudgetRow[]) => rows.map(row => ({ label: row.label, amount: String(row.amount) })); setMandatory(draft(result.budget.mandatory)); setOptional(draft(result.budget.optional)) }).catch(() => { if (live) setMessage('No pudimos cargar el evento. Comprueba que tienes acceso.') })
    return () => { live = false }
  }, [eventId, identity, retry])
  if (identity === 'guest') return <p>Inicia sesión para editar. <Link className="underline" href={`/login?redirect=${encodeURIComponent(`/events/${eventId}/planning`)}`}>Entrar</Link></p>
  if (!data) return <div><p role="status">{message || 'Cargando información…'}</p>{message && <button type="button" onClick={() => setRetry(x => x + 1)} className="mt-3 underline">Reintentar</button>}</div>
  if (!data.canManage) return <p>Sólo el anfitrión y administración pueden editar esta información.</p>
  const rows = (kind: 'mandatory' | 'optional', values: DraftRow[], set: (rows: DraftRow[]) => void) => <fieldset className="space-y-3"><legend className="mb-3 font-medium">{kind === 'mandatory' ? 'Gastos obligatorios adicionales' : 'Gastos opcionales'}</legend>{values.map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"><input aria-label={`Concepto ${kind} ${index + 1}`} required maxLength={100} value={row.label} onChange={e => set(values.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className="rounded-lg border border-white/20 bg-slate-900 p-3" /><input aria-label={`Monto ${kind} ${index + 1}`} required type="number" min="0" max="1000000" step="0.01" value={row.amount} onChange={e => set(values.map((item, i) => i === index ? { ...item, amount: e.target.value } : item))} className="rounded-lg border border-white/20 bg-slate-900 p-3" /><button type="button" aria-label={`Eliminar gasto ${kind} ${index + 1}`} onClick={() => set(values.filter((_, i) => i !== index))} className="px-3 text-sm underline">Quitar</button></div>)}<button disabled={values.length >= 12 || busy} type="button" onClick={() => set([...values, { label: '', amount: '' }])} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Añadir gasto · {data.budget.currency}</button></fieldset>
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (lock.current) return
    const parse = (values: DraftRow[]) => values.map(row => { const amount = Number(row.amount); if (!row.amount.trim() || !row.label.trim() || !Number.isFinite(amount) || amount < 0 || amount > 1000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) throw new Error('Revisa los montos: hasta dos decimales y sin valores negativos.'); return { label: row.label.trim(), amount, currency: data.budget.currency } })
    try {
      const budget = { complete, mandatory: parse(mandatory), optional: parse(optional) }
      lock.current = true; setBusy(true); setMessage('')
      const res = await apiClient.put(`/event-planning/${eventId}`, { practical, budget })
      if (!res.data.success) throw new Error('No se guardó. Revisa la información e inténtalo de nuevo.')
      if (mounted.current) setMessage('Información guardada.')
    } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : 'No pudimos guardar.') }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-7"><fieldset disabled={busy} className="space-y-5"><legend className="mb-4 text-xl font-semibold">Información práctica</legend>{Object.entries(practicalLabels).map(([key, label]) => <label key={key} className="block text-sm">{label}<textarea maxLength={500} value={practical[key] || ''} onChange={e => setPractical({ ...practical, [key]: e.target.value })} className="mt-2 block min-h-24 w-full rounded-xl border border-white/20 bg-slate-900 p-3" /></label>)}</fieldset><p className="text-sm text-slate-400">La entrada se obtiene del precio del evento. Añade sólo gastos adicionales por persona. No incluyas cuentas bancarias ni datos personales. Las instrucciones de llegada de ubicaciones secretas sólo se muestran al anfitrión.</p><fieldset disabled={busy} className="space-y-6">{rows('mandatory', mandatory, setMandatory)}{rows('optional', optional, setOptional)}<label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={complete} onChange={e => setComplete(e.target.checked)} />Confirmo que declaré todos los gastos obligatorios conocidos por persona; los opcionales quedan fuera del total.</label></fieldset><p role="status" className="text-sm text-emerald-200">{message}</p><button disabled={busy} className="rounded-full bg-emerald-300 px-6 py-3 font-semibold text-slate-950">{busy ? 'Guardando…' : 'Guardar información'}</button></form>
}
