import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import tribesService, { TribesService } from '@/services/tribesService';

const tribes = new TribesService();

const { width, height } = Dimensions.get('window');

interface TribeStory {
  _id: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  media: {
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
  };
  duration: number;
  views: number;
  viewedByUser: boolean;
  createdAt: string;
}

interface TribeStoriesProps {
  tribeId: string;
  isMember: boolean;
}

export default function TribeStories({ tribeId, isMember }: TribeStoriesProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [stories, setStories] = useState<TribeStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isMember) {
      loadStories();
    }
  }, [tribeId, isMember]);

  const loadStories = async () => {
    try {
      setLoading(true);
      const response = await tribes.getTribeStories(tribeId);

      if (response.success) {
        setStories(response.stories);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryPress = async (index: number) => {
    setSelectedStoryIndex(index);
    setProgress(0);

    // Mark story as viewed
    try {
      const story = stories[index];
      if (!story.viewedByUser) {
        await tribes.viewTribeStory(tribeId, story._id);

        // Update local state
        setStories(prev =>
          prev.map((s, i) => (i === index ? { ...s, viewedByUser: true, views: s.views + 1 } : s))
        );
      }
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const closeStoryViewer = () => {
    setSelectedStoryIndex(null);
    setProgress(0);
  };

  const goToNextStory = () => {
    if (selectedStoryIndex !== null && selectedStoryIndex < stories.length - 1) {
      handleStoryPress(selectedStoryIndex + 1);
    } else {
      closeStoryViewer();
    }
  };

  const goToPrevStory = () => {
    if (selectedStoryIndex !== null && selectedStoryIndex > 0) {
      handleStoryPress(selectedStoryIndex - 1);
    }
  };

  // Auto-progress stories
  useEffect(() => {
    if (selectedStoryIndex === null) return;

    const currentStory = stories[selectedStoryIndex];
    const duration = (currentStory?.duration || 5) * 1000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          goToNextStory();
          return 0;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [selectedStoryIndex]);

  const getTimeRemaining = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = 24 * 60 * 60 * 1000 - (now.getTime() - created.getTime());
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h restantes`;
  };

  if (!isMember) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContainer}
        >
          {stories.map((story, index) => (
            <TouchableOpacity
              key={story._id}
              onPress={() => handleStoryPress(index)}
              style={styles.storyItem}
            >
              <View
                style={[
                  styles.storyRing,
                  {
                    borderColor: story.viewedByUser
                      ? theme.colors.outline
                      : theme.colors.primary,
                  },
                ]}
              >
                <View style={styles.storyImageContainer}>
                  {story.media.thumbnail || story.media.type === 'image' ? (
                    <Image
                      source={{ uri: story.media.thumbnail || story.media.url }}
                      style={styles.storyImage}
                    />
                  ) : (
                    <View style={[styles.storyImage, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Ionicons name="play-circle" size={32} color={theme.colors.onSurfaceVariant} />
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.storyAuthor, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {story.author.firstName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Story Viewer Modal */}
      {selectedStoryIndex !== null && (
        <Modal
          visible={true}
          animationType="fade"
          onRequestClose={closeStoryViewer}
          statusBarTranslucent
        >
          <View style={styles.viewerContainer}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              {stories.map((_, index) => (
                <View key={index} style={styles.progressBarWrapper}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width:
                          index < selectedStoryIndex
                            ? '100%'
                            : index === selectedStoryIndex
                            ? `${progress}%`
                            : '0%',
                      },
                    ]}
                  />
                </View>
              ))}
            </View>

            {/* Header */}
            <View style={styles.viewerHeader}>
              <View style={styles.authorInfo}>
                <View style={[styles.smallAvatar, { backgroundColor: theme.colors.primary }]}>
                  {stories[selectedStoryIndex].author.avatar ? (
                    <Image
                      source={{ uri: stories[selectedStoryIndex].author.avatar }}
                      style={styles.smallAvatar}
                    />
                  ) : (
                    <Text style={styles.smallAvatarText}>
                      {stories[selectedStoryIndex].author.firstName[0]}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.viewerAuthorName}>
                    {stories[selectedStoryIndex].author.firstName}{' '}
                    {stories[selectedStoryIndex].author.lastName}
                  </Text>
                  <Text style={styles.viewerTime}>
                    {getTimeRemaining(stories[selectedStoryIndex].createdAt)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={closeStoryViewer} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* Story Content */}
            <View style={styles.storyContent}>
              {stories[selectedStoryIndex].media.type === 'image' ? (
                <Image
                  source={{ uri: stories[selectedStoryIndex].media.url }}
                  style={styles.storyMedia}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.storyMedia}>
                  <Ionicons name="play-circle" size={64} color="white" />
                  <Text style={styles.videoPlaceholder}>Video Story</Text>
                </View>
              )}
            </View>

            {/* Navigation */}
            <View style={styles.navigation}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={goToPrevStory}
                disabled={selectedStoryIndex === 0}
              >
                {selectedStoryIndex > 0 && (
                  <Ionicons name="chevron-back" size={32} color="white" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={goToNextStory}
                disabled={selectedStoryIndex === stories.length - 1}
              >
                {selectedStoryIndex < stories.length - 1 && (
                  <Ionicons name="chevron-forward" size={32} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* Story Info */}
            <View style={styles.storyInfo}>
              <View style={styles.storyStats}>
                <Ionicons name="eye-outline" size={16} color="white" />
                <Text style={styles.statsText}>
                  {stories[selectedStoryIndex].views} vistas
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  storiesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 70,
  },
  storyRing: {
    padding: 3,
    borderRadius: 35,
    borderWidth: 2,
  },
  storyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAuthor: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  progressContainer: {
    position: 'absolute',
    top: 40,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressBarWrapper: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
  },
  viewerHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewerAuthorName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyMedia: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
  },
  navigation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyInfo: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
  },
  storyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    color: 'white',
    fontSize: 14,
  },
});
