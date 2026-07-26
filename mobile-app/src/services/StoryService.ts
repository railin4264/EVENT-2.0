import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types';

import type { Story } from '@/types';

class StoryService {
  private static instance: StoryService;

  private constructor() {}

  public static getInstance(): StoryService {
    if (!StoryService.instance) {
      StoryService.instance = new StoryService();
    }
    return StoryService.instance;
  }

  public async getStories(): Promise<Story[]> {
    try {
      const response = await apiClient.get('/stories');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener stories');
    }
  }

  public async getUserStories(userId: string): Promise<Story[]> {
    try {
      const response = await apiClient.get(`/stories/user/${userId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener stories del usuario');
    }
  }

  public async createStory(
    media: Array<{ uri: string; type: string; name: string }>,
    content?: string,
    isHighlight?: boolean,
    highlightTitle?: string
  ): Promise<ApiResponse<Story>> {
    try {
      const formData = new FormData();

      media.forEach((item) => {
        formData.append('media', {
          uri: item.uri,
          type: item.type,
          name: item.name,
        } as any);
      });

      if (content) {
        formData.append('content', content);
      }

      if (isHighlight !== undefined) {
        formData.append('isHighlight', isHighlight.toString());
      }

      if (highlightTitle) {
        formData.append('highlightTitle', highlightTitle);
      }

      const response = await apiClient.post('/stories', formData, {
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
      const response = await apiClient.delete(`/stories/${storyId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar story');
    }
  }

  public async viewStory(storyId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/stories/${storyId}/view`);
      return response.data;
    } catch (error: any) {
      console.warn('Error tracking story view:', error);
      return { success: false };
    }
  }

  public async reactToStory(storyId: string, emoji: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/stories/${storyId}/react`, { emoji });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reaccionar a story');
    }
  }

  public async getHighlights(userId: string): Promise<Story[]> {
    try {
      const response = await apiClient.get(`/stories/user/${userId}/highlights`);
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
      const response = await apiClient.post(`/stories/${storyId}/highlight`, { title });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar a highlights');
    }
  }
}

export const storyService = StoryService.getInstance();
export default storyService;