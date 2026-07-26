'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import CommentService, { Comment } from '@/services/CommentService';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface CommentSectionProps {
  targetType: 'event' | 'post';
  targetId: string;
  currentUserId?: string;
  initialCommentsCount?: number;
  className?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  targetType,
  targetId,
  currentUserId,
  initialCommentsCount = 0,
  className = '',
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(initialCommentsCount);
  const [showComments, setShowComments] = useState(false);

  const loadComments = useCallback(async (pageNum: number = 1) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await CommentService.getComments(
        targetType,
        targetId,
        pageNum,
        10
      );

      if (response.success) {
        if (pageNum === 1) {
          setComments(response.data);
        } else {
          setComments((prev) => [...prev, ...response.data]);
        }

        if (response.pagination) {
          setTotalComments(response.pagination.total);
          setHasMore(pageNum < response.pagination.pages);
        }
      }
    } catch (err: any) {
      console.error('Error loading comments:', err);
      setError(err.message || 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [targetType, targetId, isLoading]);

  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments(1);
    }
  }, [showComments, comments.length, loadComments]);

  const handleCreateComment = async (content: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await CommentService.createComment({
        targetType,
        targetId,
        content,
      });

      if (response.success) {
        // Add new comment to the top of the list
        setComments((prev) => [response.data, ...prev]);
        setTotalComments((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error('Error creating comment:', err);
      setError(err.message || 'Failed to post comment');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    setError(null);

    try {
      const response = await CommentService.createComment({
        targetType,
        targetId,
        content,
        parentId,
      });

      if (response.success) {
        // Find the parent comment and add the reply
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === parentId
              ? {
                  ...comment,
                  replies: Array.isArray(comment.replies)
                    ? [...comment.replies, response.data]
                    : [response.data],
                  repliesCount: comment.repliesCount + 1,
                }
              : comment
          )
        );
        setTotalComments((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error('Error replying to comment:', err);
      setError(err.message || 'Failed to post reply');
      throw err;
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    setError(null);

    try {
      const response = await CommentService.updateComment(commentId, { content });

      if (response.success) {
        // Update the comment in the list
        const updateComment = (comment: Comment): Comment => {
          if (comment._id === commentId) {
            return { ...comment, content, isEdited: true };
          }
          if (Array.isArray(comment.replies)) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                typeof reply === 'string' ? reply : updateComment(reply)
              ),
            };
          }
          return comment;
        };

        setComments((prev) => prev.map(updateComment));
      }
    } catch (err: any) {
      console.error('Error editing comment:', err);
      setError(err.message || 'Failed to edit comment');
      throw err;
    }
  };

  const handleDelete = async (commentId: string) => {
    setError(null);

    try {
      const response = await CommentService.deleteComment(commentId);

      if (response.success) {
        // Remove the comment from the list
        const removeComment = (comments: Comment[]): Comment[] => {
          return comments
            .filter((comment) => comment._id !== commentId)
            .map((comment) => ({
              ...comment,
              replies: Array.isArray(comment.replies)
                ? removeComment(
                    comment.replies.filter((r) => typeof r !== 'string') as Comment[]
                  )
                : comment.replies,
            }));
        };

        setComments(removeComment(comments));
        setTotalComments((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setError(err.message || 'Failed to delete comment');
      throw err;
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await CommentService.toggleLike(commentId);
      // The like state is managed locally in CommentItem
    } catch (err: any) {
      console.error('Error liking comment:', err);
      setError(err.message || 'Failed to like comment');
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadComments(nextPage);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">
            {totalComments} {totalComments === 1 ? 'Comment' : 'Comments'}
          </span>
        </button>
      </div>

      {/* Comments content */}
      {showComments && (
        <div className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Comment form */}
          {currentUserId ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <CommentForm
                onSubmit={handleCreateComment}
                isSubmitting={isSubmitting}
                placeholder="Write a comment..."
                submitLabel="Post"
                showCancel={false}
              />
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Please log in to comment
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-4">
            {isLoading && comments.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : comments.length > 0 ? (
              <>
                {comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLike={handleLike}
                  />
                ))}

                {/* Load more button */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      className="px-6 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load more comments'
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
