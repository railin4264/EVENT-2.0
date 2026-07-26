import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import tribesService, { TribesService } from '@/services/tribesService';

const tribes = new TribesService();

interface TribePost {
  _id: string;
  content: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  images?: { url: string; alt?: string }[];
  likes: number;
  likedByUser: boolean;
  comments: number;
  createdAt: string;
}

interface TribePostsProps {
  tribeId: string;
  isMember: boolean;
  isAdmin: boolean;
}

export default function TribePosts({ tribeId, isMember, isAdmin }: TribePostsProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [posts, setPosts] = useState<TribePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await tribes.getTribePosts(tribeId, pageNum, 20);

      if (response.success) {
        if (refresh || pageNum === 1) {
          setPosts(response.posts);
        } else {
          setPosts(prev => [...prev, ...response.posts]);
        }
        setHasMore(response.pagination.page < response.pagination.pages);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'No se pudieron cargar las publicaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [tribeId]);

  const handleRefresh = () => {
    setPage(1);
    loadPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() || !isMember) return;

    try {
      setIsPosting(true);
      const response = await tribes.createTribePost(tribeId, {
        content: newPostText.trim(),
      });

      if (response.success) {
        setNewPostText('');
        handleRefresh();
        Alert.alert('Éxito', 'Publicación creada');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'No se pudo crear la publicación');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const response = await tribes.likeTribePost(tribeId, postId);

      if (response.success) {
        setPosts(prev =>
          prev.map(post =>
            post._id === postId
              ? { ...post, likes: response.likesCount, likedByUser: response.liked }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Estás seguro de que quieres eliminar esta publicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await tribes.deleteTribePost(tribeId, postId);

              if (response.success) {
                setPosts(prev => prev.filter(post => post._id !== postId));
                Alert.alert('Éxito', 'Publicación eliminada');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: { item: TribePost }) => {
    const isAuthor = item.author._id === user?.id;
    const canDelete = isAuthor || isAdmin;

    return (
      <View style={[styles.postCard, { backgroundColor: theme.colors.surface }]}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              {item.author.avatar ? (
                <Image source={{ uri: item.author.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: theme.colors.onPrimary }]}>
                  {item.author.firstName[0]}
                </Text>
              )}
            </View>
            <View>
              <Text style={[styles.authorName, { color: theme.colors.onSurface }]}>
                {item.author.firstName} {item.author.lastName}
              </Text>
              <Text style={[styles.postTime, { color: theme.colors.onSurfaceVariant }]}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {canDelete && (
            <TouchableOpacity onPress={() => handleDeletePost(item._id)}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* Post Content */}
        <Text style={[styles.postContent, { color: theme.colors.onSurface }]}>
          {item.content}
        </Text>

        {/* Post Images */}
        {item.images && item.images.length > 0 && (
          <View style={styles.imagesContainer}>
            {item.images.slice(0, 4).map((image, index) => (
              <Image
                key={index}
                source={{ uri: image.url }}
                style={styles.postImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLikePost(item._id)}
          >
            <Ionicons
              name={item.likedByUser ? 'heart' : 'heart-outline'}
              size={24}
              color={item.likedByUser ? theme.colors.error : theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.actionText, { color: theme.colors.onSurfaceVariant }]}>
              {item.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.actionText, { color: theme.colors.onSurfaceVariant }]}>
              {item.comments}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={24} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && page === 1) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Create Post */}
      {isMember && (
        <View style={[styles.createPostCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.createPostHeader}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.avatarText, { color: theme.colors.onPrimary }]}>
                {user?.firstName?.[0] || '?'}
              </Text>
            </View>
            <TextInput
              value={newPostText}
              onChangeText={setNewPostText}
              placeholder="¿Qué estás pensando?"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[styles.createPostInput, { color: theme.colors.onSurface }]}
              multiline
              maxLength={5000}
            />
          </View>

          <View style={styles.createPostActions}>
            <TouchableOpacity style={styles.mediaButton}>
              <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreatePost}
              disabled={!newPostText.trim() || isPosting}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Text style={[styles.postButtonText, { color: theme.colors.onPrimary }]}>
                  Publicar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Posts List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.outline} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No hay publicaciones aún
            </Text>
            {isMember && (
              <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                ¡Sé el primero en publicar!
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostCard: {
    padding: 16,
    marginBottom: 8,
  },
  createPostHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  createPostInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  createPostActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaButton: {
    padding: 8,
  },
  postButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  postCard: {
    padding: 16,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  postImage: {
    width: '48%',
    height: 200,
    borderRadius: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  loader: {
    padding: 20,
  },
});
