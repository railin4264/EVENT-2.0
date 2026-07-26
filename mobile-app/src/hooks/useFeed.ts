import { useState, useEffect, useCallback } from 'react';
import { feedService, FeedPost, FeedFilters } from '@/services/FeedService';

interface FeedResponse {
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
import { useAuth } from '@/contexts/AuthContext';

interface UseFeedState {
  posts: FeedPost[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

interface UseFeedActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
  createPost: (content: string, type?: string, eventId?: string, tribeId?: string) => Promise<void>;
  setFilter: (filter: FeedFilters['type']) => void;
}

export function useFeed(initialFilters: FeedFilters = {}): UseFeedState & UseFeedActions {
  const { user } = useAuth();
  const [state, setState] = useState<UseFeedState>({
    posts: [],
    loading: true,
    refreshing: false,
    loadingMore: false,
    error: null,
    hasMore: true,
    currentPage: 1,
    totalPages: 1,
  });
  
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);

  // Función para cargar posts
  const loadPosts = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        setState(prev => ({ 
          ...prev, 
          loading: !isRefresh, 
          refreshing: isRefresh,
          error: null 
        }));
      } else {
        setState(prev => ({ ...prev, loadingMore: true, error: null }));
      }

      const response: FeedResponse = await feedService.getFeedPosts({
        ...filters,
        page,
        limit: 20
      });

      setState(prev => ({
        ...prev,
        posts: page === 1 ? response.data : [...prev.posts, ...response.data],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: page < response.pagination.pages,
        currentPage: page,
        totalPages: response.pagination.pages,
        error: null
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: error.message || 'Error al cargar posts'
      }));
    }
  }, [filters]);

  // Cargar posts inicial
  useEffect(() => {
    loadPosts(1);
  }, [loadPosts]);

  // Función para refrescar
  const refresh = useCallback(async () => {
    await loadPosts(1, true);
  }, [loadPosts]);

  // Función para cargar más
  const loadMore = useCallback(async () => {
    if (!state.loadingMore && state.hasMore && state.currentPage < state.totalPages) {
      await loadPosts(state.currentPage + 1);
    }
  }, [loadPosts, state.loadingMore, state.hasMore, state.currentPage, state.totalPages]);

  // Función para toggle like
  const toggleLike = useCallback(async (postId: string) => {
    try {
      const response = await feedService.toggleLike(postId);
      
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.id === postId 
            ? {
                ...post,
                liked: response.data.isLiked,
                stats: {
                  ...post.stats,
                  likes: response.data.likesCount
                }
              }
            : post
        )
      }));
    } catch (error: any) {
      console.error('Error al dar like:', error.message);
    }
  }, []);

  // Función para agregar comentario
  const addComment = useCallback(async (postId: string, text: string) => {
    try {
      const response = await feedService.addComment(postId, { text });
      
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.id === postId 
            ? {
                ...post,
                stats: {
                  ...post.stats,
                  comments: response.data.commentsCount
                }
              }
            : post
        )
      }));
    } catch (error: any) {
      console.error('Error al comentar:', error.message);
      throw error;
    }
  }, []);

  // Función para compartir post
  const sharePost = useCallback(async (postId: string) => {
    try {
      const response = await feedService.toggleShare(postId);
      
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.id === postId 
            ? {
                ...post,
                stats: {
                  ...post.stats,
                  shares: response.data.sharesCount
                }
              }
            : post
        )
      }));
    } catch (error: any) {
      console.error('Error al compartir:', error.message);
    }
  }, []);

  // Función para crear post
  const createPost = useCallback(async (
    content: string, 
    type?: string, 
    eventId?: string, 
    tribeId?: string
  ) => {
    try {
      const response = await feedService.createPost({
        content,
        type,
        eventId,
        tribeId,
        visibility: 'public'
      });

      // Agregar el nuevo post al principio de la lista
      setState(prev => ({
        ...prev,
        posts: [response.data, ...prev.posts]
      }));
    } catch (error: any) {
      console.error('Error al crear post:', error.message);
      throw error;
    }
  }, []);

  // Función para cambiar filtro
  const setFilter = useCallback((filter: FeedFilters['type']) => {
    setFilters(prev => ({ ...prev, type: filter }));
  }, []);

  return {
    // State
    ...state,
    // Actions
    refresh,
    loadMore,
    toggleLike,
    addComment,
    sharePost,
    createPost,
    setFilter,
  };
}

export default useFeed;
