'use client'
import { useEffect, useState } from 'react'
import { useServiceWorker } from '@/hooks/usePWA'
export default function AppUpdateNotice() {
  const [newBuild, setNewBuild] = useState(false)
  const { swUpdateAvailable, updateServiceWorker } = useServiceWorker()
  useEffect(() => {
    const buildId = process.env.NEXT_PUBLIC_APP_BUILD_ID
    if (!buildId || buildId === 'development') return
    let alive = true
    const controller = new AbortController()
    const check = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const response = await fetch('/api/app-version', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        if (alive && typeof data.buildId === 'string' && data.buildId !== buildId) setNewBuild(true)
      } catch { /* A temporary outage is handled by the connection banner. */ }
    }
    void check(); const interval = window.setInterval(check, 60000)
    document.addEventListener('visibilitychange', check)
    return () => { alive = false; controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', check) }
  }, [])
  if (!newBuild && !swUpdateAvailable) return null
  return <aside role="status" aria-label="Actualización disponible" className="fixed inset-x-4 bottom-24 z-[1200] mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl md:bottom-5"><div><p className="font-semibold">Hay una versión nueva de EventNow</p><p className="mt-1 text-sm text-muted-foreground">Termina lo que estás escribiendo y actualiza para cargar las correcciones.</p></div><button type="button" onClick={() => void updateServiceWorker()} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Actualizar ahora</button></aside>
}
