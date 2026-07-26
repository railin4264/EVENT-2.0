import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { homeStyles } from '@/styles/homeStyles';

// Types
interface Tribe {
  _id: string;
  name: string;
  coverImage: string;
  members: string[];
  unreadMessages?: number;
}

interface TribesSectionProps {
  tribes: Tribe[];
  onTribePress: (tribeId: string) => void;
  onSeeAll: () => void;
}

// Tribe Card Component - Memoized for performance
const TribeCard = memo<{
  tribe: Tribe;
  onPress: () => void;
}>(({ tribe, onPress }) => {
  return (
    <TouchableOpacity
      style={homeStyles.tribeCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={{ uri: tribe.coverImage }}
        style={homeStyles.tribeCover}
        imageStyle={homeStyles.tribeCoverImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={homeStyles.tribeGradient}
        >
          <View style={homeStyles.tribeInfo}>
            <Text style={homeStyles.tribeName} numberOfLines={1}>
              {tribe.name}
            </Text>
            <View style={homeStyles.tribeStats}>
              <Users size={14} color="#10B981" />
              <Text style={homeStyles.tribeMembers}>
                {tribe.members.length} miembros
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Unread Messages Badge */}
      {tribe.unreadMessages && tribe.unreadMessages > 0 && (
        <View style={homeStyles.unreadBadge}>
          <Text style={homeStyles.unreadText}>
            {tribe.unreadMessages > 99 ? '99+' : tribe.unreadMessages}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

TribeCard.displayName = 'TribeCard';

// Empty Tribes Component
const EmptyTribes: React.FC<{ onJoinPress: () => void }> = ({ onJoinPress }) => (
  <View style={homeStyles.emptyTribes}>
    <Users size={48} color="#9CA3AF" />
    <Text style={homeStyles.emptyText}>
      No te has unido a ninguna tribu
    </Text>
    <TouchableOpacity
      style={homeStyles.joinButton}
      onPress={onJoinPress}
      activeOpacity={0.8}
    >
      <Text style={homeStyles.joinButtonText}>Explorar Tribus</Text>
    </TouchableOpacity>
  </View>
);

// Main Component
export const TribesSection: React.FC<TribesSectionProps> = ({
  tribes,
  onTribePress,
  onSeeAll,
}) => {
  // Handle tribe press
  const handleTribePress = useCallback(
    (tribeId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTribePress(tribeId);
    },
    [onTribePress]
  );

  // Handle see all
  const handleSeeAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSeeAll();
  }, [onSeeAll]);

  // Handle join tribes
  const handleJoinTribes = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/tribes/discover');
  }, []);

  // Render tribe item with animation
  const renderTribeItem: ListRenderItem<Tribe> = useCallback(
    ({ item, index }) => (
      <Animated.View entering={FadeInRight.delay(index * 50)}>
        <TribeCard
          tribe={item}
          onPress={() => handleTribePress(item._id)}
        />
      </Animated.View>
    ),
    [handleTribePress]
  );

  // Key extractor
  const keyExtractor = useCallback((item: Tribe) => item._id, []);

  // Empty component
  const renderEmptyComponent = useCallback(
    () => <EmptyTribes onJoinPress={handleJoinTribes} />,
    [handleJoinTribes]
  );

  return (
    <View style={homeStyles.section}>
      {/* Section Header */}
      <View style={homeStyles.sectionHeader}>
        <Text style={homeStyles.sectionTitle}>Tus Tribus</Text>

        {tribes.length > 0 && (
          <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
            <Text style={homeStyles.seeAllText}>Ver todas →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tribes List */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={tribes}
        renderItem={renderTribeItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={homeStyles.tribesContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
        ListEmptyComponent={renderEmptyComponent}
        getItemLayout={(data, index) => ({
          length: 160,
          offset: 160 * index,
          index,
        })}
      />
    </View>
  );
};

export default TribesSection;
