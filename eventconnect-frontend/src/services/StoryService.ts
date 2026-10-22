import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { Story, StoryContent, StoryViewer, ApiResponse } from '../types/api.types';

export interface CreateStoryData {
  content: StoryContent[];
  isHighlight?: boolean;
  highlightTitle?: string;
}

export interface StoryStats {
  views: number;
  reactions: Record<string, number>;
  shares: number;
}

class StoryService {
  private static instance: StoryService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): StoryService {
    if (!StoryService.instance) {
      StoryService.instance = new StoryService();
    }
    return StoryService.instance;
  }

  public async getStories(): Promise<Story[]> {
    try {
      const response: AxiosResponse<ApiResponse<Story[]>> =
        await axios.get(`${this.apiBaseUrl}/stories`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener stories');
    }
  }

  public async getStoryById(storyId: string): Promise<Story> {
    try {
      const response: AxiosResponse<ApiResponse<Story>> =
        await axios.get(`${this.apiBaseUrl}/stories/${storyId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Story no encontrada');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener story');
    }
  }

  public async getUserStories(userId: string): Promise<Story[]> {
    try {
      const response: AxiosResponse<ApiResponse<Story[]>> =
        await axios.get(`${this.apiBaseUrl}/stories/user/${userId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener stories del usuario');
    }
  }

  public async createStory(files: File[], options?: { isHighlight?: boolean; highlightTitle?: string }): Promise<ApiResponse<Story>> {
    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append('content', file);
      });

      if (options?.isHighlight !== undefined) {
        formData.append('isHighlight', options.isHighlight.toString());
      }

      if (options?.highlightTitle) {
        formData.append('highlightTitle', options.highlightTitle);
      }

      const response: AxiosResponse<ApiResponse<Story>> =
        await axios.post(`${this.apiBaseUrl}/stories`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear story');
    }
  }

  public async deleteStory(storyId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/stories/${storyId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar story');
    }
  }

  public async viewStory(storyId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/stories/${storyId}/view`);

      return response.data;
    } catch (error: any) {
      // Non-critical, don't throw
      console.warn('Error tracking story view:', error);
      return { success: false };
    }
  }

  public async reactToStory(storyId: string, emoji: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/stories/${storyId}/react`, { emoji });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reaccionar a story');
    }
  }

  public async getStoryViewers(storyId: string): Promise<StoryViewer[]> {
    try {
      const response: AxiosResponse<ApiResponse<StoryViewer[]>> =
        await axios.get(`${this.apiBaseUrl}/stories/${storyId}/viewers`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener viewers');
    }
  }

  public async getStoryStats(storyId: string): Promise<StoryStats> {
    try {
      const response: AxiosResponse<ApiResponse<StoryStats>> =
        await axios.get(`${this.apiBaseUrl}/stories/${storyId}/stats`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { views: 0, reactions: {}, shares: 0 };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener estadísticas');
    }
  }

  public async getHighlights(userId: string): Promise<Story[]> {
    try {
      const response: AxiosResponse<ApiResponse<Story[]>> =
        await axios.get(`${this.apiBaseUrl}/stories/user/${userId}/highlights`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener highlights');
    }
  }

  public async addToHighlights(storyId: string, title: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/stories/${storyId}/highlight`, { title });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar a highlights');
    }
  }

  public async removeFromHighlights(storyId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/stories/${storyId}/highlight`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al quitar de highlights');
    }
  }
}

export const storyService = StoryService.getInstance();
export default storyService;