import React, { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/redesign/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/redesign/ui/dropdown-menu';
import { LikeButton } from './LikeButton';
import { likesApi } from '@/lib/api/likesApi';

interface CommentItemProps {
  comment: {
    _id: string;
    content: string;
    author: {
      _id: string;
      firstName: string;
      lastName: string;
      username: string;
      avatar?: string;
    };
    likesCount?: number;
    isLiked?: boolean;
    createdAt: string;
  };
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
  onReply?: (commentId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onDelete,
  onReply
}) => {
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);

  const handleLike = async () => {
    try {
      const result = await likesApi.toggleCommentLike(comment._id);
      setLikesCount(result.data.likesCount);
      setIsLiked(result.data.liked);
    } catch (error) {
      console.error('Error toggling comment like:', error);
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

  const isOwner = currentUserId === comment.author._id;

  return (
    <div className="flex gap-3 py-3">
      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage
          src={comment.author.avatar}
          alt={`${comment.author.firstName} ${comment.author.lastName}`}
        />
        <AvatarFallback>
          {getInitials(comment.author.firstName, comment.author.lastName)}
        </AvatarFallback>
      </Avatar>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">
              {comment.author.firstName} {comment.author.lastName}
            </p>
            <span className="text-xs text-muted-foreground">
              {getTimeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground/90 break-words">
            {comment.content}
          </p>
        </div>

        {/* Comment Actions */}
        <div className="flex items-center gap-4 mt-2 px-2">
          {/* Like Button */}
          <LikeButton
            isLiked={isLiked}
            likesCount={likesCount}
            onLike={handleLike}
            size="sm"
            showCount={true}
          />

          {/* Reply Button */}
          {onReply && (
            <button
              onClick={() => onReply(comment._id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Responder
            </button>
          )}

          {/* More Actions */}
          {isOwner && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Más opciones"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onDelete(comment._id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};
