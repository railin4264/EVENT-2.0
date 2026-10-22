import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { ApiResponse } from '../types/api.types';

export interface EventAnalytics {
  eventId: string;
  views: number;
  uniqueVisitors: number;
  shares: number;
  favorites: number;
  attendees: number;
  conversionRate: number;
  demographics: {
    ageGroups: Record<string, number>;
    genderDistribution: Record<string, number>;
    locations: { city: string; count: number }[];
  };
  traffic: {
    sources: Record<string, number>;
    devices: Record<string, number>;
  };
  engagement: {
    avgTimeOnPage: number;
    commentsCount: number;
    reactionCount: number;
  };
}

export interface UserAnalytics {
  totalViews: number;
  profileViews: number;
  eventsCreated: number;
  eventsAttended: number;
  postsCount: number;
  engagement: {
    likesReceived: number;
    commentsReceived: number;
    sharesReceived: number;
  };
  followers: {
    total: number;
    growth: { period: string; count: number }[];
  };
  topEvents: { eventId: string; title: string; attendees: number }[];
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalTribes: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  growthRate: number;
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface TimeRange {
  start: string;
  end: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    try {
      await axios.post(`${this.apiBaseUrl}/analytics/track`, {
        eventName,
        properties,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Non-critical, just log
      console.warn('Failed to track event:', error);
    }
  }

  public async getEventAnalytics(eventId: string, timeRange?: TimeRange): Promise<EventAnalytics> {
    try {
      const response: AxiosResponse<ApiResponse<EventAnalytics>> =
        await axios.get(`${this.apiBaseUrl}/analytics/events/${eventId}`, {
          params: timeRange
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Error al obtener analíticas del evento');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener analíticas del evento');
    }
  }

  public async getUserAnalytics(userId?: string, timeRange?: TimeRange): Promise<UserAnalytics> {
    try {
      const url = userId
        ? `${this.apiBaseUrl}/analytics/users/${userId}`
        : `${this.apiBaseUrl}/analytics/my-analytics`;

      const response: AxiosResponse<ApiResponse<UserAnalytics>> =
        await axios.get(url, {
          params: timeRange
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Error al obtener analíticas del usuario');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener analíticas del usuario');
    }
  }

  public async getPlatformStats(timeRange?: TimeRange): Promise<PlatformStats> {
    try {
      const response: AxiosResponse<ApiResponse<PlatformStats>> =
        await axios.get(`${this.apiBaseUrl}/analytics/platform/stats`, {
          params: timeRange
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Error al obtener estadísticas de la plataforma');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener estadísticas de la plataforma');
    }
  }

  public async getEngagementMetrics(resourceType: 'event' | 'post' | 'user', resourceId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    views: number;
    engagementRate: number;
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        likes: number;
        comments: number;
        shares: number;
        views: number;
        engagementRate: number;
      }>> = await axios.get(`${this.apiBaseUrl}/analytics/engagement/${resourceType}/${resourceId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { likes: 0, comments: 0, shares: 0, views: 0, engagementRate: 0 };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener métricas de engagement');
    }
  }

  public async getRevenueReport(timeRange: TimeRange): Promise<{
    total: number;
    byEvent: { eventId: string; eventTitle: string; revenue: number }[];
    byTicketType: Record<string, number>;
    refunds: number;
    net: number;
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        total: number;
        byEvent: { eventId: string; eventTitle: string; revenue: number }[];
        byTicketType: Record<string, number>;
        refunds: number;
        net: number;
      }>> = await axios.get(`${this.apiBaseUrl}/analytics/revenue`, {
        params: timeRange
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { total: 0, byEvent: [], byTicketType: {}, refunds: 0, net: 0 };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener reporte de ingresos');
    }
  }

  public async exportAnalytics(
    type: 'events' | 'users' | 'platform',
    format: 'csv' | 'excel' | 'pdf',
    timeRange?: TimeRange
  ): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> =
        await axios.get(`${this.apiBaseUrl}/analytics/export/${type}`, {
          params: { format, ...timeRange },
          responseType: 'blob'
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al exportar analíticas');
    }
  }

  public async getTopContent(timeRange: TimeRange, limit: number = 10): Promise<{
    topEvents: { id: string; title: string; score: number }[];
    topPosts: { id: string; content: string; score: number }[];
    topUsers: { id: string; username: string; score: number }[];
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        topEvents: { id: string; title: string; score: number }[];
        topPosts: { id: string; content: string; score: number }[];
        topUsers: { id: string; username: string; score: number }[];
      }>> = await axios.get(`${this.apiBaseUrl}/analytics/top-content`, {
        params: { ...timeRange, limit }
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { topEvents: [], topPosts: [], topUsers: [] };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener contenido top');
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;