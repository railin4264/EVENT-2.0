import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { Tribe, TribeMember, ApiResponse, PaginatedResponse, Event } from '../types/api.types';

export interface CreateTribeData {
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  avatar?: File;
  cover?: File;
  rules?: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
}

export interface UpdateTribeData {
  name?: string;
  description?: string;
  category?: string;
  isPrivate?: boolean;
  avatar?: File;
  cover?: File;
  rules?: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
}

export interface TribeFilters {
  category?: string;
  search?: string;
  isPrivate?: boolean;
  page?: number;
  limit?: number;
}

class TribeService {
  private static instance: TribeService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): TribeService {
    if (!TribeService.instance) {
      TribeService.instance = new TribeService();
    }
    return TribeService.instance;
  }

  public async getTribes(filters: TribeFilters = {}): Promise<PaginatedResponse<Tribe>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<Tribe>> =
        await axios.get(`${this.apiBaseUrl}/tribes?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tribus');
    }
  }

  public async getTribeById(tribeId: string): Promise<Tribe> {
    try {
      const response: AxiosResponse<ApiResponse<Tribe>> =
        await axios.get(`${this.apiBaseUrl}/tribes/${tribeId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Tribu no encontrada');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tribu');
    }
  }

  public async createTribe(tribeData: CreateTribeData): Promise<ApiResponse<Tribe>> {
    try {
      const formData = new FormData();

      formData.append('name', tribeData.name);
      formData.append('description', tribeData.description);
      formData.append('category', tribeData.category);
      formData.append('isPrivate', tribeData.isPrivate.toString());

      if (tribeData.avatar) {
        formData.append('avatar', tribeData.avatar);
      }

      if (tribeData.cover) {
        formData.append('cover', tribeData.cover);
      }

      if (tribeData.rules && tribeData.rules.length > 0) {
        formData.append('rules', JSON.stringify(tribeData.rules));
      }

      if (tribeData.location) {
        formData.append('location', JSON.stringify(tribeData.location));
      }

      const response: AxiosResponse<ApiResponse<Tribe>> =
        await axios.post(`${this.apiBaseUrl}/tribes`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear tribu');
    }
  }

  public async updateTribe(tribeId: string, tribeData: UpdateTribeData): Promise<ApiResponse<Tribe>> {
    try {
      const formData = new FormData();

      Object.entries(tribeData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'avatar' || key === 'cover') {
            formData.append(key, value);
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response: AxiosResponse<ApiResponse<Tribe>> =
        await axios.put(`${this.apiBaseUrl}/tribes/${tribeId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar tribu');
    }
  }

  public async deleteTribe(tribeId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/tribes/${tribeId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar tribu');
    }
  }

  public async joinTribe(tribeId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/tribes/${tribeId}/join`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al unirse a la tribu');
    }
  }

  public async leaveTribe(tribeId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/tribes/${tribeId}/leave`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al abandonar tribu');
    }
  }

  public async getTribeMembers(tribeId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<TribeMember>> {
    try {
      const response: AxiosResponse<PaginatedResponse<TribeMember>> =
        await axios.get(`${this.apiBaseUrl}/tribes/${tribeId}/members`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener miembros');
    }
  }

  public async removeMember(tribeId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/tribes/${tribeId}/members/${userId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar miembro');
    }
  }

  public async updateMemberRole(tribeId: string, userId: string, role: 'member' | 'moderator' | 'admin'): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.put(`${this.apiBaseUrl}/tribes/${tribeId}/members/${userId}/role`, { role });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar rol');
    }
  }

  public async getTribeEvents(tribeId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Event>> {
    try {
      const response: AxiosResponse<PaginatedResponse<Event>> =
        await axios.get(`${this.apiBaseUrl}/tribes/${tribeId}/events`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos de la tribu');
    }
  }

  public async getUserTribes(userId?: string): Promise<Tribe[]> {
    try {
      const url = userId
        ? `${this.apiBaseUrl}/tribes/user/${userId}`
        : `${this.apiBaseUrl}/tribes/my-tribes`;

      const response: AxiosResponse<ApiResponse<Tribe[]>> = await axios.get(url);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tribus del usuario');
    }
  }

  public async searchTribes(query: string, filters: Omit<TribeFilters, 'search'> = {}): Promise<PaginatedResponse<Tribe>> {
    try {
      const params = new URLSearchParams({ search: query });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<Tribe>> =
        await axios.get(`${this.apiBaseUrl}/tribes/search?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al buscar tribus');
    }
  }

  public async getSuggestedTribes(limit: number = 10): Promise<Tribe[]> {
    try {
      const response: AxiosResponse<ApiResponse<Tribe[]>> =
        await axios.get(`${this.apiBaseUrl}/tribes/suggested`, {
          params: { limit }
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tribus sugeridas');
    }
  }
}

export const tribeService = TribeService.getInstance();
export default tribeService;