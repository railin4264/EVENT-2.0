import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/hooks/useFeed';
import { FeedPost } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string>('todos');

  const {
    posts,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    toggleLike,
    sharePost,
    setFilter,
  } = useFeed({ type: activeFilter === 'todos' ? undefined : activeFilter as any });

  const filters = [
    { key: 'todos', label: 'Todos', icon: 'grid' },
    { key: 'trending', label: 'Trending', icon: 'trending-up' },
    { key: 'conexiones', label: 'Conexiones', icon: 'people' },
    { key: 'eventos', label: 'Eventos', icon: 'calendar' },
    { key: 'tribus', label: 'Tribus', icon: 'shield' },
  ];

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setFilter(filter === 'todos' ? undefined : filter as any);
  };

  const handleComment = (postId: string) => {
    router.push('/post/' + postId);
  };

  const renderFilterTab = ({ item }: { item: any }) => {
    const isActive = activeFilter === item.key;
    return (
      <TouchableOpacity
        style={[
          styles.filterTab,
          {
            backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => handleFilterChange(item.key)}
      >
        <Ionicons
          name={item.icon as any}
          size={16}
          color={isActive ? '#ffffff' : theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.filterTabText,
            { color: isActive ? '#ffffff' : theme.colors.textSecondary },
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPostCard = ({ item }: { item: FeedPost }) => {
    let timeAgo = '';
    try {
      const dateStr = item.timestamp;
      const date = dateStr ? new Date(dateStr) : new Date();
      timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      timeAgo = 'hace un momento';
    }

    return (
      <View style={[styles.postCard, { backgroundColor: theme.colors.surface }]}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: item.user.avatar || 'https://via.placeholder.com/40' }}
              style={styles.userAvatar}
            />
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>
                  {item.user.name || 'Usuario'}
                </Text>
                {item.user.verified && (
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                )}
              </View>
              {item.user.title && (
                <Text style={[styles.userTitle, { color: theme.colors.textSecondary }]}>
                  {item.user.title}
                </Text>
              )}
              <Text style={[styles.postTime, { color: theme.colors.textSecondary }]}>
                {timeAgo}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={[styles.postContent, { color: theme.colors.text }]}>
          {item.content}
        </Text>

        {/* Event Data */}
        {item.eventData && (
          <TouchableOpacity
            style={[styles.eventCard, { backgroundColor: theme.colors.background }]}
            onPress={() => router.push('/event/' + item.eventData?._id)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <View style={styles.eventInfo}>
              <Text style={[styles.eventName, { color: theme.colors.text }]}>
                {item.eventData.name}
              </Text>
              <Text style={[styles.eventDetails, { color: theme.colors.textSecondary }]}>
                {(item.eventData.location as any)?.address ||
                  (item.eventData.location as any)?.city ||
                  'Ubicación'}{' '}
                • {item.eventData.attendees} asistentes
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Tribe Data */}
        {item.tribeData && (
          <View style={[styles.tribeCard, { backgroundColor: theme.colors.background }]}>
            <Ionicons name="shield" size={20} color={theme.colors.violet} />
            <View style={styles.tribeInfo}>
              <Text style={[styles.tribeName, { color: theme.colors.text }]}>
                {item.tribeData.name}
              </Text>
              <Text style={[styles.tribeDetails, { color: theme.colors.textSecondary }]}>
                {item.tribeData.memberCount} miembros
              </Text>
            </View>
          </View>
        )}

        {/* Post Image */}
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={[styles.postImage, { backgroundColor: theme.colors.surface }]}
          />
        )}

        {/* Actions */}
        <View
          style={[
            styles.postActions,
            { borderTopColor: 'rgba(255,255,255,0.08)' },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(item.id)}
          >
            <Ionicons
              name={item.liked ? 'heart' : 'heart-outline'}
              size={22}
              color={item.liked ? '#ec4899' : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {item.stats.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleComment(item.id)}
          >
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {item.stats.comments}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => sharePost(item.id)}
          >
            <Ionicons name="share-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {item.stats.shares}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name={item.bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={item.bookmarked ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="newspaper-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No hay publicaciones
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        ¡Se el primero en compartir algo!
      </Text>
      <TouchableOpacity
        style={[styles.createPostButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/create-event')}
      >
        <Text style={styles.createPostButtonText}>Crear publicacion</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando feed...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: 'rgba(255,255,255,0.08)',
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Feed</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.surface, borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }]}
            onPress={() => router.push('/(tabs)/discover')}
          >
            <Ionicons name="grid" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.surface, borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }]}
            onPress={() => router.push('/create-event')}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          renderItem={renderFilterTab}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Feed List */}
      <FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          posts.length === 0 ? styles.emptyContainer : styles.feedContainer
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingVertical: 12,
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  feedContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
  },
  postCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userTitle: {
    fontSize: 14,
    marginTop: 2,
  },
  postTime: {
    fontSize: 12,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventDetails: {
    fontSize: 14,
  },
  tribeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tribeInfo: {
    flex: 1,
  },
  tribeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tribeDetails: {
    fontSize: 14,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createPostButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPostButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});
