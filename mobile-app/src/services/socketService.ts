import { io, Socket } from 'socket.io-client';
import { apiConfig } from './apiClient';

export interface NotificationData {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  userId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'social' | 'events' | 'tribes' | 'system' | 'achievements';
  read: boolean;
  delivered: boolean;
  createdAt: string;
}

export interface SocketEventHandlers {
  onNewNotification?: (notification: NotificationData) => void;
  onNotificationRead?: (notificationId: string) => void;
  onNotificationUpdate?: (notification: NotificationData) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private eventHandlers: SocketEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscriptions = new Map<string, Set<any>>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect(token: string, handlers: SocketEventHandlers = {}) {
    if (this.socket?.connected) {
      this.socket.auth = { token };
      this.eventHandlers = handlers;
      return;
    }

    this.eventHandlers = handlers;

    // Create socket connection
    this.socket?.disconnect();
    this.socket = io(apiConfig.baseURL.replace(/\/api(?:\/v1)?\/?$/, ''), {
      auth: {
        token,
      },
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
    this.subscriptions.forEach((callbacks, event) => callbacks.forEach(callback => this.socket?.on(event, callback)));
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      this.eventHandlers.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.eventHandlers.onDisconnect?.();
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.eventHandlers.onError?.(error);
      this.handleReconnect();
    });

    // Notification events
    this.socket.on('newNotification', (notification: NotificationData) => {
      const document = (notification as NotificationData & { notification?: NotificationData }).notification ?? notification;
      if (document?._id && typeof document.title === 'string') this.eventHandlers.onNewNotification?.(document);
    });

    this.socket.on('notificationRead', (notificationId: string) => {
      this.eventHandlers.onNotificationRead?.(notificationId);
    });

    this.socket.on('notificationUpdate', (notification: NotificationData) => {
      this.eventHandlers.onNotificationUpdate?.(notification);
    });

    // User presence events
    this.socket.on('userPresenceUpdate', (data: { userId: string; isOnline: boolean }) => {
      // Handle user presence updates if needed
    });

    // Chat events (for future chat implementation)
    this.socket.on('newMessage', (message: any) => {
      // Handle chat messages if needed
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isConnected && this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.eventHandlers = {};
  }

  // Notification-specific methods
  markNotificationAsRead(notificationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('markNotificationRead', notificationId);
    }
  }

  markAllNotificationsAsRead() {
    if (this.socket?.connected) {
      this.socket.emit('markAllNotificationsRead');
    }
  }

  // Join user-specific notification room
  joinNotificationRoom(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('joinNotificationRoom', userId);
    }
  }

  // Leave notification room
  leaveNotificationRoom(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leaveNotificationRoom', userId);
    }
  }

  // Update user presence
  updateUserPresence(isOnline: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('updatePresence', { isOnline });
    }
  }

  // Getters
  get connected() {
    return this.isConnected && this.socket?.connected;
  }

  get socketId() {
    return this.socket?.id;
  }

  // Generic event listeners
  on(event: string, callback: any) {
    if (!this.subscriptions.has(event)) this.subscriptions.set(event, new Set());
    this.subscriptions.get(event)!.add(callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: any) {
    if (callback) this.subscriptions.get(event)?.delete(callback);
    else this.subscriptions.delete(event);
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any) { this.socket?.emit(event, data); }
}

// Create singleton instance
export const socketService = new SocketService();

// Hook for React components
export const useSocket = () => {
  return {
    connect: socketService.connect.bind(socketService),
    disconnect: socketService.disconnect.bind(socketService),
    markNotificationAsRead: socketService.markNotificationAsRead.bind(socketService),
    markAllNotificationsAsRead: socketService.markAllNotificationsAsRead.bind(socketService),
    joinNotificationRoom: socketService.joinNotificationRoom.bind(socketService),
    leaveNotificationRoom: socketService.leaveNotificationRoom.bind(socketService),
    updateUserPresence: socketService.updateUserPresence.bind(socketService),
    on: socketService.on.bind(socketService),
    off: socketService.off.bind(socketService),
    connected: socketService.connected,
    socketId: socketService.socketId,
  };
};

export default socketService;
