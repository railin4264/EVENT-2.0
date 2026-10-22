'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, ArrowRight } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'

export interface FriendPlanDraft {
  title: string; description: string; category: string; date?: string | null
  localDate?: string | null; localTime?: string | null; timeZone?: string | null
  venue?: string | null; isPrivate?: boolean; estimatedBudget?: string | null
}

export default function FriendPlanDraftCard({ onApplyDraft }: { onApplyDraft: (draft: FriendPlanDraft) => void }) {
  const owner = useAuthStore(state => state.user?.id || state.user?._id || '')
  const sequence = useRef(0)
  const [text, setText] = useState(''), [draft, setDraft] = useState<FriendPlanDraft | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [reviewed, setReviewed] = useState(false)
  const [isPrivate, setIsPrivate] = useState(true)
  useEffect(() => { sequence.current++; setDraft(null); setReviewed(false); setBusy(false); setError(''); return () => { sequence.current++ } }, [owner])
  const extract = async () => {
    if (!text.trim() || busy) return
    const request = ++sequence.current; setBusy(true); setError(''); setDraft(null); setReviewed(false)
    try {
      const response = await apiClient.post('/sources/friend-draft', { text: text.trim() })
      if (request !== sequence.current) return
      if (!response.data?.success || !response.data.draft) throw new Error('No se pudo preparar el borrador')
      setDraft(response.data.draft); setIsPrivate(true)
    } catch { if (request === sequence.current) setError('No se pudo preparar el borrador. Conservamos tu texto; vuelve a intentarlo.') }
    finally { if (request === sequence.current) setBusy(false) }
  }
  return <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="Borrador desde un texto">
    <div className="flex items-start gap-3"><FileText aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" /><div>
      <h3 className="font-semibold text-foreground">Tu anuncio, listo para revisar</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Pega el texto de tu plan. Recuperamos datos escritos explícitamente; tú completas fecha, zona horaria, ubicación y precio que falten.</p>
    </div></div>
    <label className="mt-4 block text-sm font-medium" htmlFor="friend-plan-text">Texto del anuncio</label>
    <textarea id="friend-plan-text" rows={4} maxLength={10000} value={text} onChange={event => { sequence.current++; setText(event.target.value); setDraft(null); setReviewed(false); setBusy(false); setError('') }} placeholder={'Club de lectura\n28 de noviembre de 2026 a las 15:00\nLugar: Parque Ueno, Tokio\nZona horaria: Asia/Tokyo\nPrecio: por confirmar'} className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    <button type="button" onClick={() => void extract()} disabled={busy || !text.trim()} className="mt-3 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Preparando…' : 'Preparar borrador'}</button>
    {draft && <div className="mt-5 space-y-4 border-t border-border pt-5">
      <h4 className="font-semibold">Revisa antes de aplicar</h4>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{[
        ['Título', draft.title], ['Categoría sugerida', draft.category], ['Fecha escrita', draft.localDate],
        ['Hora escrita', draft.localTime], ['Zona horaria', draft.timeZone], ['Lugar escrito', draft.venue], ['Precio escrito', draft.estimatedBudget]
      ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value || 'Por confirmar'}</dd></div>)}</dl>
      <fieldset><legend className="text-sm font-medium">Visibilidad del evento</legend><div className="mt-2 flex flex-wrap gap-3">
        {[{ value: true, label: 'Privado' }, { value: false, label: 'Público · sujeto a revisión' }].map(option => <label key={option.label} className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="radio" name="friend-plan-visibility" checked={isPrivate === option.value} onChange={() => setIsPrivate(option.value)} />{option.label}</label>)}
      </div></fieldset>
      <p className="text-sm text-muted-foreground">El borrador no confirma coordenadas, gratuidad ni acceso de amigos. Revisa esos campos en el formulario. No se publica al aplicarlo.</p>
      <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />Revisé los datos detectados y completaré lo que falta.</label>
      <button type="button" disabled={!reviewed} onClick={() => { if (reviewed) { onApplyDraft({ ...draft, isPrivate }); setDraft(null); setReviewed(false) } }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Usar campos revisados <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
    </div>}
  </section>
}
