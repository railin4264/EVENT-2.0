import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { notificationDestination } from '../utils/notificationDestination';
import { useAuth } from './AuthContext';
import { socketService, NotificationData, SocketEventHandlers } from '../services/socketService';
import { notificationsService } from '../services/notificationsService';

interface NotificationsContextType {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  connected: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const alive = useRef(true);
  const active = useRef({ owner: user?._id, token });
  if (active.current.owner !== user?._id || active.current.token !== token) active.current = { owner: user?._id, token };
  const scope = active.current;
  const isCurrent = () => alive.current && active.current === scope && Boolean(scope.owner && scope.token);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isCurrent()) return;

    try {
      setLoading(true);
      const response = await notificationsService.getNotifications();
      
      if (isCurrent() && response.success) {
        setNotifications(response.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [scope]);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isCurrent()) return;

    try {
      const response = await notificationsService.getUnreadCount();
      if (isCurrent() && response.success) {
        setUnreadCount(response.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [scope]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isCurrent()) return;
    try {
      const response = await notificationsService.markAsRead(notificationId);
      
      if (isCurrent() && response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification._id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
        
        // Update unread count
        void refreshUnreadCount();
        
        // Emit socket event
        socketService.markNotificationAsRead(notificationId);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      if (isCurrent()) Alert.alert('Error', 'No se pudo marcar la notificación como leída');
    }
  }, [scope]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!isCurrent()) return;
    try {
      const response = await notificationsService.markAllAsRead();
      
      if (isCurrent() && response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        
        // Reset unread count
        setUnreadCount(0);
        
        // Emit socket event
        socketService.markAllNotificationsAsRead();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      if (isCurrent()) Alert.alert('Error', 'No se pudieron marcar todas las notificaciones como leídas');
    }
  }, [scope]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!isCurrent()) return;
    try {
      const response = await notificationsService.deleteNotification(notificationId);
      
      if (isCurrent() && response.success) {
        // Update local state
        const deletedNotification = notifications.find(n => n._id === notificationId);
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        
        // Update unread count if the deleted notification was unread
        if (deletedNotification && !deletedNotification.read) {
          void refreshUnreadCount();
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      if (isCurrent()) Alert.alert('Error', 'No se pudo eliminar la notificación');
    }
  }, [notifications, scope, refreshUnreadCount]);

  // Socket event handlers
  const socketHandlers: SocketEventHandlers = {
    onNewNotification: (notification: NotificationData) => {
      if (!isCurrent()) return;
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev.filter(item => item._id !== notification._id)].slice(0, 100));
      
      // Update unread count
      if (!notification.read) {
        void refreshUnreadCount();
      }
      
      // Show in-app notification (optional)
      Alert.alert(
        notification.title,
        notification.message,
        [
          { text: 'Cerrar', style: 'cancel' },
          { 
            text: 'Ver', 
            onPress: () => {
              if (isCurrent()) router.push(notificationDestination(notification) as Href);
            }
          }
        ]
      );
    },

    onNotificationRead: (notificationId: string) => {
      if (!isCurrent()) return;
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    },

    onNotificationUpdate: (notification: NotificationData) => {
      if (!isCurrent()) return;
      
      // Update existing notification
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? notification : n)
      );
    },

    onConnect: () => {
      if (!isCurrent()) return;
      setConnected(true);
      
      // Join user-specific notification room
      if (user?._id) {
        socketService.joinNotificationRoom(user._id);
      }
      
      // Refresh notifications and unread count
      fetchNotifications();
      refreshUnreadCount();
    },

    onDisconnect: () => {
      if (isCurrent()) setConnected(false);
    },

    onError: (error: any) => {
      console.error('Socket error for notifications:', error);
      setConnected(false);
    },
  };

  // Connect socket when user is authenticated
  useEffect(() => {
    alive.current = true;
    socketService.disconnect();
    setConnected(false); setLoading(false); setNotifications([]); setUnreadCount(0);
    if (user && token) {
      socketService.connect(token, socketHandlers);
      
      // Initial data fetch
      fetchNotifications();
      refreshUnreadCount();
    } else {
      socketService.disconnect();
      setConnected(false);
      setNotifications([]);
      setUnreadCount(0);
    }

    // Cleanup on unmount
    return () => {
      alive.current = false;
      socketService.disconnect();
      if (user?._id) {
        socketService.leaveNotificationRoom(user._id);
      }
    };
  }, [scope]);

  // Update user presence when app state changes
  useEffect(() => {
    if (connected && user) {
      socketService.updateUserPresence(true);
      
      // Set user as offline when component unmounts
      return () => {
        socketService.updateUserPresence(false);
      };
    }
  }, [connected, user]);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    loading,
    connected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshUnreadCount,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

// Hook for notification badge count
export function useNotificationBadge() {
  const { unreadCount } = useNotifications();
  
  return {
    count: unreadCount,
    hasUnread: unreadCount > 0,
    displayCount: unreadCount > 99 ? '99+' : unreadCount.toString(),
  };
}
