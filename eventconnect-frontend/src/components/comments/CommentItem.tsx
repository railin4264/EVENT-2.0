'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Reply, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { Comment } from '@/services/CommentService';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onReply?: (commentId: string, content: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onLike?: (commentId: string) => Promise<void>;
  isNested?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  isNested = false,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(
    comment.likes.includes(currentUserId || '')
  );
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthor = currentUserId === comment.author._id;

  const handleLike = async () => {
    if (!onLike) return;

    try {
      await onLike(comment._id);
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReply = async (content: string) => {
    if (!onReply) return;

    setIsSubmitting(true);
    try {
      await onReply(comment._id, content);
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error replying to comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (content: string) => {
    if (!onEdit) return;

    setIsSubmitting(true);
    try {
      await onEdit(comment._id, content);
      setShowEditForm(false);
    } catch (error) {
      console.error('Error editing comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm('Are you sure you want to delete this comment?')) return;

    try {
      await onDelete(comment._id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const getAuthorName = () => {
    const { firstName, lastName, username } = comment.author;
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username;
  };

  if (comment.isDeleted) {
    return (
      <div className={`flex gap-3 ${isNested ? 'ml-12' : ''} opacity-60`}>
        <div className="flex-1 text-sm text-gray-500 italic">
          This comment has been deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isNested ? 'ml-12' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.author.avatar ? (
          <img
            src={comment.author.avatar}
            alt={getAuthorName()}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm">
            {getAuthorName().charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {getAuthorName()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                {comment.isEdited && ' (edited)'}
              </span>
            </div>

            {/* Menu */}
            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                    <button
                      onClick={() => {
                        setShowEditForm(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comment Content */}
          {showEditForm ? (
            <CommentForm
              initialValue={comment.content}
              onSubmit={handleEdit}
              onCancel={() => setShowEditForm(false)}
              isSubmitting={isSubmitting}
              placeholder="Edit your comment..."
              submitLabel="Save"
            />
          ) : (
            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}
        </div>

        {/* Actions */}
        {!showEditForm && (
          <div className="flex items-center gap-4 mt-1.5 px-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                isLiked
                  ? 'text-red-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-red-500'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            {!isNested && onReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}

            {comment.repliesCount > 0 && !isNested && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        )}

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              onSubmit={handleReply}
              onCancel={() => setShowReplyForm(false)}
              isSubmitting={isSubmitting}
              placeholder="Write a reply..."
              submitLabel="Reply"
            />
          </div>
        )}

        {/* Nested Replies */}
        {!isNested && Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={typeof reply === 'string' ? reply : reply._id}
                comment={typeof reply === 'string' ? comment : reply}
                currentUserId={currentUserId}
                onEdit={onEdit}
                onDelete={onDelete}
                onLike={onLike}
                isNested={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
