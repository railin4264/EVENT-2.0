import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storyService } from '@/services';
import type { Story } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

const getSegmentUrls = (story: Story): string[] =>
  story.content
    .filter(c => c.type === 'image' || c.type === 'video')
    .map(c => c.url || '')
    .filter(Boolean);

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds

export default function StoriesViewerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id: storyId, userId } = useLocalSearchParams<{ id?: string; userId?: string }>();

  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<any>(null);

  useEffect(() => {
    loadStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0 && !paused) {
      startProgress();
      markAsViewed();
    }
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [currentStoryIndex, currentSegmentIndex, paused, stories]);

  const loadStories = async () => {
    try {
      let result;
      if (userId) {
        result = await storyService.getUserStories(userId);
      } else {
        result = await storyService.getStories();
      }
      setStories(result.data);

      // Find initial story index
      if (storyId) {
        const index = result.data.findIndex((s: Story) => s._id === storyId);
        if (index !== -1) setCurrentStoryIndex(index);
      }
    } catch (error: any) {
      console.error('Error loading stories:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const startProgress = () => {
    progressAnim.setValue(0);
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animationRef.current.start(({ finished }: { finished: boolean }) => {
      if (finished) {
        handleNext();
      }
    });
  };

  const markAsViewed = async () => {
    if (stories[currentStoryIndex]) {
      try {
        await storyService.viewStory(stories[currentStoryIndex]._id);
      } catch (error) {
        console.error('Error marking story as viewed:', error);
      }
    }
  };

  const handleNext = () => {
    const currentStory = stories[currentStoryIndex];
    if (!currentStory) return;

    const segments = getSegmentUrls(currentStory);

    if (currentSegmentIndex < segments.length - 1) {
      // Next segment in current story
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    } else if (currentStoryIndex < stories.length - 1) {
      // Next story
      setCurrentStoryIndex(currentStoryIndex + 1);
      setCurrentSegmentIndex(0);
    } else {
      // End of stories
      router.back();
    }
  };

  const handlePrevious = () => {
    if (currentSegmentIndex > 0) {
      // Previous segment in current story
      setCurrentSegmentIndex(currentSegmentIndex - 1);
    } else if (currentStoryIndex > 0) {
      // Previous story
      const prevStory = stories[currentStoryIndex - 1];
      const segments = prevStory.mediaUrls || [prevStory.mediaUrl];
      setCurrentStoryIndex(currentStoryIndex - 1);
      setCurrentSegmentIndex(segments.length - 1);
    }
  };

  const handleReact = async (reaction: string) => {
    if (stories[currentStoryIndex]) {
      try {
        await storyService.reactToStory(stories[currentStoryIndex]._id, reaction);
      } catch {
        // silently fail - reactions are non-critical
      }
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setPaused(true);
      if (animationRef.current) {
        animationRef.current.stop();
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      setPaused(false);

      if (Math.abs(gestureState.dx) < 50 && Math.abs(gestureState.dy) < 50) {
        // Tap
        if (gestureState.x0 < width / 2) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
    },
  });

  const currentStory = stories[currentStoryIndex];
  const segments = getSegmentUrls(currentStory);
  const currentSegment = segments[currentSegmentIndex];

  const styles = getStyles(theme);

  if (loading || stories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" />

      {/* Story Image/Video */}
      <Image
        source={{ uri: currentSegment }}
        style={styles.media}
        resizeMode="cover"
      />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {segments.map((_, index) => (
          <View key={index} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      index === currentSegmentIndex ? '0%' :
                      index < currentSegmentIndex ? '100%' : '0%',
                      index === currentSegmentIndex ? '100%' :
                      index < currentSegmentIndex ? '100%' : '0%',
                    ],
                  }),
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentStory.user?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{currentStory.user?.username}</Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(currentStory.createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {currentStory.content && currentStory.content.find(c => c.url === currentSegment)?.text && (
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>
            {currentStory.content.find(c => c.url === currentSegment)?.text}
          </Text>
        </View>
      )}

      {/* Reactions */}
      <View style={styles.reactionsContainer}>
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={() => handleReact('❤️')}
        >
          <Text style={styles.reactionIcon}>❤️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={() => handleReact('😂')}
        >
          <Text style={styles.reactionIcon}>😂</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={() => handleReact('😮')}
        >
          <Text style={styles.reactionIcon}>😮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={() => handleReact('🔥')}
        >
          <Text style={styles.reactionIcon}>🔥</Text>
        </TouchableOpacity>
      </View>

      {/* View count */}
      {currentStory.viewCount > 0 && (
        <View style={styles.viewsContainer}>
          <Text style={styles.viewsText}>👁 {currentStory.viewCount}</Text>
        </View>
      )}
    </View>
  );
}

function formatTimestamp(date: Date | string): string {
  const now = new Date();
  const storyDate = new Date(date);
  const diffMs = now.getTime() - storyDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return storyDate.toLocaleDateString();
  }
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.text,
  },
  loadingText: {
    color: theme.colors.background,
    fontSize: 16,
  },
  media: {
    width,
    height,
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 50,
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  avatarText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  username: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: theme.colors.background,
    fontSize: 36,
    fontWeight: '300',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  contentText: {
    color: theme.colors.background,
    fontSize: 18,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  reactionsContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  reactionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionIcon: {
    fontSize: 24,
  },
  viewsContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  viewsText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
});