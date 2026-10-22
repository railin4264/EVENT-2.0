import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ListRenderItem,
} from 'react-native';
import { MapPin, Clock, Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { homeStyles } from '@/styles/homeStyles';
import { getMobileImageUrl } from '@/utils/imageFallbacks';

// Types
interface NearbyEventLocation {
  venue: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface NearbyEvent {
  _id: string;
  title: string;
  coverImage: string;
  date: string;
  location: NearbyEventLocation;
  distance: number; // in km
  isFavorited?: boolean;
}

interface NearbyEventsProps {
  events: NearbyEvent[];
  userLocation: {
    city: string;
  };
  onEventPress: (eventId: string) => void;
  onToggleFavorite: (eventId: string) => void;
  onSeeAll: () => void;
}

// Event Card Component - Memoized for performance
const NearbyEventCard = memo<{
  event: NearbyEvent;
  onPress: () => void;
  onToggleFavorite: (e: any) => void;
}>(({ event, onPress, onToggleFavorite }) => {
  return (
    <TouchableOpacity
      style={homeStyles.nearbyCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Event Image */}
      <Image
        source={{ uri: getMobileImageUrl(event.coverImage, (event as any).category, event.title) }}
        style={homeStyles.nearbyImage}
        resizeMode="cover"
      />

      {/* Distance Badge */}
      <View style={homeStyles.distanceBadge}>
        <MapPin size={12} color="white" />
        <Text style={homeStyles.distanceText}>{event.distance.toFixed(1)} km</Text>
      </View>

      {/* Event Info */}
      <View style={homeStyles.nearbyInfo}>
        <Text style={homeStyles.nearbyTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={homeStyles.nearbyMeta}>
          <Clock size={12} color="#9CA3AF" />
          <Text style={homeStyles.nearbyDate}>
            {format(new Date(event.date), 'dd MMM', { locale: es })}
          </Text>
        </View>
      </View>

      {/* Quick Favorite Button */}
      <TouchableOpacity
        style={homeStyles.favoriteButton}
        onPress={onToggleFavorite}
        activeOpacity={0.7}
      >
        <Heart
          size={18}
          color={event.isFavorited ? '#EF4444' : 'white'}
          fill={event.isFavorited ? '#EF4444' : 'transparent'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

NearbyEventCard.displayName = 'NearbyEventCard';

// Main Component
export const NearbyEvents: React.FC<NearbyEventsProps> = ({
  events,
  userLocation,
  onEventPress,
  onToggleFavorite,
  onSeeAll,
}) => {
  // Handle event press
  const handleEventPress = useCallback(
    (eventId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEventPress(eventId);
    },
    [onEventPress]
  );

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(
    (eventId: string, e: any) => {
      e.stopPropagation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onToggleFavorite(eventId);
    },
    [onToggleFavorite]
  );

  // Handle see all
  const handleSeeAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSeeAll();
  }, [onSeeAll]);

  // Render item with animation
  const renderEventItem: ListRenderItem<NearbyEvent> = useCallback(
    ({ item, index }) => (
      <Animated.View entering={FadeInRight.delay(index * 50)}>
        <NearbyEventCard
          event={item}
          onPress={() => handleEventPress(item._id)}
          onToggleFavorite={(e) => handleToggleFavorite(item._id, e)}
        />
      </Animated.View>
    ),
    [handleEventPress, handleToggleFavorite]
  );

  // Key extractor
  const keyExtractor = useCallback((item: NearbyEvent) => item._id, []);

  // Empty component
  const renderEmptyComponent = useCallback(
    () => (
      <View style={homeStyles.emptyTribes}>
        <MapPin size={48} color="#9CA3AF" />
        <Text style={homeStyles.emptyText}>
          No hay eventos cerca de ti
        </Text>
      </View>
    ),
    []
  );

  if (events.length === 0) {
    return null;
  }

  return (
    <View style={homeStyles.section}>
      {/* Section Header */}
      <View style={homeStyles.sectionHeader}>
        <View>
          <Text style={homeStyles.sectionTitle}>Cerca de ti</Text>
          <Text style={homeStyles.sectionSubtitle}>
            {events.length} eventos en {userLocation.city}
          </Text>
        </View>

        <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
          <Text style={homeStyles.seeAllText}>Ver mapa →</Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={events}
        renderItem={renderEventItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={homeStyles.nearbyContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
        ListEmptyComponent={renderEmptyComponent}
        getItemLayout={(data, index) => ({
          length: 180,
          offset: 180 * index,
          index,
        })}
      />
    </View>
  );
};

export default NearbyEvents;
