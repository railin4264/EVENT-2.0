'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import EventCommunityActions from '@/components/events/EventCommunityActions'
export default function CommunityEventPage() {
  const { id } = useParams<{ id: string }>()
  return <main className="min-h-dvh bg-background px-5 py-10 text-foreground"><div className="mx-auto max-w-4xl"><Link href={`/events/${encodeURIComponent(id)}`} className="mb-8 inline-block text-sm text-primary">← Volver al evento</Link><EventCommunityActions id={id} /></div></main>
}
