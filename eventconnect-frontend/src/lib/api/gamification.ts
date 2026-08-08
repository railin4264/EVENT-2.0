import { apiClient } from './client'

export interface GamificationProfile {
  userId: string
  level: number
  xp: number
  points: number
  totalPoints: number
  streak: number
  rank?: number
  badges?: { id: string; name: string; icon?: string; earnedAt?: string }[]
  stats?: Record<string, number>
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon?: string
  category?: string
  earned?: boolean
  earnedAt?: string
  progress?: number
  target?: number
}

export interface Challenge {
  id: string
  title: string
  description: string
  type?: string
  xpReward?: number
  progress?: number
  target?: number
  enrolled?: boolean
  startDate?: string
  endDate?: string
}

export interface LeaderboardEntry {
  userId: string
  name: string
  avatar?: string
  points: number
  rank: number
}

export const gamificationService = {
  getProfile: async () => {
    const res = await apiClient.get('/gamification/profile')
    return res.data as { success: boolean; data: GamificationProfile }
  },

  getAchievements: async () => {
    const res = await apiClient.get('/gamification/achievements')
    return res.data as { success: boolean; data: Achievement[] }
  },

  getAvailableAchievements: async () => {
    const res = await apiClient.get('/gamification/achievements/available')
    return res.data as { success: boolean; data: Achievement[] }
  },

  getLeaderboards: async (scope = 'global', period = 'all') => {
    const res = await apiClient.get('/gamification/leaderboards', { params: { scope, period } })
    return res.data as { success: boolean; data: LeaderboardEntry[] }
  },

  getChallenges: async () => {
    const res = await apiClient.get('/gamification/challenges')
    return res.data as { success: boolean; data: Challenge[] }
  },

  enrollChallenge: async (challengeId: string) => {
    const res = await apiClient.post('/gamification/challenges/enroll', { challengeId })
    return res.data
  },

  getStats: async () => {
    const res = await apiClient.get('/gamification/stats')
    return res.data as { success: boolean; data: Record<string, number> }
  },
}

export default gamificationService
