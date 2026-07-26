import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationData {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
    verified?: boolean;
  };
  type: 'follow' | 'follow_request' | 'event_invite' | 'event_reminder' | 'event_update' | 'comment' | 'like' | 'tribe_invite' | 'system' | 'welcome';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  readAt?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id, filter],
    queryFn: async () => {
      const params = filter === 'unread' ? '?unreadOnly=true' : '';
      const response = await api.get(`/notifications${params}`);
      return response.data;
    },
    enabled: !!user,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.post(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/notifications/mark-all-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      Alert.alert('Éxito', 'Todas las notificaciones se marcaron como leídas');
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationPress = (notification: NotificationData) => {
    // Mark as read if not already read
    if (!notification.read) {
      markAsReadMutation.mutate(notification._id);
    }

    // Navigate based on notification type and actionUrl
    if (notification.actionUrl) {
      // Parse actionUrl and navigate accordingly
      const url = notification.actionUrl;
      if (url.includes('/events/')) {
        const eventId = url.split('/events/')[1];
        router.push('/event/' + eventId);
      } else if (url.includes('/tribes/')) {
        const tribeId = url.split('/tribes/')[1];
        router.push('/tribe/' + tribeId);
      } else if (url.includes('/profile/')) {
        const userId = url.split('/profile/')[1];
        router.push('/user/' + userId);
      }
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'Eliminar Notificación',
      '¿Estás seguro de que deseas eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteNotificationMutation.mutate(notificationId),
        },
      ]
    );
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    const iconMap: Record<NotificationData['type'], string> = {
      follow: 'person-add',
      follow_request: 'person',
      event_invite: 'calendar',
      event_reminder: 'alarm',
      event_update: 'calendar',
      comment: 'chatbubble',
      like: 'heart',
      tribe_invite: 'people',
      system: 'settings',
      welcome: 'hand-left'
    };
    return iconMap[type] || 'notifications';
  };

  const getNotificationIconColor = (type: NotificationData['type']) => {
    const colorMap: Record<NotificationData['type'], string> = {
      follow: theme.colors.primary,
      follow_request: theme.colors.secondary,
      event_invite: theme.colors.success,
      event_reminder: theme.colors.warning,
      event_update: theme.colors.accent,
      comment: theme.colors.primary,
      like: '#FF6B6B',
      tribe_invite: '#4ECDC4',
      system: theme.colors.textSecondary,
      welcome: theme.colors.primary
    };
    return colorMap[type] || theme.colors.textSecondary;
  };

  const formatTime = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), {
      addSuffix: true,
      locale: es
    });
  };

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderNotificationItem = ({ item }: { item: NotificationData }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: item.read ? theme.colors.surface : theme.colors.primary + '08',
          borderLeftColor: item.read ? 'transparent' : theme.colors.primary,
        }
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleDeleteNotification(item._id)}
    >
      <View style={styles.notificationContent}>
        {/* Icon */}
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: getNotificationIconColor(item.type) + '20' }
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.type) as any}
            size={20}
            color={getNotificationIconColor(item.type)}
          />
        </View>

        {/* Avatar (if sender exists) */}
        {item.sender && (
          <Image
            source={{
              uri: item.sender.avatar ||
                `https://ui-avatars.com/api/?name=${item.sender.firstName}+${item.sender.lastName}&background=6366f1&color=fff&size=100`
            }}
            style={styles.senderAvatar}
          />
        )}

        {/* Content */}
        <View style={styles.notificationTextContainer}>
          <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}>
            {item.message}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {/* Unread indicator */}
        {!item.read && (
          <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary }]} />
        )}

        {/* Priority indicator */}
        {item.priority === 'high' && (
          <View style={styles.priorityIndicator}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="notifications-outline"
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {filter === 'unread'
          ? 'Todas tus notificaciones están al día'
          : 'Te notificaremos cuando algo interesante suceda'
        }
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando notificaciones...
        </Text>
      </View>
    );
  }

  const notifications = notificationsData?.data?.notifications || [];
  const unreadCount = notificationsData?.data?.unreadCount || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Notificaciones
        </Text>

        <TouchableOpacity
          style={styles.markAllReadButton}
          onPress={() => markAllAsReadMutation.mutate()}
          disabled={markAllAsReadMutation.isPending || unreadCount === 0}
        >
          {markAllAsReadMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons
              name="checkmark-done"
              size={24}
              color={unreadCount > 0 ? theme.colors.primary : theme.colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            {
              backgroundColor: filter === 'all' ? theme.colors.primary : 'transparent',
              borderColor: theme.colors.primary,
            }
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: filter === 'all' ? 'white' : theme.colors.primary }
            ]}
          >
            Todas ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            {
              backgroundColor: filter === 'unread' ? theme.colors.primary : 'transparent',
              borderColor: theme.colors.primary,
            }
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: filter === 'unread' ? 'white' : theme.colors.primary }
            ]}
          >
            Sin leer ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  markAllReadButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    position: 'relative',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  priorityIndicator: {
    position: 'absolute',
    top: 12,
    right: 16,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});