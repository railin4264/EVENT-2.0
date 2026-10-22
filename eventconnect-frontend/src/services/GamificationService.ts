import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { Achievement, UserAchievement, UserStats, ApiResponse, PaginatedResponse } from '../types/api.types';

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
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  public async getProfile(): Promise<UserStats> {
    try {
      const response: AxiosResponse<ApiResponse<UserStats>> =
        await axios.get(`${this.apiBaseUrl}/gamification/profile`);

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
      const response: AxiosResponse<PaginatedResponse<Achievement>> =
        await axios.get(`${this.apiBaseUrl}/gamification/achievements`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener logros');
    }
  }

  public async getUserAchievements(userId?: string): Promise<UserAchievement[]> {
    try {
      const url = userId
        ? `${this.apiBaseUrl}/gamification/users/${userId}/achievements`
        : `${this.apiBaseUrl}/gamification/my-achievements`;

      const response: AxiosResponse<ApiResponse<UserAchievement[]>> = await axios.get(url);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener logros del usuario');
    }
  }

  public async claimAchievement(achievementId: string): Promise<ApiResponse<UserAchievement>> {
    try {
      const response: AxiosResponse<ApiResponse<UserAchievement>> =
        await axios.post(`${this.apiBaseUrl}/gamification/achievements/${achievementId}/claim`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reclamar logro');
    }
  }

  public async getLeaderboard(timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time', limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const response: AxiosResponse<ApiResponse<LeaderboardEntry[]>> =
        await axios.get(`${this.apiBaseUrl}/gamification/leaderboard`, {
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
      const response: AxiosResponse<ApiResponse<Challenge[]>> =
        await axios.get(`${this.apiBaseUrl}/gamification/challenges`, {
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
      const response: AxiosResponse<ApiResponse<{ challenge: Challenge; rewards: any }>> =
        await axios.post(`${this.apiBaseUrl}/gamification/challenges/${challengeId}/complete`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al completar desafío');
    }
  }

  public async getBadges(): Promise<any[]> {
    try {
      const response: AxiosResponse<ApiResponse<any[]>> =
        await axios.get(`${this.apiBaseUrl}/gamification/badges`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener insignias');
    }
  }

  public async getPointsHistory(page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    try {
      const response: AxiosResponse<PaginatedResponse<any>> =
        await axios.get(`${this.apiBaseUrl}/gamification/points/history`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener historial de puntos');
    }
  }

  public async dailyCheckin(): Promise<ApiResponse<{ points: number; streak: number }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ points: number; streak: number }>> =
        await axios.post(`${this.apiBaseUrl}/gamification/daily-checkin`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al hacer check-in diario');
    }
  }

  public async getStreaks(): Promise<{ current: number; longest: number; lastCheckin: string }> {
    try {
      const response: AxiosResponse<ApiResponse<{ current: number; longest: number; lastCheckin: string }>> =
        await axios.get(`${this.apiBaseUrl}/gamification/streaks`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { current: 0, longest: 0, lastCheckin: '' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener rachas');
    }
  }

  public async getRankInfo(): Promise<{ rank: number; percentile: number; nextRankPoints: number }> {
    try {
      const response: AxiosResponse<ApiResponse<{ rank: number; percentile: number; nextRankPoints: number }>> =
        await axios.get(`${this.apiBaseUrl}/gamification/rank`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { rank: 0, percentile: 0, nextRankPoints: 0 };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener información de rango');
    }
  }
}

export const gamificationService = GamificationService.getInstance();
export default gamificationService;