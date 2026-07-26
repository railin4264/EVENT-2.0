// ============================================================
// GAMIFICATION SERVICE
// Handles achievements, levels, and XP
// ============================================================

import { apiClient } from '../client'
import type { ApiResponse } from '@/types/models'

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

class GamificationService {
  /**
   * Get user achievements and stats
   */
  async getUserStats(userId: string): Promise<ApiResponse<UserStats>> {
    const response = await apiClient.get<ApiResponse<UserStats>>(
      `/api/gamification/users/${userId}/stats`
    )
    return response.data
  }

  /**
   * Get all available achievements
   */
  async getAchievements(): Promise<ApiResponse<Achievement[]>> {
    const response = await apiClient.get<ApiResponse<Achievement[]>>(
      `/api/gamification/achievements`
    )
    return response.data
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/api/gamification/leaderboard?limit=${limit}`
    )
    return response.data
  }
}

export const gamificationService = new GamificationService()
