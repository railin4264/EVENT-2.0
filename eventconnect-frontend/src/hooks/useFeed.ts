import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { feedService, type FeedFilters, type CreatePostData, type UpdatePostData } from '@/services/FeedService';

export const feedKeys = {
  all: ['feed'] as const,
  lists: () => [...feedKeys.all, 'list'] as const,
  list: (filters: FeedFilters) => [...feedKeys.lists(), filters] as const,
  details: () => [...feedKeys.all, 'detail'] as const,
  detail: (id: string) => [...feedKeys.details(), id] as const,
  userPosts: (userId: string) => [...feedKeys.all, 'user', userId] as const,
  hashtag: (tag: string) => [...feedKeys.all, 'hashtag', tag] as const,
  comments: (postId: string) => [...feedKeys.detail(postId), 'comments'] as const,
};

export function useFeed(filters: FeedFilters = {}) {
  return useInfiniteQuery({
    queryKey: feedKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => feedService.getFeed({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: feedKeys.detail(postId),
    queryFn: () => feedService.getPostById(postId),
    enabled: !!postId,
  });
}

export function useUserPosts(userId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: feedKeys.userPosts(userId),
    queryFn: () => feedService.getUserPosts(userId, page, limit),
    enabled: !!userId,
  });
}

export function useHashtagPosts(hashtag: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: feedKeys.hashtag(hashtag),
    queryFn: () => feedService.getHashtagPosts(hashtag, page, limit),
    enabled: !!hashtag,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostData) => feedService.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: UpdatePostData }) =>
      feedService.updatePost(postId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.detail(variables.postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => feedService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => feedService.likePost(postId),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.detail(postId) });
    },
  });
}

export function useSharePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, message }: { postId: string; message?: string }) =>
      feedService.sharePost(postId, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.detail(variables.postId) });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content, mentions }: { postId: string; content: string; mentions?: string[] }) =>
      feedService.addComment(postId, content, mentions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.detail(variables.postId) });
    },
  });
}