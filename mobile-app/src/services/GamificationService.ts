import { apiClient } from './apiClient';
import type { Achievement, ApiResponse, PaginatedResponse } from '@/types';

export interface UserStats {
  points: number;
  level: number;
  nextLevelPoints: number;
  totalEvents: number;
  completedEvents: number;
  achievementsCount: number;
  currentStreak: number;
  longestStreak: number;
}

export interface LeaderboardEntry {
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  points: number;
  level: number;
  rank: number;
}

export interface Challenge {
  _id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  requirements: any;
  rewards: {
    points: number;
    badge?: string;
  };
  expiresAt: string;
  isCompleted: boolean;
  progress: number;
}

class GamificationService {
  private static instance: GamificationService;

  private constructor() {}

  public static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  public async getProfile(): Promise<UserStats> {
    try {
      const response = await apiClient.get('/gamification/profile');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Error al obtener perfil de gamificación');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener perfil de gamificación');
    }
  }

  public async getAchievements(page: number = 1, limit: number = 50): Promise<PaginatedResponse<Achievement>> {
    try {
      const response = await apiClient.get('/gamification/achievements', {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener logros');
    }
  }

  public async getUserAchievements(): Promise<Achievement[]> {
    try {
      const response = await apiClient.get('/gamification/my-achievements');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener logros del usuario');
    }
  }

  public async claimAchievement(achievementId: string): Promise<ApiResponse<Achievement>> {
    try {
      const response = await apiClient.post(`/gamification/achievements/${achievementId}/claim`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reclamar logro');
    }
  }

  public async getLeaderboard(timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time', limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get('/gamification/leaderboard', {
        params: { timeframe, limit }
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tabla de líderes');
    }
  }

  public async getChallenges(type?: 'daily' | 'weekly' | 'monthly' | 'special'): Promise<Challenge[]> {
    try {
      const response = await apiClient.get('/gamification/challenges', {
        params: type ? { type } : {}
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener desafíos');
    }
  }

  public async completeChallenge(challengeId: string): Promise<ApiResponse<{ challenge: Challenge; rewards: any }>> {
    try {
      const response = await apiClient.post(`/gamification/challenges/${challengeId}/complete`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al completar desafío');
    }
  }

  public async dailyCheckin(): Promise<ApiResponse<{ points: number; streak: number }>> {
    try {
      const response = await apiClient.post('/gamification/daily-checkin');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al hacer check-in diario');
    }
  }

  public async getStreaks(): Promise<{ current: number; longest: number; lastCheckin: string }> {
    try {
      const response = await apiClient.get('/gamification/streaks');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { current: 0, longest: 0, lastCheckin: '' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener rachas');
    }
  }

  public async getPointsHistory(page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    try {
      const response = await apiClient.get('/gamification/points/history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener historial de puntos');
    }
  }
}

export const gamificationService = GamificationService.getInstance();
export default gamificationService;