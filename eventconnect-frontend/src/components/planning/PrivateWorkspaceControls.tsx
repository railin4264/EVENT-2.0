'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'

export function PrivateWorkspaceControls<T extends object>({ kind, workspaceKey = 'personal', data, onLoad }: { kind: 'host-readiness' | 'partner-brief'; workspaceKey?: string; data: T; onLoad: (data: T) => void }) {
  const { user, isAuthenticated } = useAuthStore()
  const owner = isAuthenticated ? user?._id || user?.id || '' : ''
  const key = `${owner || ''}:${kind}:${workspaceKey}`
  const active = useRef(key); active.current = key
  const [record, setRecord] = useState<{ key: string; version: string | 0 } | null>(null)
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('')
  const lock = useRef(false), alive = useRef(true)
  const path = `/users/me/workspaces/${kind}/${encodeURIComponent(workspaceKey)}`
  useEffect(() => {
    let mounted = true
    alive.current = true; lock.current = false
    setRecord(null); setBusy(false); setStatus('')
    if (owner) void apiClient.get(`${path}?ownerId=${owner}`).then(response => { if (mounted && active.current === key) setRecord({ key, version: response.data.data.version }) }).catch(() => { if (mounted && active.current === key) setStatus('No se pudo consultar el guardado. Puedes reintentar con «Cargar guardado».') })
    return () => { mounted = false; alive.current = false }
  }, [owner, path, key])
  const run = async (action: 'save' | 'load' | 'delete') => {
    if (!owner || lock.current) return
    lock.current = true
    setBusy(true); setStatus('')
    try {
      if (action === 'load') {
        const response = await apiClient.get(`${path}?ownerId=${owner}`)
        if ((!alive.current || active.current !== key)) return
        const saved = response.data.data
        setRecord({ key, version: saved.version })
        if (saved.data) { onLoad(saved.data as T); setStatus('Borrador guardado cargado. Revisa los datos antes de usarlos.') }
        else setStatus('Todavía no hay un borrador guardado aquí.')
      } else {
        if (record?.key !== key) return
        if (action === 'save') {
          const response = await apiClient.put(path, { ownerId: owner, data, version: record.version })
          if (alive.current && active.current === key) { setRecord({ key, version: response.data.data.version }); setStatus('Guardado en tu cuenta. Sólo tú puedes recuperar este borrador.') }
        } else {
          await apiClient.delete(`${path}?version=${record.version}&ownerId=${owner}`)
          if (alive.current && active.current === key) { setRecord({ key, version: 0 }); setStatus('Guardado eliminado. Puedes seguir editando el borrador de esta pantalla.') }
        }
      }
    } catch (error) {
      if (alive.current && active.current === key) setStatus((error as { response?: { status?: number } }).response?.status === 409 ? 'El guardado cambió en otra sesión o alcanzaste el límite de 20. Carga la versión guardada antes de volver a guardar.' : 'No se pudo completar la acción. El borrador de esta pantalla sigue disponible.')
    } finally { if (alive.current && active.current === key) { lock.current = false; setBusy(false) } }
  }
  if (!owner) return <p className="my-4 text-sm text-muted-foreground"><Link href="/login" className="text-primary underline">Inicia sesión</Link> para guardar este borrador en tu cuenta. También puedes exportarlo.</p>
  return <div className="my-5 rounded-xl border border-border bg-muted/30 p-4"><p className="text-sm font-medium">Tu espacio privado</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Guardar es opcional. No publica el contenido, no envía propuestas ni modifica el evento. Puedes conservar hasta 20 borradores.</p><div className="mt-3 flex flex-wrap gap-3">{(['save', 'load', 'delete'] as const).map(action => <button key={action} type="button" disabled={busy || (action !== 'load' && record?.key !== key) || (action === 'delete' && !record?.version)} onClick={() => void run(action)} className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-40">{action === 'save' ? 'Guardar en mi cuenta' : action === 'load' ? 'Cargar guardado' : 'Eliminar guardado'}</button>)}</div>{status && <p role="status" className="mt-3 text-sm">{status}</p>}</div>
}
