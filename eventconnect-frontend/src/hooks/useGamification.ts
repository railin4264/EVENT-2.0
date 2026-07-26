import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamificationService } from '@/services/GamificationService';

export const gamificationKeys = {
  all: ['gamification'] as const,
  profile: () => [...gamificationKeys.all, 'profile'] as const,
  achievements: () => [...gamificationKeys.all, 'achievements'] as const,
  userAchievements: (userId?: string) => [...gamificationKeys.all, 'user-achievements', userId] as const,
  leaderboard: (timeframe: string) => [...gamificationKeys.all, 'leaderboard', timeframe] as const,
  challenges: (type?: string) => [...gamificationKeys.all, 'challenges', type] as const,
  badges: () => [...gamificationKeys.all, 'badges'] as const,
  streaks: () => [...gamificationKeys.all, 'streaks'] as const,
  pointsHistory: () => [...gamificationKeys.all, 'points-history'] as const,
};

export function useGamificationProfile() {
  return useQuery({
    queryKey: gamificationKeys.profile(),
    queryFn: () => gamificationService.getProfile(),
  });
}

export function useAchievements(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: [...gamificationKeys.achievements(), { page, limit }],
    queryFn: () => gamificationService.getAchievements(page, limit),
  });
}

export function useUserAchievements(userId?: string) {
  return useQuery({
    queryKey: gamificationKeys.userAchievements(userId),
    queryFn: () => gamificationService.getUserAchievements(userId),
  });
}

export function useLeaderboard(timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time', limit: number = 100) {
  return useQuery({
    queryKey: gamificationKeys.leaderboard(timeframe),
    queryFn: () => gamificationService.getLeaderboard(timeframe, limit),
  });
}

export function useChallenges(type?: 'daily' | 'weekly' | 'monthly' | 'special') {
  return useQuery({
    queryKey: gamificationKeys.challenges(type),
    queryFn: () => gamificationService.getChallenges(type),
  });
}

export function useStreaks() {
  return useQuery({
    queryKey: gamificationKeys.streaks(),
    queryFn: () => gamificationService.getStreaks(),
  });
}

export function useClaimAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (achievementId: string) => gamificationService.claimAchievement(achievementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.userAchievements() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.profile() });
    },
  });
}

export function useCompleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => gamificationService.completeChallenge(challengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.challenges() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.profile() });
    },
  });
}

export function useDailyCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gamificationService.dailyCheckin(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.profile() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.streaks() });
    },
  });
}