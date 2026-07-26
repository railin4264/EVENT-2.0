import { useState, useEffect } from 'react'
import { Star, Zap, TrendingUp, Loader2 , Award, CircleDot} from 'lucide-react'
import { Card } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { gamificationService } from '@/lib/api/services/gamification.service'
import { useAuth } from '@/lib/providers/AuthProvider'
import toast from 'react-hot-toast'

interface Achievement {
  _id: string
  name: string
  description: string
  icon: string
  xp: number
  unlockedAt?: Date
  progress?: number
  total?: number
}

interface UserStats {
  level: number
  xp: number
  nextLevelXP: number
  achievements: Achievement[]
  totalAchievements: number
  rank: string
}

interface LeaderboardEntry {
  user: {
    _id: string
    firstName: string
    lastName: string
    username: string
  }
  level: number
  xp: number
  rank: number
}

export function Gamification() {
  const { user } = useAuth()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true)
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true)

  useEffect(() => {
    if (user) {
      loadUserStats()
      loadAchievements()
      loadLeaderboard()
    }
  }, [user])

  const loadUserStats = async () => {
    if (!user) return

    setIsLoadingStats(true)
    try {
      const response = await gamificationService.getUserStats(user._id)
      if (response.success && response.data) {
        setUserStats(response.data)
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
      toast.error('Error al cargar estadísticas. Verifica la conexión con el backend.')
      setUserStats(null)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const loadAchievements = async () => {
    setIsLoadingAchievements(true)
    try {
      const response = await gamificationService.getAchievements()
      if (response.success && response.data) {
        setAchievements(response.data)
      }
    } catch (error) {
      console.error('Error loading achievements:', error)
      toast.error('Error al cargar logros')
      setAchievements([])
    } finally {
      setIsLoadingAchievements(false)
    }
  }

  const loadLeaderboard = async () => {
    setIsLoadingLeaderboard(true)
    try {
      const response = await gamificationService.getLeaderboard(10)
      if (response.success && response.data) {
        setLeaderboard(response.data)
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      toast.error('Error al cargar ranking')
      setLeaderboard([])
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-orange-500'
      case 'epic': return 'from-purple-500 to-pink-500'
      case 'rare': return 'from-blue-500 to-cyan-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500/50'
      case 'epic': return 'border-purple-500/50'
      case 'rare': return 'border-blue-500/50'
      default: return 'border-gray-500/50'
    }
  }

  const getUserAvatar = () => {
    if (!user) return 'U'
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getUserName = () => {
    if (!user) return 'Usuario'
    return `${user.firstName} ${user.lastName}`
  }

  const getLeaderboardAvatar = (entry: LeaderboardEntry) => {
    return `${entry.user.firstName?.charAt(0) || ''}${entry.user.lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getLeaderboardBadge = (rank: number) => {
    switch (rank) {
      case 1: return '👑'
      case 2: return '🥈'
      case 3: return '🥉'
      case 4: return '🏆'
      case 5: return '⭐'
      case 6: return '🎯'
      case 7: return '🌟'
      default: return '🔥'
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/70">Inicia sesión para ver gamificación</p>
      </div>
    )
  }

  const progressPercentage = userStats ? (userStats.xp / userStats.nextLevelXP) * 100 : 0

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* Profile Stats */}
      <div className="col-span-4 space-y-6">
        <Card className="glass-card p-6">
          {isLoadingStats ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : !userStats ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-white/60">No hay estadísticas disponibles</p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center relative">
                <span className="text-white text-2xl font-bold">{getUserAvatar()}</span>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{userStats.level}</span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">{getUserName()}</h2>
                <p className="text-white/60">{userStats.rank || 'Explorador de Eventos'}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Nivel {userStats.level}</span>
                  <span className="text-white/70">{userStats.xp}/{userStats.nextLevelXP} XP</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-xs text-white/60">{userStats.nextLevelXP - userStats.xp} XP para el siguiente nivel</p>
              </div>
            </div>
          )}
        </Card>

        {/* Leaderboard */}
        <Card className="glass-card p-6">
          <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <span>Ranking Global</span>
          </h3>
          {isLoadingLeaderboard ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-white/60">No hay ranking disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.slice(0, 8).map((entry) => {
                const isCurrentUser = entry.user._id === user._id

                return (
                  <div
                    key={entry.user._id}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      isCurrentUser ? 'bg-violet-500/20 border border-violet-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold">
                      {entry.rank}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{getLeaderboardAvatar(entry)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {entry.user.firstName} {entry.user.lastName} {isCurrentUser && '(Tú)'}
                      </p>
                      <p className="text-white/60 text-sm">Nivel {entry.level} • {entry.xp.toLocaleString()} XP</p>
                    </div>
                    <span className="text-lg">{getLeaderboardBadge(entry.rank)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Achievements */}
      <div className="col-span-8">
        <div className="flex items-center space-x-2 mb-6">
          <Award className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Logros y Desafíos</h2>
        </div>

        {isLoadingAchievements ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
          </div>
        ) : achievements.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <p className="text-white/60">No hay logros disponibles</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {achievements.map((achievement) => {
              const isCompleted = !!achievement.unlockedAt
              const progress = achievement.progress || 0
              const total = achievement.total || 100
              const progressPercentage = (progress / total) * 100

              return (
                <Card
                  key={achievement._id}
                  className={`glass-card p-6 hover-lift transition-all duration-300 ${
                    isCompleted ? 'neon-glow-violet' : ''
                  } border border-white/10`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center text-2xl relative`}>
                      {achievement.icon}
                      {isCompleted && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-white font-bold">{achievement.name}</h4>
                      </div>

                      <p className="text-white/70 text-sm mb-3">{achievement.description}</p>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">
                            {progress}/{total}
                          </span>
                          <span className="text-yellow-400 font-medium">+{achievement.xp} XP</span>
                        </div>
                        <Progress
                          value={progressPercentage}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
