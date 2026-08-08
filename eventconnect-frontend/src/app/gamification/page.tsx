import { Metadata } from 'next'
import GamificationProfile from '@/components/gamification/GamificationProfile'

export const metadata: Metadata = {
  title: 'Gamificación | EventConnect',
  description: 'Logros, retos y clasificación de EventConnect',
}

export default function GamificationPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Gamificación</h1>
      <GamificationProfile />
    </div>
  )
}
