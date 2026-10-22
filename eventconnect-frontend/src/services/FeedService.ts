import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { FeedPost, PostAttachment, PostReaction, FeedComment, ApiResponse, PaginatedResponse } from '../types/api.types';

export interface CreatePostData {
  content: string;
  attachments?: File[];
  event?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  mentions?: string[];
  hashtags?: string[];
}

export interface UpdatePostData {
  content?: string;
  attachments?: File[];
  mentions?: string[];
  hashtags?: string[];
}

export interface FeedFilters {
  page?: number;
  limit?: number;
  userId?: string;
  hashtag?: string;
  onlyFollowing?: boolean;
}

class FeedService {
  private static instance: FeedService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): FeedService {
    if (!FeedService.instance) {
      FeedService.instance = new FeedService();
    }
    return FeedService.instance;
  }

  public async getFeed(filters: FeedFilters = {}): Promise<PaginatedResponse<FeedPost>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<FeedPost>> =
        await axios.get(`${this.apiBaseUrl}/feed?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener feed');
    }
  }

  public async getPostById(postId: string): Promise<FeedPost> {
    try {
      const response: AxiosResponse<ApiResponse<FeedPost>> =
        await axios.get(`${this.apiBaseUrl}/feed/posts/${postId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Post no encontrado');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener post');
    }
  }

  public async createPost(postData: CreatePostData): Promise<ApiResponse<FeedPost>> {
    try {
      const formData = new FormData();

      // Add text fields
      formData.append('content', postData.content);

      if (postData.event) {
        formData.append('event', postData.event);
      }

      if (postData.location) {
        formData.append('location', JSON.stringify(postData.location));
      }

      if (postData.mentions && postData.mentions.length > 0) {
        formData.append('mentions', JSON.stringify(postData.mentions));
      }

      if (postData.hashtags && postData.hashtags.length > 0) {
        formData.append('hashtags', JSON.stringify(postData.hashtags));
      }

      // Add attachments
      if (postData.attachments && postData.attachments.length > 0) {
        postData.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response: AxiosResponse<ApiResponse<FeedPost>> =
        await axios.post(`${this.apiBaseUrl}/feed/posts`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear post');
    }
  }

  public async updatePost(postId: string, postData: UpdatePostData): Promise<ApiResponse<FeedPost>> {
    try {
      const formData = new FormData();

      if (postData.content) {
        formData.append('content', postData.content);
      }

      if (postData.mentions) {
        formData.append('mentions', JSON.stringify(postData.mentions));
      }

      if (postData.hashtags) {
        formData.append('hashtags', JSON.stringify(postData.hashtags));
      }

      if (postData.attachments && postData.attachments.length > 0) {
        postData.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response: AxiosResponse<ApiResponse<FeedPost>> =
        await axios.put(`${this.apiBaseUrl}/feed/posts/${postId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar post');
    }
  }

  public async deletePost(postId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/feed/posts/${postId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar post');
    }
  }

  public async likePost(postId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/feed/posts/${postId}/like`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dar like');
    }
  }

  public async unlikePost(postId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/feed/posts/${postId}/like`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al quitar like');
    }
  }

  public async reactToPost(postId: string, reactionType: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/feed/posts/${postId}/react`, { type: reactionType });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reaccionar');
    }
  }

  public async sharePost(postId: string, message?: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/feed/posts/${postId}/share`, { message });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al compartir post');
    }
  }

  public async getPostComments(postId: string): Promise<FeedComment[]> {
    try {
      const response: AxiosResponse<ApiResponse<FeedComment[]>> =
        await axios.get(`${this.apiBaseUrl}/feed/posts/${postId}/comments`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener comentarios');
    }
  }

  public async addComment(postId: string, content: string, mentions?: string[]): Promise<ApiResponse<FeedComment>> {
    try {
      const response: AxiosResponse<ApiResponse<FeedComment>> =
        await axios.post(`${this.apiBaseUrl}/feed/posts/${postId}/comments`, { content, mentions });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar comentario');
    }
  }

  public async updateComment(postId: string, commentId: string, content: string): Promise<ApiResponse<FeedComment>> {
    try {
      const response: AxiosResponse<ApiResponse<FeedComment>> =
        await axios.put(`${this.apiBaseUrl}/feed/posts/${postId}/comments/${commentId}`, { content });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar comentario');
    }
  }

  public async deleteComment(postId: string, commentId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/feed/posts/${postId}/comments/${commentId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar comentario');
    }
  }

  public async likeComment(postId: string, commentId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/feed/posts/${postId}/comments/${commentId}/like`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dar like al comentario');
    }
  }

  public async getUserPosts(userId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<FeedPost>> {
    try {
      const response: AxiosResponse<PaginatedResponse<FeedPost>> =
        await axios.get(`${this.apiBaseUrl}/feed/users/${userId}/posts`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener posts del usuario');
    }
  }

  public async getHashtagPosts(hashtag: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<FeedPost>> {
    try {
      const response: AxiosResponse<PaginatedResponse<FeedPost>> =
        await axios.get(`${this.apiBaseUrl}/feed/hashtags/${hashtag}`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener posts del hashtag');
    }
  }

  public async getTrendingHashtags(limit: number = 10): Promise<string[]> {
    try {
      const response: AxiosResponse<ApiResponse<string[]>> =
        await axios.get(`${this.apiBaseUrl}/feed/hashtags/trending`, {
          params: { limit }
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener hashtags trending');
    }
  }
}

export const feedService = FeedService.getInstance();
export default feedService;