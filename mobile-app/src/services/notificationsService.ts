import { Platform } from 'react-native';
import { apiClient } from './apiClient';

export interface Notification {
  _id: string;
  type: 'event_invite' | 'tribe_invite' | 'new_message' | 'event_reminder' | 'achievement_unlocked' | 'new_follower' | 'event_update' | 'tribe_update' | 'system' | 'promotion' | 'recommendation' | 'trending';
  title: string;
  message: string;
  data?: any;
  userId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'social' | 'events' | 'tribes' | 'system' | 'achievements';
  read: boolean;
  delivered: boolean;
  pushSent: boolean;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export interface NotificationPreferences {
  email: {
    events: boolean;
    tribes: boolean;
    messages: boolean;
    achievements: boolean;
    marketing: boolean;
  };
  push: {
    events: boolean;
    tribes: boolean;
    messages: boolean;
    achievements: boolean;
    marketing: boolean;
  };
  inApp: {
    events: boolean;
    tribes: boolean;
    messages: boolean;
    achievements: boolean;
    marketing: boolean;
  };
}

export interface PreferencesResponse {
  success: boolean;
  preferences: NotificationPreferences;
}

class NotificationsService {
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    category?: string;
    unread?: boolean;
  }): Promise<NotificationsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category && params.category !== 'all') queryParams.append('category', params.category);
    if (params?.unread !== undefined) queryParams.append('unreadOnly', params.unread.toString());

    const response = await apiClient.get(`/notifications?${queryParams.toString()}`);
    const data = response.data.data ?? response.data;
    return { success: response.data.success, notifications: data.notifications ?? [], count: data.unreadCount ?? data.count ?? 0, pagination: data.pagination };
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get('/notifications/unread-count');
    const data = response.data.data ?? response.data;
    return { success: response.data.success, count: data.unreadCount ?? data.count ?? 0 };
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  async getPreferences(): Promise<PreferencesResponse> {
    const response = await apiClient.get('/notifications/preferences');
    return { success: response.data.success, preferences: response.data.data ?? response.data.preferences };
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<PreferencesResponse> {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return { success: response.data.success, preferences: response.data.data ?? response.data.preferences };
  }

  // Test notification (for development)
  async sendTestNotification(type: string, title: string, message: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/notifications/test', {
      type,
      title,
      message,
    });
    return response.data;
  }

  async registerPushToken(token: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/push/register', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    });
    return response.data;
  }
}

export const notificationsService = new NotificationsService();

// Notification types with their display information
export const NOTIFICATION_TYPES = {
  event_invite: {
    icon: 'calendar-outline',
    color: '#007AFF',
    category: 'events' as const,
  },
  tribe_invite: {
    icon: 'people-outline',
    color: '#34C759',
    category: 'tribes' as const,
  },
  new_message: {
    icon: 'chatbubble-outline',
    color: '#5856D6',
    category: 'social' as const,
  },
  event_reminder: {
    icon: 'alarm-outline',
    color: '#FF9500',
    category: 'events' as const,
  },
  achievement_unlocked: {
    icon: 'trophy-outline',
    color: '#FFD60A',
    category: 'achievements' as const,
  },
  new_follower: {
    icon: 'person-add-outline',
    color: '#32D74B',
    category: 'social' as const,
  },
  event_update: {
    icon: 'refresh-outline',
    color: '#007AFF',
    category: 'events' as const,
  },
  tribe_update: {
    icon: 'notifications-outline',
    color: '#34C759',
    category: 'tribes' as const,
  },
  system: {
    icon: 'settings-outline',
    color: '#8E8E93',
    category: 'system' as const,
  },
  promotion: {
    icon: 'pricetag-outline',
    color: '#FF3B30',
    category: 'system' as const,
  },
  recommendation: {
    icon: 'bulb-outline',
    color: '#AF52DE',
    category: 'system' as const,
  },
  trending: {
    icon: 'trending-up-outline',
    color: '#FF6B35',
    category: 'system' as const,
  },
};

// Priority levels with their display information
export const NOTIFICATION_PRIORITIES = {
  low: {
    color: '#8E8E93',
    badge: false,
  },
  normal: {
    color: '#007AFF',
    badge: true,
  },
  high: {
    color: '#FF9500',
    badge: true,
  },
  urgent: {
    color: '#FF3B30',
    badge: true,
  },
};

// Category filters
export const NOTIFICATION_CATEGORIES = [
  { value: 'all', label: 'Todas', icon: 'apps-outline' },
  { value: 'social', label: 'Social', icon: 'people-outline' },
  { value: 'events', label: 'Eventos', icon: 'calendar-outline' },
  { value: 'tribes', label: 'Tribus', icon: 'flag-outline' },
  { value: 'achievements', label: 'Logros', icon: 'trophy-outline' },
  { value: 'system', label: 'Sistema', icon: 'settings-outline' },
];

export default notificationsService;
