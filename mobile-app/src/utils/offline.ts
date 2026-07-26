import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Event, User, Notification, Message } from '../types';
import { apiClient } from '../services/apiClient';

// Storage keys
const STORAGE_KEYS = {
  EVENTS: '@eventconnect/events',
  USERS: '@eventconnect/users',
  NOTIFICATIONS: '@eventconnect/notifications',
  MESSAGES: '@eventconnect/messages',
  USER_PROFILE: '@eventconnect/user_profile',
  PENDING_ACTIONS: '@eventconnect/pending_actions',
  LAST_SYNC: '@eventconnect/last_sync',
  CACHED_IMAGES: '@eventconnect/cached_images',
} as const;

// Pending action types
export interface PendingAction {
  id: string;
  type: 'create_event' | 'join_event' | 'leave_event' | 'send_message' | 'like_post' | 'follow_user';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineManager {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: ((isOnline: boolean) => void)[] = [];

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      this.listeners.forEach(listener => listener(this.isOnline));

      // If we just came back online, trigger sync
      if (wasOffline && this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  // Network status
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Data caching
  async cacheEvents(events: Event[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      await this.updateLastSync('events');
    } catch (error) {
      console.error('Error caching events:', error);
    }
  }

  async getCachedEvents(): Promise<Event[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached events:', error);
      return [];
    }
  }

  async cacheUsers(users: User[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      await this.updateLastSync('users');
    } catch (error) {
      console.error('Error caching users:', error);
    }
  }

  async getCachedUsers(): Promise<User[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached users:', error);
      return [];
    }
  }

  async cacheNotifications(notifications: Notification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      await this.updateLastSync('notifications');
    } catch (error) {
      console.error('Error caching notifications:', error);
    }
  }

  async getCachedNotifications(): Promise<Notification[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached notifications:', error);
      return [];
    }
  }

  async cacheMessages(messages: Message[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
      await this.updateLastSync('messages');
    } catch (error) {
      console.error('Error caching messages:', error);
    }
  }

  async getCachedMessages(): Promise<Message[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return [];
    }
  }

  async cacheUserProfile(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
      await this.updateLastSync('user_profile');
    } catch (error) {
      console.error('Error caching user profile:', error);
    }
  }

  async getCachedUserProfile(): Promise<User | null> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached user profile:', error);
      return null;
    }
  }

  // Image caching
  async cacheImage(url: string, base64: string): Promise<void> {
    try {
      const cached = await this.getCachedImages();
      cached[url] = {
        data: base64,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_IMAGES, JSON.stringify(cached));
    } catch (error) {
      console.error('Error caching image:', error);
    }
  }

  async getCachedImage(url: string): Promise<string | null> {
    try {
      const cached = await this.getCachedImages();
      const image = cached[url];

      if (image) {
        // Check if image is not too old (7 days)
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        if (Date.now() - image.timestamp < maxAge) {
          return image.data;
        } else {
          // Remove expired image
          delete cached[url];
          await AsyncStorage.setItem(STORAGE_KEYS.CACHED_IMAGES, JSON.stringify(cached));
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  private async getCachedImages(): Promise<Record<string, { data: string; timestamp: number }>> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_IMAGES);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Error getting cached images:', error);
      return {};
    }
  }

  // Pending actions
  async addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      const newAction: PendingAction = {
        ...action,
        id: Date.now().toString(),
        timestamp: Date.now(),
        retryCount: 0,
      };

      pendingActions.push(newAction);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pendingActions));
    } catch (error) {
      console.error('Error adding pending action:', error);
    }
  }

  async getPendingActions(): Promise<PendingAction[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  }

  async removePendingAction(actionId: string): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      const filtered = pendingActions.filter(action => action.id !== actionId);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending action:', error);
    }
  }

  async updatePendingActionRetryCount(actionId: string): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      const actionIndex = pendingActions.findIndex(action => action.id === actionId);

      if (actionIndex > -1) {
        pendingActions[actionIndex].retryCount += 1;
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pendingActions));
      }
    } catch (error) {
      console.error('Error updating retry count:', error);
    }
  }

  // Sync operations
  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingActions = await this.getPendingActions();

      for (const action of pendingActions) {
        if (action.retryCount >= 3) {
          await this.removePendingAction(action.id);
          continue;
        }

        try {
          await this.executePendingAction(action);
          await this.removePendingAction(action.id);
        } catch {
          await this.updatePendingActionRetryCount(action.id);
        }
      }
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executePendingAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'create_event':
        await apiClient.post('/events', action.data);
        break;
      case 'join_event':
        await apiClient.post(`/events/${action.data.eventId}/attend`);
        break;
      case 'leave_event':
        await apiClient.delete(`/events/${action.data.eventId}/attend`);
        break;
      case 'send_message':
        await apiClient.post('/chat/messages', action.data);
        break;
      case 'like_post':
        await apiClient.post(`/feed/${action.data.postId}/like`);
        break;
      case 'follow_user':
        await apiClient.post(`/follows/${action.data.userId}`);
        break;
      default:
        throw new Error(`Unknown action type: ${(action as PendingAction).type}`);
    }
  }

  // Last sync tracking
  private async updateLastSync(dataType: string): Promise<void> {
    try {
      const lastSync = await this.getLastSync();
      lastSync[dataType] = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(lastSync));
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }

  async getLastSync(): Promise<Record<string, number>> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Error getting last sync:', error);
      return {};
    }
  }

  async shouldRefreshData(dataType: string, maxAge: number = 5 * 60 * 1000): Promise<boolean> {
    const lastSync = await this.getLastSync();
    const lastSyncTime = lastSync[dataType] || 0;
    return Date.now() - lastSyncTime > maxAge;
  }

  // Cache management
  async clearAllCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.EVENTS,
        STORAGE_KEYS.USERS,
        STORAGE_KEYS.NOTIFICATIONS,
        STORAGE_KEYS.MESSAGES,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.CACHED_IMAGES,
        STORAGE_KEYS.LAST_SYNC,
      ]);
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const values = await AsyncStorage.multiGet(keys);

      let totalSize = 0;
      values.forEach(([key, value]) => {
        if (value) {
          totalSize += value.length;
        }
      });

      return totalSize; // Size in bytes
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  async clearExpiredCache(): Promise<void> {
    try {
      // Clear expired images
      const cachedImages = await this.getCachedImages();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();

      const validImages: Record<string, { data: string; timestamp: number }> = {};
      Object.entries(cachedImages).forEach(([url, image]) => {
        if (now - image.timestamp < maxAge) {
          validImages[url] = image;
        }
      });

      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_IMAGES, JSON.stringify(validImages));

      const pendingActions = await this.getPendingActions();
      const validActions = pendingActions.filter(action => {
        return now - action.timestamp < 24 * 60 * 60 * 1000;
      });

      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(validActions));
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
}

export const offlineManager = new OfflineManager();