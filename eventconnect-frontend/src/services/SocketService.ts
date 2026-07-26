import { io, Socket } from 'socket.io-client';
import type { ChatMessage, Notification } from '../types/api.types';

type SocketEventCallback = (...args: any[]) => void;

interface TypingUser {
  userId: string;
  username: string;
  roomId: string;
}

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventListeners: Map<string, Set<SocketEventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(token: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupDefaultListeners();
  }

  private setupDefaultListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connection-status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
      this.emit('connection-status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection-failed', { error });
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket-error', { error });
    });

    // Chat events
    this.socket.on('new-message', (message: ChatMessage) => {
      this.emit('new-message', message);
    });

    this.socket.on('message-updated', (message: ChatMessage) => {
      this.emit('message-updated', message);
    });

    this.socket.on('message-deleted', (data: { messageId: string; roomId: string }) => {
      this.emit('message-deleted', data);
    });

    this.socket.on('user-typing', (data: TypingUser) => {
      this.emit('user-typing', data);
    });

    this.socket.on('user-stop-typing', (data: TypingUser) => {
      this.emit('user-stop-typing', data);
    });

    this.socket.on('user-online', (data: { userId: string }) => {
      this.emit('user-online', data);
    });

    this.socket.on('user-offline', (data: { userId: string }) => {
      this.emit('user-offline', data);
    });

    // Notification events
    this.socket.on('new-notification', (notification: Notification) => {
      this.emit('new-notification', notification);
    });

    // Event updates
    this.socket.on('event-updated', (data: { eventId: string; changes: any }) => {
      this.emit('event-updated', data);
    });

    this.socket.on('event-cancelled', (data: { eventId: string; reason: string }) => {
      this.emit('event-cancelled', data);
    });

    // Tribe events
    this.socket.on('tribe-updated', (data: { tribeId: string; changes: any }) => {
      this.emit('tribe-updated', data);
    });

    this.socket.on('new-tribe-member', (data: { tribeId: string; member: any }) => {
      this.emit('new-tribe-member', data);
    });

    // Live updates
    this.socket.on('live-update', (data: any) => {
      this.emit('live-update', data);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.reconnectAttempts = 0;
      this.eventListeners.clear();
    }
  }

  public isConnected(): boolean {
    return this.connected && !!this.socket?.connected;
  }

  // Chat methods
  public joinRoom(roomId: string): void {
    if (!this.socket) return;
    this.socket.emit('join-room', { roomId });
  }

  public leaveRoom(roomId: string): void {
    if (!this.socket) return;
    this.socket.emit('leave-room', { roomId });
  }

  public sendMessage(roomId: string, message: string, metadata?: any): void {
    if (!this.socket) return;
    this.socket.emit('send-message', {
      roomId,
      content: message,
      ...metadata
    });
  }

  public startTyping(roomId: string): void {
    if (!this.socket) return;
    this.socket.emit('typing', { roomId });
  }

  public stopTyping(roomId: string): void {
    if (!this.socket) return;
    this.socket.emit('stop-typing', { roomId });
  }

  public markMessageAsRead(messageId: string, roomId: string): void {
    if (!this.socket) return;
    this.socket.emit('mark-read', { messageId, roomId });
  }

  // Event methods
  public subscribeToEvent(eventId: string): void {
    if (!this.socket) return;
    this.socket.emit('subscribe-event', { eventId });
  }

  public unsubscribeFromEvent(eventId: string): void {
    if (!this.socket) return;
    this.socket.emit('unsubscribe-event', { eventId });
  }

  public sendLiveEventUpdate(eventId: string, update: any): void {
    if (!this.socket) return;
    this.socket.emit('live-event-update', { eventId, update });
  }

  // Tribe methods
  public subscribeToTribe(tribeId: string): void {
    if (!this.socket) return;
    this.socket.emit('subscribe-tribe', { tribeId });
  }

  public unsubscribeFromTribe(tribeId: string): void {
    if (!this.socket) return;
    this.socket.emit('unsubscribe-tribe', { tribeId });
  }

  // Notification methods
  public subscribeToNotifications(): void {
    if (!this.socket) return;
    this.socket.emit('subscribe-notifications');
  }

  public unsubscribeFromNotifications(): void {
    if (!this.socket) return;
    this.socket.emit('unsubscribe-notifications');
  }

  // Presence methods
  public updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    if (!this.socket) return;
    this.socket.emit('update-presence', { status });
  }

  public requestUserPresence(userIds: string[]): void {
    if (!this.socket) return;
    this.socket.emit('request-presence', { userIds });
  }

  // Event listener management
  public on(eventName: string, callback: SocketEventCallback): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(callback);
  }

  public off(eventName: string, callback?: SocketEventCallback): void {
    if (!callback) {
      this.eventListeners.delete(eventName);
      return;
    }

    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    }
  }

  private emit(eventName: string, data?: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${eventName}:`, error);
        }
      });
    }
  }

  // Direct socket emit (for custom events)
  public emitCustomEvent(eventName: string, data?: any): void {
    if (!this.socket) return;
    this.socket.emit(eventName, data);
  }

  // Listen to custom events
  public onCustomEvent(eventName: string, callback: SocketEventCallback): void {
    if (!this.socket) return;
    this.socket.on(eventName, callback);
  }

  public offCustomEvent(eventName: string, callback?: SocketEventCallback): void {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(eventName, callback);
    } else {
      this.socket.off(eventName);
    }
  }

  // Utility methods
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  public forceReconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }
}

export const socketService = SocketService.getInstance();
export default socketService;