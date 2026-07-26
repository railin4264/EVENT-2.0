import { useState, useEffect, useCallback } from 'react';
import { offlineManager } from '../utils/offline';
import { Event, User, Notification, Message } from '../types';
import { eventService } from '../services/EventService';
import { chatService } from '../services/ChatService';
import { notificationsService } from '../services/notificationsService';

export interface OfflineState {
  isOnline: boolean;
  pendingActionsCount: number;
  lastSyncTime: number | null;
  cacheSize: number;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: offlineManager.getNetworkStatus(),
    pendingActionsCount: 0,
    lastSyncTime: null,
    cacheSize: 0,
  });

  const updateState = useCallback(async () => {
    try {
      const pendingActions = await offlineManager.getPendingActions();
      const lastSync = await offlineManager.getLastSync();
      const cacheSize = await offlineManager.getCacheSize();

      // Get the most recent sync time
      const syncTimes = Object.values(lastSync);
      const lastSyncTime = syncTimes.length > 0 ? Math.max(...syncTimes) : null;

      setState(prevState => ({
        ...prevState,
        pendingActionsCount: pendingActions.length,
        lastSyncTime,
        cacheSize,
      }));
    } catch (error) {
      console.error('Error updating offline state:', error);
    }
  }, []);

  useEffect(() => {
    // Update state on mount
    updateState();

    // Listen for network changes
    const unsubscribe = offlineManager.onNetworkChange((isOnline) => {
      setState(prevState => ({
        ...prevState,
        isOnline,
      }));

      // Update other state when network status changes
      updateState();
    });

    return unsubscribe;
  }, [updateState]);

  const syncNow = useCallback(async () => {
    await offlineManager.syncPendingActions();
    await updateState();
  }, [updateState]);

  const clearCache = useCallback(async () => {
    await offlineManager.clearAllCache();
    await updateState();
  }, [updateState]);

  const clearExpiredCache = useCallback(async () => {
    await offlineManager.clearExpiredCache();
    await updateState();
  }, [updateState]);

  return {
    ...state,
    syncNow,
    clearCache,
    clearExpiredCache,
  };
}

export function useOfflineEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const isOnline = offlineManager.getNetworkStatus();
      const shouldRefresh = forceRefresh || await offlineManager.shouldRefreshData('events');

      if (isOnline && shouldRefresh) {
        // Try to fetch from API
        try {
          // Fetch fresh events from API
          const freshEvents = await eventService.getEvents();
          const eventsArray = Array.isArray(freshEvents) ? freshEvents : (freshEvents as any).data ?? [];
          await offlineManager.cacheEvents(eventsArray);
          // setEvents(eventsArray);

          // For now, use cached data
          const cachedEvents = await offlineManager.getCachedEvents();
          setEvents(cachedEvents);
        } catch (apiError) {
          console.error('API call failed, using cached data:', apiError);
          const cachedEvents = await offlineManager.getCachedEvents();
          setEvents(cachedEvents);
          setError('Using cached data due to network error');
        }
      } else {
        // Use cached data
        const cachedEvents = await offlineManager.getCachedEvents();
        setEvents(cachedEvents);

        if (!isOnline && cachedEvents.length === 0) {
          setError('No cached data available and device is offline');
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  const joinEvent = useCallback(async (eventId: string) => {
    const isOnline = offlineManager.getNetworkStatus();

    if (isOnline) {
      try {
        // Join event via API
        await eventService.joinEvent(eventId);
        console.log('Joined event online:', eventId);
      } catch (error) {
        // If API fails, queue for later
        await offlineManager.addPendingAction({
          type: 'join_event',
          data: { eventId },
        });
        console.log('Queued join event action for offline sync');
      }
    } else {
      // Queue action for when online
      await offlineManager.addPendingAction({
        type: 'join_event',
        data: { eventId },
      });
      console.log('Queued join event action for offline sync');
    }

    // Update local state optimistically
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? { ...event, currentAttendees: event.currentAttendees + 1 }
          : event
      )
    );
  }, []);

  const leaveEvent = useCallback(async (eventId: string) => {
    const isOnline = offlineManager.getNetworkStatus();

    if (isOnline) {
      try {
        // Leave event via API
        await eventService.leaveEvent(eventId);
        console.log('Left event online:', eventId);
      } catch (error) {
        // If API fails, queue for later
        await offlineManager.addPendingAction({
          type: 'leave_event',
          data: { eventId },
        });
        console.log('Queued leave event action for offline sync');
      }
    } else {
      // Queue action for when online
      await offlineManager.addPendingAction({
        type: 'leave_event',
        data: { eventId },
      });
      console.log('Queued leave event action for offline sync');
    }

    // Update local state optimistically
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? { ...event, currentAttendees: Math.max(0, event.currentAttendees - 1) }
          : event
      )
    );
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    loading,
    error,
    refreshEvents: () => loadEvents(true),
    joinEvent,
    leaveEvent,
  };
}

export function useOfflineMessages(chatId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const isOnline = offlineManager.getNetworkStatus();
      const shouldRefresh = forceRefresh || await offlineManager.shouldRefreshData('messages');

      if (isOnline && shouldRefresh) {
        try {
          let freshMessages: Message[] = [];
          if (chatId) {
            const response = await chatService.getMessages(chatId);
            freshMessages = response.data;
          }
          await offlineManager.cacheMessages(freshMessages);
          setMessages(freshMessages);

          // For now, use cached data
          const cachedMessages = await offlineManager.getCachedMessages();
          setMessages(cachedMessages);
        } catch (apiError) {
          console.error('API call failed, using cached data:', apiError);
          const cachedMessages = await offlineManager.getCachedMessages();
          setMessages(cachedMessages);
          setError('Using cached data due to network error');
        }
      } else {
        const cachedMessages = await offlineManager.getCachedMessages();
        setMessages(cachedMessages);

        if (!isOnline && cachedMessages.length === 0) {
          setError('No cached data available and device is offline');
        }
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (messageData: Omit<Message, 'id' | 'createdAt' | 'isRead'>) => {
    const isOnline = offlineManager.getNetworkStatus();
    const tempId = `temp_${Date.now()}`;

    // Create optimistic message
    const optimisticMessage: Message = {
      ...messageData,
      id: tempId,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    // Update local state immediately
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);

    if (isOnline) {
      try {
        if (!chatId) throw new Error("chatId required to send message");
        const response = await chatService.sendMessage({
          chatId,
          content: messageData.content,
          messageType: messageData.messageType === ('system' as any) ? 'text' : messageData.messageType as any
        });
        const sentMessage = response.data;

        // Update with real message from server
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === tempId ? (sentMessage as unknown as Message) : msg
          )
        );

        console.log('Message sent online');
      } catch (error) {
        // If API fails, queue for later
        await offlineManager.addPendingAction({
          type: 'send_message',
          data: messageData,
        });
        console.log('Queued send message action for offline sync');
      }
    } else {
      // Queue action for when online
      await offlineManager.addPendingAction({
        type: 'send_message',
        data: messageData,
      });
      console.log('Queued send message action for offline sync');
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    refreshMessages: () => loadMessages(true),
    sendMessage,
  };
}

export function useOfflineNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const isOnline = offlineManager.getNetworkStatus();
      const shouldRefresh = forceRefresh || await offlineManager.shouldRefreshData('notifications');

      if (isOnline && shouldRefresh) {
        try {
          const response = await notificationsService.getNotifications();
          const freshNotifications = response.notifications;
          await offlineManager.cacheNotifications(freshNotifications as any);
          setNotifications(freshNotifications as any);

          // For now, use cached data
          const cachedNotifications = await offlineManager.getCachedNotifications();
          setNotifications(cachedNotifications);
        } catch (apiError) {
          console.error('API call failed, using cached data:', apiError);
          const cachedNotifications = await offlineManager.getCachedNotifications();
          setNotifications(cachedNotifications);
          setError('Using cached data due to network error');
        }
      } else {
        const cachedNotifications = await offlineManager.getCachedNotifications();
        setNotifications(cachedNotifications);

        if (!isOnline && cachedNotifications.length === 0) {
          setError('No cached data available and device is offline');
        }
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Update local state immediately
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );

    const isOnline = offlineManager.getNetworkStatus();

    if (isOnline) {
      try {
        await notificationsService.markAsRead(notificationId);
        console.log('Marked notification as read online:', notificationId);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    // Note: We don't queue this action for offline sync as it's not critical
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    error,
    refreshNotifications: () => loadNotifications(true),
    markAsRead,
  };
}