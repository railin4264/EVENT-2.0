'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Trophy, Star, Target, Zap, Crown, Flame, Heart, Users, Calendar, MessageCircle, Share, ThumbsUp, Gift, TrendingUp, Lock, CheckCircle, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

interface Achievement {
  _id: string
  name: string
  description: string
  icon: string
  category: 'social' | 'events' | 'tribes' | 'engagement' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
  unlocked: boolean
  unlockedAt?: string
  progress?: {
    current: number
    total: number
  }
  requirements: string[]
}

interface UserStats {
  level: number
  currentXP: number
  xpToNextLevel: number
  totalPoints: number
  achievementsUnlocked: number
  totalAchievements: number
  rank: string
  streakDays: number
}

const categoryIcons = {
  social: Users,
  events: Calendar,
  tribes: Users,
  engagement: Heart,
  special: Star
}

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-violet-400 to-violet-600',
  epic: 'from-violet-400 to-violet-600',
  legendary: 'from-yellow-400 to-orange-600'
}

const rarityGlow = {
  common: 'shadow-gray-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/50'
}

export default function AchievementsPanel() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false)

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/gamification/stats')
      return response.data as UserStats
    }
  })

  // Fetch achievements
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements', selectedCategory, showUnlockedOnly],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (showUnlockedOnly) params.append('unlocked', 'true')

      const response = await apiClient.get(`/gamification/achievements?${params}`)
      return response.data.achievements as Achievement[]
    }
  })

  const categories = [
    { id: 'all', label: 'Todos', icon: Trophy },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'tribes', label: 'Tribus', icon: Users },
    { id: 'engagement', label: 'Engagement', icon: Heart },
    { id: 'special', label: 'Especiales', icon: Star }
  ]

  const getAchievementIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      trophy: Trophy,
      star: Star,
      crown: Crown,
      flame: Flame,
      heart: Heart,
      users: Users,
      calendar: Calendar,
      message: MessageCircle,
      share: Share,
      thumbsup: ThumbsUp,
      gift: Gift,
      trending: TrendingUp,
      zap: Zap
    }
    return icons[iconName] || Award
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* User Stats Card */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-6 mb-8 text-white relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Nivel {userStats.level}</h2>
                  <p className="text-white/80">{userStats.rank}</p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5" />
                    <span className="text-2xl font-bold">{userStats.streakDays}</span>
                  </div>
                  <p className="text-white/80 text-sm">días de racha</p>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Experiencia</span>
                  <span className="text-sm">{userStats.currentXP} / {userStats.xpToNextLevel} XP</span>
                </div>
                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(userStats.currentXP / userStats.xpToNextLevel) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold mb-1">{userStats.totalPoints}</div>
                  <div className="text-xs text-white/80">Puntos Totales</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold mb-1">{userStats.achievementsUnlocked}</div>
                  <div className="text-xs text-white/80">Logros Desbloqueados</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold mb-1">
                    {Math.round((userStats.achievementsUnlocked / userStats.totalAchievements) * 100)}%
                  </div>
                  <div className="text-xs text-white/80">Completado</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Logros
          </h1>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnlockedOnly}
              onChange={(e) => setShowUnlockedOnly(e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Solo desbloqueados
            </span>
          </label>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => {
            const Icon = category.icon

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </button>
            )
          })}
        </div>

        {/* Achievements Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl p-6">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : !achievements || achievements.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay logros
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {showUnlockedOnly
                ? 'Aún no has desbloqueado ningún logro en esta categoría'
                : 'No hay logros disponibles en esta categoría'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement, index) => {
              const Icon = getAchievementIcon(achievement.icon)
              const isLocked = !achievement.unlocked

              return (
                <motion.div
                  key={achievement._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 transition-all ${
                    isLocked
                      ? 'opacity-60 grayscale'
                      : `hover:shadow-xl ${rarityGlow[achievement.rarity]}`
                  }`}
                >
                  {/* Rarity Badge */}
                  <div className={`absolute top-4 right-4 px-2 py-1 bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white text-xs rounded-full font-bold`}>
                    {achievement.rarity.toUpperCase()}
                  </div>

                  {/* Icon */}
                  <div className={`relative w-16 h-16 bg-gradient-to-br ${rarityColors[achievement.rarity]} rounded-full flex items-center justify-center mb-4 ${
                    !isLocked && 'animate-pulse'
                  }`}>
                    {isLocked ? (
                      <Lock className="w-8 h-8 text-white" />
                    ) : (
                      <Icon className="w-8 h-8 text-white" />
                    )}

                    {!isLocked && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {achievement.name}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  {achievement.progress && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Progreso</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {achievement.progress.current} / {achievement.progress.total}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${rarityColors[achievement.rarity]} transition-all duration-500`}
                          style={{
                            width: `${(achievement.progress.current / achievement.progress.total) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  {isLocked && achievement.requirements && achievement.requirements.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Requisitos:
                      </p>
                      <ul className="space-y-1">
                        {achievement.requirements.map((req, i) => (
                          <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="mt-0.5">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Points & Date */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {achievement.points} pts
                      </span>
                    </div>

                    {achievement.unlockedAt && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(achievement.unlockedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>

                  {/* Unlock Animation */}
                  {!isLocked && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${rarityColors[achievement.rarity]} opacity-20 rounded-2xl`}></div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
