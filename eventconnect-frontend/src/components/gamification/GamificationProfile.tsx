'use client'

import { useEffect, useState } from 'react'
import { Trophy, Award, Flame, Star, Users, Loader2 } from 'lucide-react'
import {
  gamificationService,
  type GamificationProfile as GamiProfile,
  type Achievement,
  type Challenge,
  type LeaderboardEntry,
} from '@/lib/api/gamification'

export default function GamificationProfile() {
  const [profile, setProfile] = useState<GamiProfile | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      gamificationService.getProfile(),
      gamificationService.getAchievements(),
      gamificationService.getChallenges(),
      gamificationService.getLeaderboards('global', 'all'),
    ])
      .then(([p, a, c, l]) => {
        if (!active) return
        setProfile(p?.data || null)
        setAchievements(Array.isArray(a?.data) ? a.data : [])
        setChallenges(Array.isArray(c?.data) ? c.data : [])
        setLeaderboard(Array.isArray(l?.data) ? l.data : (Array.isArray(l?.data?.entries) ? l.data.entries : (Array.isArray(l?.data?.leaderboard) ? l.data.leaderboard : [])))
      })
      .catch((e) => active && setError(e?.message || 'No se pudo cargar la gamificación'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const enroll = async (challengeId: string) => {
    try {
      await gamificationService.enrollChallenge(challengeId)
      setChallenges((prev) =>
        prev.map((ch) => (ch.id === challengeId ? { ...ch, enrolled: true } : ch)),
      )
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando perfil de gamificación…
      </div>
    )
  }
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<Star className="h-5 w-5" />} label="Nivel" value={profile?.level ?? 0} />
        <StatCard icon={<Trophy className="h-5 w-5" />} label="XP" value={profile?.xp ?? 0} />
        <StatCard icon={<Award className="h-5 w-5" />} label="Puntos" value={profile?.totalPoints ?? 0} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Racha" value={profile?.streak ?? 0} />
      </div>

      {/* Achievements / badges */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Logros</h2>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay logros disponibles.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border p-3 text-center ${
                  a.earned ? 'border-primary bg-primary/5' : 'border-border opacity-60'
                }`}
              >
                <div className="text-2xl">{a.icon || '🏅'}</div>
                <div className="mt-1 text-sm font-medium">{a.name}</div>
                {a.earned ? (
                  <div className="text-xs text-primary">¡Desbloqueado!</div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {a.progress ?? 0}/{a.target ?? '?'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Challenges */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Retos</h2>
        {challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay retos activos.</p>
        ) : (
          <div className="space-y-3">
            {challenges.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{ch.title}</div>
                  <div className="text-xs text-muted-foreground">{ch.description}</div>
                  {typeof ch.progress === 'number' && typeof ch.target === 'number' && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {ch.progress}/{ch.target} · +{ch.xpReward ?? 0} XP
                    </div>
                  )}
                </div>
                {ch.enrolled ? (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                    Inscrito
                  </span>
                ) : (
                  <button
                    onClick={() => enroll(ch.id)}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white"
                  >
                    Unirse
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5" /> Clasificación
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos de clasificación.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between rounded-lg border p-2 text-sm"
              >
                <span className="font-medium">#{entry.rank}</span>
                <span className="flex-1 px-2 truncate">{entry.name}</span>
                <span className="text-primary">{entry.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
