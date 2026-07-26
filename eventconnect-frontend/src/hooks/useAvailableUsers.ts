import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

interface User {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  lastActive?: Date;
  isOnline?: boolean;
}

interface UseAvailableUsersOptions {
  search?: string;
  limit?: number;
}

export const useAvailableUsers = (options: UseAvailableUsersOptions = {}) => {
  const { search, limit = 50 } = options;

  return useQuery({
    queryKey: ['users', 'available-for-chat', search, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit.toString());

      const { data } = await apiClient.get(
        `/users/available-for-chat?${params.toString()}`
      );

      return data.data as User[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: true, // Always enabled, but can be controlled externally if needed
  });
};
