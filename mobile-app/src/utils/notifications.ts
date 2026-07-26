import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationsService from '../services/notificationsService';

// Storage key for notification preferences
const NOTIFICATION_PREFERENCES_KEY = '@eventconnect/notification_preferences';

export interface NotificationPreferences {
  eventsReminders: boolean;
  eventInvites: boolean;
  socialActivity: boolean;
  messages: boolean;
  achievements: boolean;
  systemUpdates: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

const defaultPreferences: NotificationPreferences = {
  eventsReminders: true,
  eventInvites: true,
  socialActivity: true,
  messages: true,
  achievements: true,
  systemUpdates: true,
  sound: true,
  vibration: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

class NotificationManager {
  private isInitialized = false;
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = defaultPreferences;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // Check user preferences
          await this.loadPreferences();

          const categoryMap: Record<string, keyof NotificationPreferences> = {
            'event_reminder': 'eventsReminders',
            'event_invite': 'eventInvites',
            'social': 'socialActivity',
            'message': 'messages',
            'achievement': 'achievements',
            'system': 'systemUpdates',
          };

          const category = notification.request.content.categoryIdentifier;
          const prefKey = categoryMap[category || ''];

          // Check if notifications are enabled for this category
          const shouldShow = !prefKey || this.preferences[prefKey];

          // Check quiet hours
          const isQuietHours = this.isInQuietHours();
          const shouldSilence = isQuietHours && this.preferences.quietHours.enabled;

          return {
            shouldShowAlert: shouldShow,
            shouldPlaySound: shouldShow && this.preferences.sound && !shouldSilence,
            shouldSetBadge: shouldShow,
          } as any;
        },
      });

      // Request permissions
      await this.requestPermissions();

      // Register for push notifications
      await this.registerForPushNotifications();

      // Load user preferences
      await this.loadPreferences();

      this.isInitialized = true;
      console.log('Notification manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification manager:', error);
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Additional Android 13+ permission request
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'EventConnect',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007AFF',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        // Create specific channels for different notification types
        await this.createNotificationChannels();
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  private async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        id: 'events',
        name: 'Eventos',
        description: 'Notificaciones relacionadas con eventos',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        id: 'messages',
        name: 'Mensajes',
        description: 'Mensajes nuevos y conversaciones',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        id: 'social',
        name: 'Actividad Social',
        description: 'Likes, comentarios y seguimientos',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        id: 'achievements',
        name: 'Logros',
        description: 'Nuevos logros y recompensas',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        id: 'system',
        name: 'Sistema',
        description: 'Actualizaciones y notificaciones del sistema',
        importance: Notifications.AndroidImportance.LOW,
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }
  }

  private async registerForPushNotifications(): Promise<void> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('No Expo project ID found for push notifications');
        return;
      }

      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      this.pushToken = token;
      console.log('Push token:', token);

      // Register token to backend
      await notificationsService.registerPushToken(token);
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  }

  async getPushToken(): Promise<string | null> {
    return this.pushToken;
  }

  // Local notifications
  async scheduleEventReminder(eventId: string, eventTitle: string, reminderTime: Date): Promise<string | null> {
    try {
      if (!this.preferences.eventsReminders) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Recordatorio de Evento',
          body: `"${eventTitle}" comienza pronto`,
          data: {
            eventId,
            type: 'event_reminder',
          },
          categoryIdentifier: 'event_reminder',
          sound: this.preferences.sound ? 'default' : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderTime,
        },
      });

      console.log('Event reminder scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling event reminder:', error);
      return null;
    }
  }

  async scheduleAchievementNotification(achievementName: string, points: number): Promise<string | null> {
    try {
      if (!this.preferences.achievements) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Nuevo Logro Desbloqueado!',
          body: `Has desbloqueado "${achievementName}" (+${points} XP)`,
          data: {
            type: 'achievement',
            achievementName,
            points,
          },
          categoryIdentifier: 'achievement',
          sound: this.preferences.sound ? 'default' : undefined,
        },
        trigger: null, // Immediate
      });

      console.log('Achievement notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling achievement notification:', error);
      return null;
    }
  }

  async showIncomingMessageNotification(senderName: string, message: string, chatId: string): Promise<string | null> {
    try {
      if (!this.preferences.messages) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Mensaje de ${senderName}`,
          body: message,
          data: {
            chatId,
            type: 'message',
          },
          categoryIdentifier: 'message',
          sound: this.preferences.sound ? 'default' : undefined,
        },
        trigger: null, // Immediate
      });

      console.log('Message notification shown:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error showing message notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Preferences management
  async getPreferences(): Promise<NotificationPreferences> {
    return this.preferences;
  }

  async updatePreferences(newPreferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...newPreferences };
      await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(this.preferences));
      console.log('Notification preferences updated');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
      if (stored) {
        this.preferences = { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      this.preferences = defaultPreferences;
    }
  }

  private isInQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { start, end } = this.preferences.quietHours;

    // Handle cases where quiet hours span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  // Badge management
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  // Notification listeners
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Testing utilities (for development)
  async testNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notificación de Prueba',
          body: 'Esta es una notificación de prueba de EventConnect',
          data: { type: 'test' },
        },
        trigger: null, // Immediate
      });
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}

export const notificationManager = new NotificationManager();