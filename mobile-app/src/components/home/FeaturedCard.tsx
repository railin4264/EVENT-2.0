import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  MapPin,
  Users,
  Heart,
  X,
  Info,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { homeStyles } from '@/styles/homeStyles';

// Types
interface EventOrganizer {
  _id: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

interface EventLocation {
  venue: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface FeaturedEvent {
  _id: string;
  title: string;
  coverImage: string;
  category: string;
  date: string;
  location: EventLocation;
  attendees: string[];
  createdBy: EventOrganizer;
}

interface FeaturedCardProps {
  event: FeaturedEvent;
  onLike: (eventId: string) => void;
  onPass: (eventId: string) => void;
  onViewDetails: (eventId: string) => void;
}

export const FeaturedCard: React.FC<FeaturedCardProps> = ({
  event,
  onLike,
  onPass,
  onViewDetails,
}) => {
  // Animation values
  const pan = useRef(
    new RNAnimated.ValueXY({ x: 0, y: 0 })
  ).current;

  // Like/Pass opacity based on pan
  const likeOpacity = pan.x.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = pan.x.interpolate({
    inputRange: [-120, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Handle like action
  const handleLike = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    RNAnimated.timing(pan, {
      toValue: { x: 500, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onLike(event._id);
      // Reset position for next card
      pan.setValue({ x: 0, y: 0 });
    });
  }, [event._id, onLike, pan]);

  // Handle pass action
  const handlePass = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    RNAnimated.timing(pan, {
      toValue: { x: -500, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onPass(event._id);
      // Reset position for next card
      pan.setValue({ x: 0, y: 0 });
    });
  }, [event._id, onPass, pan]);

  // Handle view details
  const handleViewDetails = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onViewDetails(event._id);
  }, [event._id, onViewDetails]);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only respond to horizontal swipes
        return Math.abs(gesture.dx) > 5;
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy * 0.5 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) {
          // Swipe right - Like
          handleLike();
        } else if (gesture.dx < -120) {
          // Swipe left - Pass
          handlePass();
        } else {
          // Return to center with spring animation
          RNAnimated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Rotation based on pan
  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  return (
    <RNAnimated.View
      style={[
        homeStyles.featuredCard,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Event Image with Gradient Overlay */}
      <ImageBackground
        source={{ uri: event.coverImage }}
        style={homeStyles.cardImage}
        imageStyle={homeStyles.cardImageStyle}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={homeStyles.cardGradientOverlay}
        >
          {/* Category Badge */}
          <View style={homeStyles.categoryBadge}>
            <Text style={homeStyles.categoryText}>{event.category}</Text>
          </View>

          {/* Event Info */}
          <View style={homeStyles.cardInfo}>
            <Text style={homeStyles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>

            {/* Event Meta */}
            <View style={homeStyles.eventMeta}>
              {/* Date */}
              <View style={homeStyles.metaItem}>
                <Calendar size={16} color="white" />
                <Text style={homeStyles.metaText}>
                  {format(new Date(event.date), "dd MMM, HH:mm", {
                    locale: es,
                  })}
                </Text>
              </View>

              {/* Location */}
              <View style={homeStyles.metaItem}>
                <MapPin size={16} color="white" />
                <Text style={homeStyles.metaText} numberOfLines={1}>
                  {event.location.venue}
                </Text>
              </View>

              {/* Attendees */}
              <View style={homeStyles.metaItem}>
                <Users size={16} color="white" />
                <Text style={homeStyles.metaText}>
                  {event.attendees.length} asistentes
                </Text>
              </View>
            </View>

            {/* Organizer */}
            <View style={homeStyles.organizer}>
              <ImageBackground
                source={{ uri: event.createdBy.avatar }}
                style={homeStyles.organizerAvatar}
                imageStyle={{ borderRadius: 16 }}
              />
              <Text style={homeStyles.organizerName}>
                Por {event.createdBy.firstName} {event.createdBy.lastName}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Swipe Indicators */}
      <RNAnimated.View
        style={[
          homeStyles.swipeIndicator,
          homeStyles.likeIndicator,
          { opacity: likeOpacity },
        ]}
        pointerEvents="none"
      >
        <Heart size={40} color="#10B981" fill="#10B981" />
        <Text style={[homeStyles.indicatorText, { color: '#10B981' }]}>
          ME INTERESA
        </Text>
      </RNAnimated.View>

      <RNAnimated.View
        style={[
          homeStyles.swipeIndicator,
          homeStyles.passIndicator,
          { opacity: passOpacity },
        ]}
        pointerEvents="none"
      >
        <X size={40} color="#EF4444" />
        <Text style={[homeStyles.indicatorText, { color: '#EF4444' }]}>
          PASAR
        </Text>
      </RNAnimated.View>

      {/* Action Buttons (Alternative to swipe) */}
      <View style={homeStyles.cardActions}>
        {/* Pass Button */}
        <TouchableOpacity
          style={[homeStyles.actionButtonCard, homeStyles.passButton]}
          onPress={handlePass}
          activeOpacity={0.7}
        >
          <X size={28} color="#EF4444" />
        </TouchableOpacity>

        {/* Info Button */}
        <TouchableOpacity
          style={[homeStyles.actionButtonCard, homeStyles.infoButton]}
          onPress={handleViewDetails}
          activeOpacity={0.7}
        >
          <Info size={24} color="#8B5CF6" />
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity
          style={[homeStyles.actionButtonCard, homeStyles.likeButton]}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Heart size={28} color="#10B981" />
        </TouchableOpacity>
      </View>
    </RNAnimated.View>
  );
};

export default FeaturedCard;
