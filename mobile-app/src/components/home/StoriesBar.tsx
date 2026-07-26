import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { homeStyles } from '@/styles/homeStyles';

// Types
interface StoryUser {
  _id: string;
  firstName: string;
  avatar: string;
}

interface StoryEvent {
  _id: string;
  title: string;
}

interface Story {
  id: string;
  type?: 'add';
  user?: StoryUser;
  event?: StoryEvent;
  viewed?: boolean;
  createdAt?: string;
}

interface StoriesBarProps {
  stories: Story[];
  onStoryPress: (story: Story) => void;
  onAddStoryPress: () => void;
  onRefresh?: () => Promise<void>;
}

// Add Story Button Component
const AddStoryButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity
    style={homeStyles.storyItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={['#8B5CF6', '#06B6D4']}
      style={homeStyles.addStoryGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Plus size={28} color="white" />
    </LinearGradient>
    <Text style={homeStyles.storyName}>Tu Story</Text>
  </TouchableOpacity>
);

// Story Item Component
const StoryItem: React.FC<{ story: Story; onPress: () => void }> = ({
  story,
  onPress,
}) => {
  if (!story.user) return null;

  return (
    <TouchableOpacity
      style={homeStyles.storyItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View>
        {/* Gradient ring - purple if unviewed, gray if viewed */}
        <LinearGradient
          colors={
            story.viewed
              ? ['#E5E7EB', '#E5E7EB']
              : ['#8B5CF6', '#06B6D4', '#10B981']
          }
          style={homeStyles.storyRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Image
            source={{ uri: story.user.avatar }}
            style={homeStyles.storyAvatar}
          />
        </LinearGradient>

        {/* Event thumbnail badge if story is event-related */}
        {story.event && (
          <View style={homeStyles.eventThumbnail}>
            <Calendar size={12} color="white" />
          </View>
        )}
      </View>

      <Text style={homeStyles.storyName} numberOfLines={1}>
        {story.user.firstName}
      </Text>
    </TouchableOpacity>
  );
};

// Main StoriesBar Component
export const StoriesBar: React.FC<StoriesBarProps> = ({
  stories,
  onStoryPress,
  onAddStoryPress,
  onRefresh,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleStoryPress = useCallback(
    (story: Story) => {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (story.type === 'add') {
        onAddStoryPress();
      } else {
        onStoryPress(story);
      }
    },
    [onStoryPress, onAddStoryPress]
  );

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Render item with memoization
  const renderStoryItem: ListRenderItem<Story> = useCallback(
    ({ item, index }) => {
      if (item.type === 'add') {
        return (
          <Animated.View entering={FadeInRight.delay(index * 50)}>
            <AddStoryButton onPress={() => handleStoryPress(item)} />
          </Animated.View>
        );
      }

      return (
        <Animated.View entering={FadeInRight.delay(index * 50)}>
          <StoryItem story={item} onPress={() => handleStoryPress(item)} />
        </Animated.View>
      );
    },
    [handleStoryPress]
  );

  // Prepare data with "Add Story" at the beginning
  const storiesData: Story[] = [
    { id: 'add', type: 'add' },
    ...stories,
  ];

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={storiesData}
      renderItem={renderStoryItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={homeStyles.storiesContainer}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    />
  );
};

export default StoriesBar;
