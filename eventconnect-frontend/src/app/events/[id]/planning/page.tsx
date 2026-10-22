'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { EventBudgetEditor } from '@/components/events/EventBudgetEditor'
export default function PlanningPage() {
  const params = useParams<{ id: string }>()
  return <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100"><div className="mx-auto max-w-2xl"><Link className="text-sm text-slate-400 underline" href={`/events/${params.id}`}>Volver al evento</Link><h1 className="mb-3 mt-8 text-3xl font-semibold">Una salida sin sorpresas</h1><p className="mb-8 text-slate-400">Ayuda a quienes vienen por primera vez y explica qué incluye su presupuesto.</p><EventBudgetEditor eventId={params.id} /></div></main>
}
