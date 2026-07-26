'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  getFeedPosts,
  createPost,
  togglePostLike,
  addPostComment,
  sharePost,
  deletePost,
  type FeedPost,
  type CreatePostData,
  type PostFilters,
  type CommentData
} from '@/lib/api/feed'

interface FeedState {
  posts: FeedPost[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  } | null
  currentFilter: PostFilters
  
  // Actions
  fetchPosts: (filters?: PostFilters) => Promise<void>
  createPostAction: (postData: CreatePostData) => Promise<FeedPost>
  toggleLike: (postId: string) => Promise<void>
  addComment: (postId: string, comment: CommentData) => Promise<void>
  sharePostAction: (postId: string, content?: string) => Promise<void>
  deletePostAction: (postId: string) => Promise<void>
  setFilter: (filter: PostFilters) => void
  clearError: () => void
  optimisticallyUpdatePost: (postId: string, updates: Partial<FeedPost>) => void
}

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      posts: [],
      isLoading: false,
      error: null,
      pagination: null,
      currentFilter: { type: 'todos', page: 1, limit: 10 },

      fetchPosts: async (filters: PostFilters = {}) => {
        try {
          set({ isLoading: true, error: null })
          
          const mergedFilters = { ...get().currentFilter, ...filters }
          
          const response = await getFeedPosts(mergedFilters)
          
          set({
            posts: response.data,
            pagination: response.pagination,
            currentFilter: mergedFilters,
            isLoading: false,
          })
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to fetch posts'
          set({
            error: message,
            isLoading: false,
          })
          throw error
        }
      },

      createPostAction: async (postData: CreatePostData) => {
        try {
          set({ error: null })
          
          const response = await createPost(postData)
          
          // Add the new post to the beginning of the list
          set((state) => ({
            posts: [response.data, ...state.posts],
          }))
          
          return response.data
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to create post'
          set({ error: message })
          throw error
        }
      },

      toggleLike: async (postId: string) => {
        try {
          // Optimistic update
          set((state) => ({
            posts: state.posts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    liked: !post.liked, 
                    stats: { 
                      ...post.stats, 
                      likes: post.liked ? post.stats.likes - 1 : post.stats.likes + 1 
                    }
                  }
                : post
            ),
          }))

          const response = await togglePostLike(postId)
          
          // Update with actual data from server
          set((state) => ({
            posts: state.posts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    liked: response.liked, 
                    stats: { 
                      ...post.stats, 
                      likes: response.likesCount 
                    }
                  }
                : post
            ),
          }))
        } catch (error: any) {
          // Revert optimistic update on error
          set((state) => ({
            posts: state.posts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    liked: !post.liked, 
                    stats: { 
                      ...post.stats, 
                      likes: post.liked ? post.stats.likes + 1 : post.stats.likes - 1 
                    }
                  }
                : post
            ),
          }))
          
          const message = error.response?.data?.message || 'Failed to toggle like'
          set({ error: message })
          throw error
        }
      },

      addComment: async (postId: string, comment: CommentData) => {
        try {
          const response = await addPostComment(postId, comment)
          
          // Update comments count
          set((state) => ({
            posts: state.posts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    stats: { 
                      ...post.stats, 
                      comments: response.commentsCount 
                    }
                  }
                : post
            ),
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to add comment'
          set({ error: message })
          throw error
        }
      },

      sharePostAction: async (postId: string, content?: string) => {
        try {
          const response = await sharePost(postId, content)
          
          // Update shares count
          set((state) => ({
            posts: state.posts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    stats: { 
                      ...post.stats, 
                      shares: response.sharesCount 
                    }
                  }
                : post
            ),
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to share post'
          set({ error: message })
          throw error
        }
      },

      deletePostAction: async (postId: string) => {
        try {
          await deletePost(postId)
          
          // Remove post from list
          set((state) => ({
            posts: state.posts.filter(post => post.id !== postId),
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to delete post'
          set({ error: message })
          throw error
        }
      },

      setFilter: (filter: PostFilters) => {
        set((state) => ({
          currentFilter: { ...state.currentFilter, ...filter },
        }))
      },

      clearError: () => {
        set({ error: null })
      },

      optimisticallyUpdatePost: (postId: string, updates: Partial<FeedPost>) => {
        set((state) => ({
          posts: state.posts.map(post => 
            post.id === postId ? { ...post, ...updates } : post
          ),
        }))
      },
    }),
    {
      name: 'feed-storage',
      partialize: (state) => ({
        currentFilter: state.currentFilter,
      }),
    }
  )
)