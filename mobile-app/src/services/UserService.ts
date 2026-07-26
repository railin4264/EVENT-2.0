import { apiClient } from './apiClient';
import type { User, ApiResponse, PaginatedResponse } from '@/types';

export interface UpdateProfileData {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: {
    uri: string;
    type: string;
    name: string;
  };
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  interests?: string[];
}

class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  public async getUserById(userId: string): Promise<User> {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Usuario no encontrado');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuario');
    }
  }

  public async searchUsers(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<User>> {
    try {
      const response = await apiClient.get('/users/search', {
        params: { search: query, page, limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al buscar usuarios');
    }
  }

  public async updateProfile(profileData: UpdateProfileData): Promise<ApiResponse<User>> {
    try {
      const formData = new FormData();

      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'avatar') {
            formData.append(key, {
              uri: value.uri,
              type: value.type,
              name: value.name,
            } as any);
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response = await apiClient.put('/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar perfil');
    }
  }

  public async followUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/users/${userId}/follow`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al seguir usuario');
    }
  }

  public async unfollowUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/users/${userId}/follow`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dejar de seguir usuario');
    }
  }

  public async getFollowers(userId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<User>> {
    try {
      const response = await apiClient.get(`/users/${userId}/followers`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener seguidores');
    }
  }

  public async getFollowing(userId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<User>> {
    try {
      const response = await apiClient.get(`/users/${userId}/following`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener seguidos');
    }
  }

  public async blockUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/users/${userId}/block`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al bloquear usuario');
    }
  }

  public async unblockUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/users/${userId}/block`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al desbloquear usuario');
    }
  }

  public async getBlockedUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get('/users/blocked');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios bloqueados');
    }
  }

  public async reportUser(userId: string, reason: string, description?: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/users/${userId}/report`, {
        reason,
        description,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reportar usuario');
    }
  }

  public async getSuggestedUsers(limit: number = 20): Promise<User[]> {
    try {
      const response = await apiClient.get('/users/suggested', {
        params: { limit },
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios sugeridos');
    }
  }

  public async getNearbyUsers(lat: number, lng: number, radius: number = 25, limit: number = 50): Promise<User[]> {
    try {
      const response = await apiClient.get('/users/nearby', {
        params: { lat, lng, radius, limit },
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios cercanos');
    }
  }
}

export const userService = UserService.getInstance();
export default userService;