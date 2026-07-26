import React, { useState } from 'react';
import { MessageCircle, Share } from 'lucide-react';
import { Card } from '@/components/redesign/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/redesign/ui/avatar';
import { LikeButton } from './LikeButton';
import { LikesModal } from './LikesModal';
import { likesApi } from '@/lib/api/likesApi';
import { ImageWithFallback } from '@/components/redesign/figma/ImageWithFallback';
import { API_URL } from '@/lib/config';

interface PostCardProps {
  post: {
    _id: string;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      username: string;
      avatar?: string;
    };
    content: string;
    images?: Array<{ url: string }>;
    likesCount?: number;
    isLiked?: boolean;
    commentsCount?: number;
    sharesCount?: number;
    createdAt: string;
  };
  onCommentClick?: (postId: string) => void;
  onShareClick?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onCommentClick, onShareClick }) => {
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [showLikesModal, setShowLikesModal] = useState(false);

  const handleLike = async () => {
    try {
      const result = await likesApi.togglePostLike(post._id);
      setLikesCount(result.data.likesCount);
      setIsLiked(result.data.isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <>
      <Card className="glass-card overflow-hidden">
        {/* Post Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={post.user.avatar}
                alt={`${post.user.firstName} ${post.user.lastName}`}
              />
              <AvatarFallback>
                {getInitials(post.user.firstName, post.user.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="font-medium text-white">
                {post.user.firstName} {post.user.lastName}
              </p>
              <p className="text-sm text-white/60">
                @{post.user.username} • {getTimeAgo(post.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="px-6 pb-4">
          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        </div>

        {/* Post Image */}
        {post.images && post.images.length > 0 && (
          <div className="relative">
            <ImageWithFallback
              src={post.images[0].url}
              alt="Post image"
              className="w-full max-h-96 object-cover"
            />
          </div>
        )}

        {/* Post Actions */}
        <div className="p-6 pt-4">
          <div className="flex items-center gap-6">
            {/* Like Button */}
            <LikeButton
              isLiked={isLiked}
              likesCount={likesCount}
              onLike={handleLike}
              size="md"
            />

            {/* View Likes */}
            <button
              onClick={() => setShowLikesModal(true)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Ver likes
            </button>

            {/* Comments */}
            <button
              onClick={() => onCommentClick?.(post._id)}
              className="inline-flex items-center gap-1.5 transition-colors rounded-full px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            >
              <MessageCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {post.commentsCount || 0}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={() => onShareClick?.(post._id)}
              className="inline-flex items-center gap-1.5 transition-colors rounded-full px-3 py-1.5 hover:bg-green-50 dark:hover:bg-green-950/20"
            >
              <Share className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {post.sharesCount || 0}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Likes Modal */}
      <LikesModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        targetId={post._id}
        targetType="post"
        apiBaseUrl={API_URL}
      />
    </>
  );
};
