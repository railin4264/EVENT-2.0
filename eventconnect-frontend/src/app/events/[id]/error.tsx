'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { MapPin, RotateCcw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <section role="alert" className="flex min-h-[65dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
        <MapPin aria-hidden="true" className="mx-auto mb-5 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">No pudimos mostrar este evento</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Puedes volver a intentarlo o regresar al mapa para descubrir otro plan.</p>
        <button type="button" onClick={reset} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <RotateCcw aria-hidden="true" className="h-4 w-4" /> Volver a intentar
        </button>
        <Link href="/discovery" className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-border px-4 font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Volver al mapa</Link>
      </div>
    </section>
  )
}
