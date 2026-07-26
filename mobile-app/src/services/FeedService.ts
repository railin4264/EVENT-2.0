import { apiClient } from './apiClient';

export interface FeedPost {
  id: string;
  type: 'event_share' | 'connection' | 'tribe_join' | 'event_review' | 'networking' | 'general' | 'achievement';
  user: {
    name: string;
    avatar: string;
    verified: boolean;
    title?: string;
  };
  content: string;
  image?: string;
  eventData?: {
    _id?: string;
    name: string;
    location: string;
    date: string;
    attendees: number;
  };
  tribeData?: {
    name: string;
    memberCount: number;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: string;
  liked: boolean;
  bookmarked: boolean;
  isPinned: boolean;
  isSponsored: boolean;
}

export interface FeedFilters {
  type?: 'todos' | 'trending' | 'conexiones' | 'tribus' | 'eventos';
  page?: number;
  limit?: number;
}

export interface FeedResponse {
  success: boolean;
  count: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: FeedPost[];
}

export interface CreatePostData {
  content: string;
  type?: string;
  images?: Array<{ url: string; publicId?: string }>;
  eventId?: string;
  tribeId?: string;
  visibility?: 'public' | 'friends' | 'tribe' | 'private';
  tags?: string[];
  location?: {
    address: string;
    coordinates: [number, number];
  };
}

export interface CommentData {
  text: string;
}

class FeedService {
  private static instance: FeedService;

  private constructor() {}

  public static getInstance(): FeedService {
    if (!FeedService.instance) {
      FeedService.instance = new FeedService();
    }
    return FeedService.instance;
  }

  /**
   * Obtener posts del feed
   */
  public async getFeedPosts(filters: FeedFilters = {}): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.type && filters.type !== 'todos') {
        params.append('type', filters.type);
      }
      
      if (filters.page) {
        params.append('page', filters.page.toString());
      }
      
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }

      const response = await apiClient.get(`/feed?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener feed');
    }
  }

  /**
   * Crear nuevo post
   */
  public async createPost(postData: CreatePostData): Promise<{ success: boolean; message: string; data: FeedPost }> {
    try {
      const response = await apiClient.post('/feed', postData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear post');
    }
  }

  /**
   * Dar like/unlike a un post
   */
  public async toggleLike(postId: string): Promise<{ success: boolean; message: string; data: { likesCount: number; isLiked: boolean } }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dar like');
    }
  }

  /**
   * Comentar en un post
   */
  public async addComment(postId: string, commentData: CommentData): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/comment`, commentData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al comentar');
    }
  }

  /**
   * Compartir un post
   */
  public async toggleShare(postId: string): Promise<{ success: boolean; message: string; data: { sharesCount: number; isShared: boolean } }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/share`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al compartir');
    }
  }

  /**
   * Obtener posts trending/populares
   */
  public async getTrendingPosts(limit: number = 10): Promise<FeedPost[]> {
    try {
      const response = await this.getFeedPosts({ type: 'trending', limit });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener posts trending');
    }
  }

  /**
   * Buscar posts
   */
  public async searchPosts(query: string, filters: Omit<FeedFilters, 'type'> = {}): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams({ search: query });
      
      if (filters.page) {
        params.append('page', filters.page.toString());
      }
      
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }

      const response = await apiClient.get(`/feed/search?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al buscar posts');
    }
  }

  /**
   * Obtener posts de un usuario específico
   */
  public async getUserPosts(userId: string, page: number = 1, limit: number = 20): Promise<FeedResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await apiClient.get(`/feed/user/${userId}?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener posts del usuario');
    }
  }

  /**
   * Reportar un post
   */
  public async reportPost(postId: string, reason: string, description?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/report`, {
        reason,
        description
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reportar post');
    }
  }

  /**
   * Obtener comentarios de un post
   */
  public async getPostComments(postId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await apiClient.get(`/feed/${postId}/comments?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener comentarios');
    }
  }

  /**
   * Eliminar un post (solo el autor)
   */
  public async deletePost(postId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`/feed/${postId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar post');
    }
  }

  /**
   * Editar un post (solo el autor)
   */
  public async editPost(postId: string, content: string): Promise<{ success: boolean; message: string; data: FeedPost }> {
    try {
      const response = await apiClient.put(`/feed/${postId}`, { content });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al editar post');
    }
  }

  /**
   * Obtener un post por ID
   */
  public async getPostById(postId: string): Promise<FeedPost> {
    try {
      const response = await apiClient.get(`/feed/${postId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener post');
    }
  }

  /**
   * Dar like/unlike a un comentario
   */
  public async toggleCommentLike(postId: string, commentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/comments/${commentId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dar like al comentario');
    }
  }

  /**
   * Compartir un post
   */
  public async sharePost(postId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/share`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al compartir post');
    }
  }

  /**
   * Dar like a un post
   */
  public async likePost(postId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dar like');
    }
  }

  /**
   * Comentar en un post
   */
  public async commentOnPost(postId: string, content: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/comment`, { text: content });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al comentar');
    }
  }

  /**
   * Reaccionar a un post
   */
  public async reactToPost(postId: string, emoji: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`/feed/${postId}/react`, { emoji });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reaccionar');
    }
  }
}

export const feedService = FeedService.getInstance();
export default feedService;
