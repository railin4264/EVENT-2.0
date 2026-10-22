import Link from 'next/link'
import { Compass, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return <section className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
    <Compass className="mb-6 h-12 w-12 text-primary" aria-hidden="true" />
    <p className="text-sm font-medium text-muted-foreground">Página no encontrada · 404</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight">Este camino no lleva a un plan.</h1>
    <p className="mt-4 text-muted-foreground">Puede que el enlace haya cambiado o que el contenido ya no esté disponible. Hay más eventos por descubrir.</p>
    <Link href="/events" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-medium text-primary-foreground">Explorar eventos<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Volver al inicio</Link>
  </section>
}
