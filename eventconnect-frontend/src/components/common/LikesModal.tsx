import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/redesign/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/redesign/ui/avatar';
import { Badge } from '@/components/redesign/ui/badge';
import { ScrollArea } from '@/components/redesign/ui/scroll-area';
import { Heart, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Like {
  user: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    verified?: boolean;
    bio?: string;
  };
  createdAt: string;
}

interface LikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'post' | 'event' | 'comment';
  apiBaseUrl: string;
}

export const LikesModal: React.FC<LikesModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  apiBaseUrl
}) => {
  const [likes, setLikes] = useState<Like[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && targetId) {
      fetchLikes();
    }
  }, [isOpen, targetId]);

  const fetchLikes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let endpoint = '';
      if (targetType === 'post') {
        endpoint = `${apiBaseUrl}/api/feed/${targetId}/likes`;
      } else if (targetType === 'event') {
        endpoint = `${apiBaseUrl}/api/events/${targetId}/likes`;
      } else if (targetType === 'comment') {
        endpoint = `${apiBaseUrl}/api/comments/${targetId}/likes`;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch likes');
      }

      const result = await response.json();
      setLikes(result.data || []);
    } catch (err) {
      console.error('Error fetching likes:', err);
      setError('Failed to load likes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            Likes ({likes.length})
          </DialogTitle>
          <DialogDescription>
            People who liked this {targetType}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {error}
          </div>
        ) : likes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No likes yet. Be the first to like!
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {likes.map((like) => (
                <div
                  key={like.user._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={like.user.avatar}
                        alt={`${like.user.firstName} ${like.user.lastName}`}
                      />
                      <AvatarFallback>
                        {getInitials(like.user.firstName, like.user.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">
                          {like.user.firstName} {like.user.lastName}
                        </p>
                        {like.user.verified && (
                          <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{like.user.username}
                      </p>
                      {like.user.bio && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {like.user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {formatDistanceToNow(new Date(like.createdAt), { addSuffix: true })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
