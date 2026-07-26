'use client'

import { motion } from 'framer-motion'
import { Star, Calendar, Users, Crown, Heart, Zap , Trophy, Sparkles, Award, Target, Flame, PartyPopper} from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0

export interface Badge {
  id: string
  name: string
  description: string
  icon: any
  color: string
  gradient: string
  criteria: string
  earned: boolean
  earnedAt?: Date
  progress?: number
  maxProgress?: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface UserBadgesProps {
  badges: Badge[]
  showProgress?: boolean
  compact?: boolean
  maxDisplay?: number
}

export const AVAILABLE_BADGES: Badge[] = [
  {
    id: 'first_event',
    name: 'Primer Evento',
    description: 'Creaste tu primer evento',
    icon: PartyPopper,
    color: 'text-blue-500',
    gradient: 'from-blue-400 to-blue-600',
    criteria: 'Crear 1 evento',
    earned: false,
    rarity: 'common'
  },
  {
    id: 'social_butterfly',
    name: 'Mariposa Social',
    description: 'Asististe a 5 eventos diferentes',
    icon: Sparkles,
    color: 'text-pink-500',
    gradient: 'from-pink-400 to-pink-600',
    criteria: 'Asistir a 5 eventos',
    earned: false,
    progress: 0,
    maxProgress: 5,
    rarity: 'common'
  },
  {
    id: 'popular_organizer',
    name: 'Organizador Popular',
    description: 'Uno de tus eventos tuvo más de 50 asistentes',
    icon: Users,
    color: 'text-green-500',
    gradient: 'from-green-400 to-green-600',
    criteria: 'Evento con 50+ asistentes',
    earned: false,
    rarity: 'rare'
  },
  {
    id: 'event_master',
    name: 'Maestro de Eventos',
    description: 'Creaste 10 eventos exitosos',
    icon: Trophy,
    color: 'text-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
    criteria: 'Crear 10 eventos',
    earned: false,
    progress: 0,
    maxProgress: 10,
    rarity: 'epic'
  },
  {
    id: 'community_favorite',
    name: 'Favorito de la Comunidad',
    description: 'Recibiste más de 100 ❤️ en tus eventos',
    icon: Heart,
    color: 'text-red-500',
    gradient: 'from-red-400 to-red-600',
    criteria: '100+ favoritos totales',
    earned: false,
    progress: 0,
    maxProgress: 100,
    rarity: 'epic'
  },
  {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Te uniste a 10 eventos antes que nadie',
    icon: Calendar,
    color: 'text-indigo-500',
    gradient: 'from-indigo-400 to-indigo-600',
    criteria: 'Primer asistente 10 veces',
    earned: false,
    progress: 0,
    maxProgress: 10,
    rarity: 'rare'
  },
  {
    id: 'legendary_host',
    name: 'Anfitrión Legendario',
    description: 'Organizaste un evento con más de 200 asistentes',
    icon: Crown,
    color: 'text-purple-500',
    gradient: 'from-purple-400 to-purple-600',
    criteria: 'Evento con 200+ asistentes',
    earned: false,
    rarity: 'legendary'
  },
  {
    id: 'streak_master',
    name: 'Maestro de Rachas',
    description: 'Asististe a eventos 7 días seguidos',
    icon: Flame,
    color: 'text-orange-500',
    gradient: 'from-orange-400 to-orange-600',
    criteria: '7 días consecutivos',
    earned: false,
    progress: 0,
    maxProgress: 7,
    rarity: 'epic'
  },
  {
    id: 'network_builder',
    name: 'Constructor de Redes',
    description: 'Conectaste con 50 personas diferentes',
    icon: Zap,
    color: 'text-cyan-500',
    gradient: 'from-cyan-400 to-cyan-600',
    criteria: '50 conexiones únicas',
    earned: false,
    progress: 0,
    maxProgress: 50,
    rarity: 'rare'
  },
  {
    id: 'perfectionist',
    name: 'Perfeccionista',
    description: 'Todos tus eventos tuvieron rating 5 estrellas',
    icon: Star,
    color: 'text-amber-500',
    gradient: 'from-amber-400 to-amber-600',
    criteria: 'Rating perfecto en 5 eventos',
    earned: false,
    progress: 0,
    maxProgress: 5,
    rarity: 'legendary'
  }
]

export function UserBadges({
  badges,
  showProgress = true,
  compact = false,
  maxDisplay
}: UserBadgesProps) {
  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges
  const earnedBadges = displayBadges.filter(badge => badge.earned)
  const inProgressBadges = displayBadges.filter(badge => !badge.earned && badge.progress !== undefined)

  const getRarityColor = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 dark:border-gray-600'
      case 'rare': return 'border-blue-400 dark:border-blue-500'
      case 'epic': return 'border-purple-400 dark:border-purple-500'
      case 'legendary': return 'border-yellow-400 dark:border-yellow-500'
    }
  }

  const getRarityGlow = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common': return 'shadow-gray-500/20'
      case 'rare': return 'shadow-blue-500/30'
      case 'epic': return 'shadow-purple-500/30'
      case 'legendary': return 'shadow-yellow-500/40'
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {earnedBadges.slice(0, 3).map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.2 }}
            className={`w-6 h-6 rounded-full bg-gradient-to-r ${badge.gradient} flex items-center justify-center shadow-lg ${getRarityGlow(badge.rarity)}`}
            title={badge.name}
          >
            <badge.icon className="w-3 h-3 text-white" />
          </motion.div>
        ))}
        {earnedBadges.length > 3 && (
          <span className="text-xs text-gray-500 ml-1">
            +{earnedBadges.length - 3}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Logros Obtenidos ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {earnedBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className={`relative p-4 bg-white dark:bg-gray-800 rounded-xl border-2 ${getRarityColor(badge.rarity)} shadow-lg ${getRarityGlow(badge.rarity)} hover:shadow-xl transition-all duration-300`}
              >
                {/* Rarity indicator */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-r ${badge.gradient}`} />

                {/* Badge icon */}
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${badge.gradient} flex items-center justify-center mb-3 mx-auto`}>
                  <badge.icon className="w-6 h-6 text-white" />
                </div>

                {/* Badge info */}
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {badge.description}
                  </p>
                  {badge.earnedAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Sparkle effect for legendary badges */}
                {badge.rarity === 'legendary' && (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                        style={{
                          top: `${20 + i * 15}%`,
                          left: `${10 + i * 20}%`,
                        }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3,
                        }}
                      />
                    ))}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* In Progress Badges */}
      {showProgress && inProgressBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            En Progreso ({inProgressBadges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${badge.gradient} opacity-60 flex items-center justify-center`}>
                    <badge.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {badge.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {badge.description}
                    </p>
                    {badge.progress !== undefined && badge.maxProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{badge.progress}/{badge.maxProgress}</span>
                          <span>{Math.round((badge.progress / badge.maxProgress) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <motion.div
                            className={`bg-gradient-to-r ${badge.gradient} h-2 rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Stats */}
      {earnedBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Estadísticas de Logros
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {earnedBadges.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {earnedBadges.filter(b => b.rarity === 'rare').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Raros</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {earnedBadges.filter(b => b.rarity === 'epic').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Épicos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {earnedBadges.filter(b => b.rarity === 'legendary').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Legendarios</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}