import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { Notification, NotificationType, ApiResponse, PaginatedResponse } from '../types/api.types';

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  eventReminders: boolean;
  eventUpdates: boolean;
  newFollowers: boolean;
  messages: boolean;
  tribeInvitations: boolean;
  achievements: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async getNotifications(filters: NotificationFilters = {}): Promise<PaginatedResponse<Notification>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<Notification>> =
        await axios.get(`${this.apiBaseUrl}/notifications?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener notificaciones');
    }
  }

  public async getNotificationById(notificationId: string): Promise<Notification> {
    try {
      const response: AxiosResponse<ApiResponse<Notification>> =
        await axios.get(`${this.apiBaseUrl}/notifications/${notificationId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Notificación no encontrada');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener notificación');
    }
  }

  public async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.put(`${this.apiBaseUrl}/notifications/${notificationId}/read`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al marcar como leída');
    }
  }

  public async markAllAsRead(): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.put(`${this.apiBaseUrl}/notifications/read-all`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al marcar todas como leídas');
    }
  }

  public async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/notifications/${notificationId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar notificación');
    }
  }

  public async deleteAllNotifications(): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/notifications/delete-all`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar todas las notificaciones');
    }
  }

  public async getUnreadCount(): Promise<number> {
    try {
      const response: AxiosResponse<ApiResponse<{ count: number }>> =
        await axios.get(`${this.apiBaseUrl}/notifications/unread-count`);

      if (response.data.success && response.data.data) {
        return response.data.data.count;
      }

      return 0;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener contador de no leídas');
    }
  }

  public async getSettings(): Promise<NotificationSettings> {
    try {
      const response: AxiosResponse<ApiResponse<NotificationSettings>> =
        await axios.get(`${this.apiBaseUrl}/notifications/settings`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Error al obtener configuración');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener configuración de notificaciones');
    }
  }

  public async updateSettings(settings: Partial<NotificationSettings>): Promise<ApiResponse<NotificationSettings>> {
    try {
      const response: AxiosResponse<ApiResponse<NotificationSettings>> =
        await axios.put(`${this.apiBaseUrl}/notifications/settings`, settings);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar configuración');
    }
  }

  public async registerPushToken(token: string, platform: 'web' | 'ios' | 'android'): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/notifications/push-token`, { token, platform });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al registrar token de push');
    }
  }

  public async unregisterPushToken(token: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/notifications/push-token/${token}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al desregistrar token');
    }
  }

  public async testNotification(type: NotificationType): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/notifications/test`, { type });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al enviar notificación de prueba');
    }
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;