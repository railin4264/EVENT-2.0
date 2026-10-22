import React, { useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/redesign/ui/card';
import { Badge } from '@/components/redesign/ui/badge';
import { Button } from '@/components/redesign/ui/button';
import { LikeButton } from './LikeButton';
import { LikesModal } from './LikesModal';
import { likesApi } from '@/lib/api/likesApi';
import { ImageWithFallback } from '@/components/redesign/figma/ImageWithFallback';
import { API_URL } from '@/lib/config';

interface EventCardProps {
  event: {
    _id: string;
    title: string;
    description?: string;
    date: string;
    location: {
      address: string;
      venue?: string;
    };
    images?: Array<{ url: string }>;
    category: string;
    likesCount?: number;
    isLiked?: boolean;
    attendeesCount?: number;
  };
  onEventClick?: (eventId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onEventClick }) => {
  const [likesCount, setLikesCount] = useState(event.likesCount || 0);
  const [isLiked, setIsLiked] = useState(event.isLiked || false);
  const [showLikesModal, setShowLikesModal] = useState(false);

  const handleLike = async () => {
    try {
      const result = await likesApi.toggleEventLike(event._id);
      setLikesCount(result.data.likesCount);
      setIsLiked(result.data.isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error; // Let LikeButton handle the error
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const eventImage = event.images?.[0]?.url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080';

  return (
    <>
      <Card
        className="glass-card hover-lift overflow-hidden cursor-pointer"
        onClick={() => onEventClick?.(event._id)}
      >
        {/* Event Image */}
        <div className="relative">
          <ImageWithFallback
            src={eventImage}
            alt={event.title}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <Badge className="bg-violet-500/80 text-white backdrop-blur-sm">
              {event.category}
            </Badge>
          </div>

          {/* Event Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
            <div className="flex items-center space-x-4 text-white/90 text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)} • {formatTime(event.date)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{event.location.venue || event.location.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Like Button with Modal */}
              <div onClick={(e) => e.stopPropagation()}>
                <LikeButton
                  isLiked={isLiked}
                  likesCount={likesCount}
                  onLike={handleLike}
                  size="md"
                />
              </div>

              {/* Show Likes Modal on Click */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLikesModal(true);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Ver likes
              </button>

              {/* Attendees */}
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">{event.attendeesCount || 0}</span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Handle attend action
              }}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-blue-700"
            >
              Asistir
            </Button>
          </div>
        </div>
      </Card>

      {/* Likes Modal */}
      <LikesModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        targetId={event._id}
        targetType="event"
        apiBaseUrl={API_URL}
      />
    </>
  );
};
