import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { User, ApiResponse, PaginatedResponse } from '../types/api.types';

export interface UpdateProfileData {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: File;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  interests?: string[];
}

export interface UserFilters {
  search?: string;
  interests?: string[];
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
  page?: number;
  limit?: number;
}

class UserService {
  private static instance: UserService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  public async getUserById(userId: string): Promise<User> {
    try {
      const response: AxiosResponse<ApiResponse<User> & { user?: User }> =
        await axios.get(`${this.apiBaseUrl}/users/profile/${userId}`);

      if (response.data.success && (response.data.user || response.data.data)) {
        return (response.data.user || response.data.data)!;
      }

      throw new Error('Usuario no encontrado');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuario');
    }
  }

  public async searchUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response: AxiosResponse<PaginatedResponse<User>> =
        await axios.get(`${this.apiBaseUrl}/users/search?${params.toString()}`);

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
            formData.append(key, value);
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response: AxiosResponse<ApiResponse<User>> =
        await axios.put(`${this.apiBaseUrl}/users/profile`, formData, {
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
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/users/${userId}/follow`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al seguir usuario');
    }
  }

  public async unfollowUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/users/${userId}/follow`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dejar de seguir usuario');
    }
  }

  public async getFollowers(userId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<User>> {
    try {
      const response: AxiosResponse<PaginatedResponse<User>> =
        await axios.get(`${this.apiBaseUrl}/users/${userId}/followers`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener seguidores');
    }
  }

  public async getFollowing(userId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<User>> {
    try {
      const response: AxiosResponse<PaginatedResponse<User>> =
        await axios.get(`${this.apiBaseUrl}/users/${userId}/following`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener seguidos');
    }
  }

  public async blockUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/users/${userId}/block`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al bloquear usuario');
    }
  }

  public async unblockUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/users/${userId}/block`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al desbloquear usuario');
    }
  }

  public async getBlockedUsers(): Promise<User[]> {
    try {
      const response: AxiosResponse<ApiResponse<User[]>> =
        await axios.get(`${this.apiBaseUrl}/users/blocked`);

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
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/users/${userId}/report`, {
          reason,
          description
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reportar usuario');
    }
  }

  public async getSuggestedUsers(limit: number = 20): Promise<User[]> {
    try {
      const response: AxiosResponse<ApiResponse<User[]>> =
        await axios.get(`${this.apiBaseUrl}/users/suggested`, {
          params: { limit }
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
      const response: AxiosResponse<ApiResponse<User[]>> =
        await axios.get(`${this.apiBaseUrl}/users/nearby`, {
          params: { lat, lng, radius, limit }
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios cercanos');
    }
  }

  public async deleteAccount(password: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/users/account`, {
          data: { password }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar cuenta');
    }
  }
}

export const userService = UserService.getInstance();
export default userService;