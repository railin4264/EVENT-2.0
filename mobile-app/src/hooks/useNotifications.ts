import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationManager, NotificationPreferences } from '../utils/notifications';

export interface NotificationState {
  permissions: Notifications.NotificationPermissionsStatus | null;
  pushToken: string | null;
  preferences: NotificationPreferences | null;
  scheduledCount: number;
  isInitialized: boolean;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    permissions: null,
    pushToken: null,
    preferences: null,
    scheduledCount: 0,
    isInitialized: false,
  });

  const updateState = useCallback(async () => {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      const pushToken = await notificationManager.getPushToken();
      const preferences = await notificationManager.getPreferences();
      const scheduled = await notificationManager.getScheduledNotifications();

      setState(prevState => ({
        ...prevState,
        permissions,
        pushToken,
        preferences,
        scheduledCount: scheduled.length,
      }));
    } catch (error) {
      console.error('Error updating notification state:', error);
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      await notificationManager.initialize();
      await updateState();
      setState(prevState => ({ ...prevState, isInitialized: true }));
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }, [updateState]);

  const requestPermissions = useCallback(async () => {
    try {
      const permissions = await Notifications.requestPermissionsAsync();
      await updateState();
      return permissions.status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }, [updateState]);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      await notificationManager.updatePreferences(newPreferences);
      await updateState();
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, [updateState]);

  const scheduleEventReminder = useCallback(async (eventId: string, eventTitle: string, reminderTime: Date) => {
    try {
      const notificationId = await notificationManager.scheduleEventReminder(eventId, eventTitle, reminderTime);
      await updateState();
      return notificationId;
    } catch (error) {
      console.error('Error scheduling event reminder:', error);
      return null;
    }
  }, [updateState]);

  const showAchievementNotification = useCallback(async (achievementName: string, points: number) => {
    try {
      const notificationId = await notificationManager.scheduleAchievementNotification(achievementName, points);
      await updateState();
      return notificationId;
    } catch (error) {
      console.error('Error showing achievement notification:', error);
      return null;
    }
  }, [updateState]);

  const showMessageNotification = useCallback(async (senderName: string, message: string, chatId: string) => {
    try {
      const notificationId = await notificationManager.showIncomingMessageNotification(senderName, message, chatId);
      await updateState();
      return notificationId;
    } catch (error) {
      console.error('Error showing message notification:', error);
      return null;
    }
  }, [updateState]);

  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationManager.cancelNotification(notificationId);
      await updateState();
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }, [updateState]);

  const cancelAllNotifications = useCallback(async () => {
    try {
      await notificationManager.cancelAllNotifications();
      await updateState();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }, [updateState]);

  const setBadgeCount = useCallback(async (count: number) => {
    try {
      await notificationManager.setBadgeCount(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    try {
      await notificationManager.clearBadge();
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }, []);

  const testNotification = useCallback(async () => {
    try {
      await notificationManager.testNotification();
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    requestPermissions,
    updatePreferences,
    scheduleEventReminder,
    showAchievementNotification,
    showMessageNotification,
    cancelNotification,
    cancelAllNotifications,
    setBadgeCount,
    clearBadge,
    testNotification,
  };
}

export function useNotificationListeners() {
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const [lastResponse, setLastResponse] = useState<Notifications.NotificationResponse | null>(null);

  useEffect(() => {
    const notificationListener = notificationManager.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setLastNotification(notification);
    });

    const responseListener = notificationManager.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      setLastResponse(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return {
    lastNotification,
    lastResponse,
  };
}

export function useEventReminders() {
  const [reminders, setReminders] = useState<Map<string, string>>(new Map());

  const scheduleReminder = useCallback(async (
    eventId: string,
    eventTitle: string,
    eventDate: Date,
    reminderMinutes: number = 30
  ) => {
    try {
      const reminderTime = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);

      // Don't schedule if reminder time is in the past
      if (reminderTime <= new Date()) {
        console.warn('Reminder time is in the past, skipping:', reminderTime);
        return null;
      }

      const notificationId = await notificationManager.scheduleEventReminder(eventId, eventTitle, reminderTime);

      if (notificationId) {
        setReminders(prev => new Map(prev.set(eventId, notificationId)));
      }

      return notificationId;
    } catch (error) {
      console.error('Error scheduling event reminder:', error);
      return null;
    }
  }, []);

  const cancelReminder = useCallback(async (eventId: string) => {
    try {
      const notificationId = reminders.get(eventId);
      if (notificationId) {
        await notificationManager.cancelNotification(notificationId);
        setReminders(prev => {
          const newMap = new Map(prev);
          newMap.delete(eventId);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error cancelling event reminder:', error);
    }
  }, [reminders]);

  const hasReminder = useCallback((eventId: string) => {
    return reminders.has(eventId);
  }, [reminders]);

  const updateReminder = useCallback(async (
    eventId: string,
    eventTitle: string,
    eventDate: Date,
    reminderMinutes: number = 30
  ) => {
    // Cancel existing reminder first
    await cancelReminder(eventId);

    // Schedule new reminder
    return await scheduleReminder(eventId, eventTitle, eventDate, reminderMinutes);
  }, [cancelReminder, scheduleReminder]);

  return {
    scheduleReminder,
    cancelReminder,
    updateReminder,
    hasReminder,
    reminderCount: reminders.size,
  };
}

export function useBadgeManager() {
  const [badgeCount, setBadgeCountState] = useState(0);

  const updateBadgeCount = useCallback(async (count: number) => {
    try {
      await notificationManager.setBadgeCount(count);
      setBadgeCountState(count);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }, []);

  const incrementBadge = useCallback(async () => {
    const newCount = badgeCount + 1;
    await updateBadgeCount(newCount);
  }, [badgeCount, updateBadgeCount]);

  const decrementBadge = useCallback(async () => {
    const newCount = Math.max(0, badgeCount - 1);
    await updateBadgeCount(newCount);
  }, [badgeCount, updateBadgeCount]);

  const clearBadge = useCallback(async () => {
    await updateBadgeCount(0);
  }, [updateBadgeCount]);

  return {
    badgeCount,
    updateBadgeCount,
    incrementBadge,
    decrementBadge,
    clearBadge,
  };
}