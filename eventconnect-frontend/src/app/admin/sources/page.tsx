'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Globe, Plus, RefreshCw, Search, Play, Eye, Check, Pause } from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'
import { SourceConfigForm, SourceReviewForm } from '@/components/admin/SourceForms'
import ConnectAgendaModal from '@/components/events/ConnectAgendaModal'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { adapterNames, blockerNames, sourceButton, sourceInput, sourceStates, sourceErrorMessage, type EventSource, type IngestionResult } from '@/lib/source-registry'

export default function AdminSourcesPage() {
  const auth = useAuthStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <p role="status" className="p-8">Preparando tu sesión…</p>
  if (!auth.isAuthenticated || auth.user?.role !== 'admin') return <div className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-semibold">Administración de fuentes</h1><p className="my-4 text-muted-foreground">Necesitas una cuenta administradora para revisar estas fuentes.</p><Link href="/login?redirect=%2Fadmin%2Fsources" className={sourceButton}>Iniciar sesión</Link></div>
  return <SourcesWorkspace key={auth.user.id || auth.user._id} />
}

function SourcesWorkspace() {
  const owner = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id
  const alive = useRef(true), readSequence = useRef(0), actionLock = useRef(false)
  const current = useCallback(() => alive.current && owner === (useAuthStore.getState().user?.id || useAuthStore.getState().user?._id), [owner])
  const [sources, setSources] = useState<EventSource[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false), [search, setSearch] = useState(''), [status, setStatus] = useState('all')
  const [panel, setPanel] = useState<{ mode: 'config' | 'review'; source?: EventSource } | null>(null)
  const [agendaOpen, setAgendaOpen] = useState(false), [run, setRun] = useState<IngestionResult | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const load = useCallback(async () => {
    const sequence = ++readSequence.current; setLoading(true)
    try {
      const response = await apiClient.get('/sources', { params: { limit: 100 } })
      if (!current() || sequence !== readSequence.current) return
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error()
      setSources(response.data.data); setError('')
    } catch (err) { if (current() && sequence === readSequence.current) setError(sourceErrorMessage(err, 'No se pudieron cargar las fuentes. Vuelve a intentarlo.')) }
    finally { if (current() && sequence === readSequence.current) setLoading(false) }
  }, [current])
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; readSequence.current++ } }, [load])
  useEffect(() => { if (panel) panelRef.current?.focus() }, [panel])
  const action = async (work: () => Promise<void>) => {
    if (actionLock.current) return
    actionLock.current = true; setBusy(true); setError(''); setNotice('')
    try { await work() } catch (err) { if (current()) setError(sourceErrorMessage(err, 'No se pudo completar la acción. Tus datos se conservan.')) }
    finally { actionLock.current = false; if (current()) setBusy(false) }
  }
  const changeStatus = (source: EventSource, next: string) => void action(async () => {
    const response = await apiClient.patch(`/sources/${source.sourceId}/status`, { status: next })
    if (!response.data?.success) throw new Error()
    if (current()) { setNotice(next === 'active' ? 'Fuente habilitada. Los eventos nuevos seguirán pendientes de moderación.' : 'Fuente suspendida. No se iniciarán nuevas importaciones desde ella.'); await load() }
  })
  const harvest = (dryRun: boolean) => void action(async () => {
    setRun(null)
    const response = await apiClient.post('/events/pipeline/harvest', { dryRun })
    if (!response.data?.stats) throw new Error()
    if (current()) { setRun(response.data); if (!dryRun) await load() }
  })
  const ready = sources.filter(source => source.readiness?.ready)
  const visible = sources.filter(source => (status === 'all' || source.status === status) && [source.name, source.domain, source.sourceId, source.coverage?.country].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const saved = () => { if (current()) { setPanel(null); setNotice('Datos guardados. Comprueba los pasos pendientes antes de habilitar la fuente.'); void load() } }
  return <div className="min-h-screen bg-background text-foreground"><AdminNav /><div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-2xl"><p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Globe className="h-4 w-4" />Catálogo y procedencia</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Fuentes de eventos</h1><p className="mt-3 leading-7 text-muted-foreground">Revisa de dónde viene cada agenda, sus permisos y qué puede importar. Tú decides cuándo habilitarla.</p></div>
      <button type="button" disabled={busy} onClick={() => setPanel({ mode: 'config' })} className={`${sourceButton} bg-primary text-primary-foreground hover:bg-primary/90`}><Plus className="h-4 w-4" />Registrar fuente</button>
    </header>
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4 sm:p-6">{[['Registradas', sources.length], ['Listas para importar', ready.length], ['Necesitan revisión', sources.length - ready.length]].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{label}</p></div>)}</div>
    <section aria-label="Importación y vista previa" className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Comprueba primero. Importa después.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">La vista previa consulta fuentes aprobadas sin guardar eventos. Importar envía las fichas nuevas a moderación. El ciclo automático se ejecuta cada seis horas en producción; no es una sincronización en vivo.</p><div className="mt-4 flex flex-wrap gap-3">
      <button disabled={busy || !ready.length} onClick={() => harvest(true)} className={sourceButton}><Eye className="h-4 w-4" />Vista previa</button><button disabled={busy || !ready.length} onClick={() => harvest(false)} className={`${sourceButton} bg-primary text-primary-foreground hover:bg-primary/90`}><Play className="h-4 w-4" />Importar fuentes aprobadas</button><button disabled={busy} onClick={() => setAgendaOpen(true)} className={sourceButton}>Consultar una agenda</button>
    </div>{!ready.length && <p className="mt-3 text-sm text-muted-foreground">Todavía no hay fuentes listas. Revisa los bloqueos de cada ficha.</p>}{busy && <p role="status" className="mt-3 text-sm">Procesando…</p>}</section>
    {notice && <p role="status" className="rounded-xl border border-border bg-muted p-4 text-sm">{notice}</p>}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm"><p>{error}</p><button className={`${sourceButton} mt-3`} disabled={busy} onClick={() => void load()}>Volver a cargar</button></div>}
    {panel && <div ref={panelRef} tabIndex={-1} className="scroll-mt-24 focus:outline-none" key={panel.mode + (panel.source?.sourceId || 'new')}>{panel.mode === 'review' && panel.source ? <SourceReviewForm source={panel.source} onSaved={saved} onCancel={() => setPanel(null)} /> : <SourceConfigForm source={panel.source} onSaved={saved} onCancel={() => setPanel(null)} />}</div>}
    {run && <section aria-label="Resultado de importación" className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">{run.dryRun ? 'Resultado de la vista previa' : run.success && !run.incomplete ? 'Resultado de importación' : 'Importación con pendientes'}</h2><p className="mt-2 text-sm text-muted-foreground">{run.message}</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">{(run.dryRun ? [['Válidos en vista previa', run.stats.previewCount], ['Guardados', run.stats.canonicalSaved], ['Omitidos', run.stats.skipped], ['Fuentes fallidas', run.stats.failedSources]] : [['Nuevos', run.stats.created], ['Actualizados', run.stats.updated], ['Sin cambios', run.stats.unchanged], ['Escrituras fallidas', run.stats.failedWrites]]).map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{value || 0}</dd></div>)}</dl>
      {run.incomplete && <p role="alert" className="mt-4 text-sm">La lectura fue parcial. No se ha descargado todo el contenido de estas fuentes.</p>}
      {!!run.sources?.length && <ul className="mt-4 space-y-2 text-sm">{run.sources.map(item => <li key={item.sourceId} className="break-words"><strong>{item.sourceId}</strong>: {({ completed: 'procesada', preview: 'previsualizada', partial: 'con fallos de escritura', failed: 'no se pudo consultar', blocked: 'bloqueada' } as Record<string,string>)[item.status] || item.status}{item.blockers?.length ? ' · ' + item.blockers.map(code => blockerNames[code] || 'Revisión pendiente').join('; ') : ''}{item.incomplete ? ' · lectura parcial' : ''}</li>)}</ul>}
      {!!run.sampleEvents?.length && <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm" aria-label="Muestra de eventos">{run.sampleEvents.map((event, index) => <li key={event.sourceId || index} className="break-words">{event.title} · {event.date}</li>)}</ul>}
    </section>}
    <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-medium"><span className="flex items-center gap-2"><Search className="h-4 w-4" />Buscar fuente</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre, dominio o país" className={sourceInput} /></label><label className="text-sm font-medium">Estado<select value={status} onChange={event => setStatus(event.target.value)} className={sourceInput}><option value="all">Todos</option>{Object.entries(sourceStates).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button disabled={busy || loading} onClick={() => void load()} className={sourceButton}><RefreshCw className="h-4 w-4" />Actualizar</button></div>
    {loading ? <p role="status" className="py-8 text-sm text-muted-foreground">Cargando fuentes…</p> : !visible.length ? <p className="rounded-2xl border border-dashed border-border p-8 text-muted-foreground">{sources.length ? 'No hay fuentes con estos filtros.' : 'Aún no hay fuentes registradas. Añade una agenda o consulta las referencias.'}</p> : <div className="space-y-3">{visible.map(source => {
      const blockers = source.readiness?.blockers || [], canActivate = !blockers.filter(code => code !== 'source_not_approved').length
      return <article key={source.sourceId} aria-label={source.name} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{source.name}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{source.domain || source.sourceId} · {source.coverage?.country || 'Cobertura por confirmar'}</p></div><span className="rounded-lg bg-muted px-3 py-1 text-xs font-medium">{sourceStates[source.status] || source.status}</span></div>
        <p className="mt-3 text-sm">{adapterNames[source.adapterType] || 'Integración pendiente'}</p>{source.readiness?.ready ? <p className="mt-2 flex items-center gap-2 text-sm text-primary"><Check className="h-4 w-4" />Lista para importación y moderación</p> : <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{blockers.map(code => <li key={code}>• {blockerNames[code] || 'Revisión pendiente'}</li>)}</ul>}
        <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => setPanel({ mode: 'config', source })} className={sourceButton}>Configurar</button><button disabled={busy} onClick={() => setPanel({ mode: 'review', source })} className={sourceButton}>Revisar permisos</button><button disabled={busy || !canActivate || source.status === 'active'} onClick={() => changeStatus(source, 'active')} className={sourceButton}>Habilitar fuente</button><button disabled={busy || source.status === 'suspended'} onClick={() => changeStatus(source, 'suspended')} className={sourceButton}><Pause className="h-4 w-4" />Suspender</button></div>
        <p className="mt-4 text-xs text-muted-foreground">Nuevos registrados: {source.metrics?.totalEventsHarvested || 0}{source.metrics?.lastError ? ' · La última consulta requiere revisión.' : ''}</p>
      </article>
    })}</div>}
    <details className="rounded-2xl border border-border p-5"><summary className="cursor-pointer text-sm font-semibold">Fuentes de referencia</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">Añade candidatos conocidos al registro. No los activa ni sustituye tus revisiones o suspensiones.</p><button disabled={busy} className={`${sourceButton} mt-3`} onClick={() => void action(async () => { const response = await apiClient.post('/sources/seed'); if (!response.data?.success) throw new Error(); if (current()) { setNotice('Referencias añadidas en evaluación.'); await load() } })}>Añadir referencias sin activar</button></details>
    <ConnectAgendaModal isOpen={agendaOpen} onClose={() => setAgendaOpen(false)} onSuccess={() => { void load() }} />
  </div></div>
}
