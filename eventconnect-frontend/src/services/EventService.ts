import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { Event, EventCategory, LocationData, ApiResponse, PaginatedResponse, EventComment } from '../types/api.types';

export interface EventFilters {
  category?: EventCategory;
  search?: string;
  dateRange?: 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'all';
  priceRange?: string;
  distance?: number;
  isVirtual?: boolean;
  isFree?: boolean;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface CreateEventData {
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  endDate: string;
  location: LocationData;
  maxAttendees?: number;
  isPrivate: boolean;
  tags: string[];
  price?: {
    amount: number;
    currency: string;
  };
  images?: File[];
}

class EventService {
  private static instance: EventService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  public async getEvents(filters: EventFilters = {}): Promise<PaginatedResponse<Event>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<Event>> =
        await axios.get(`${this.apiBaseUrl}/events?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos');
    }
  }

  public async getEventById(eventId: string): Promise<Event> {
    try {
      const response: AxiosResponse<ApiResponse<Event>> =
        await axios.get(`${this.apiBaseUrl}/events/${eventId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Evento no encontrado');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener evento');
    }
  }

  public async searchEvents(query: string, filters: Omit<EventFilters, 'search'> = {}): Promise<PaginatedResponse<Event>> {
    try {
      const params = new URLSearchParams({ search: query });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<Event>> =
        await axios.get(`${this.apiBaseUrl}/events/search?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al buscar eventos');
    }
  }

  public async getNearbyEvents(lat: number, lng: number, radius: number = 25, limit: number = 20): Promise<Event[]> {
    try {
      const response: AxiosResponse<ApiResponse<Event[]>> =
        await axios.get(`${this.apiBaseUrl}/events/nearby`, {
          params: { lat, lng, radius, limit }
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos cercanos');
    }
  }

  public async createEvent(eventData: CreateEventData): Promise<ApiResponse<Event>> {
    try {
      const formData = new FormData();

      // Add all non-file fields
      Object.entries(eventData).forEach(([key, value]) => {
        if (key !== 'images' && value !== undefined) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Add images if provided
      if (eventData.images && eventData.images.length > 0) {
        eventData.images.forEach((image) => {
          formData.append('images', image);
        });
      }

      const response: AxiosResponse<ApiResponse<Event>> =
        await axios.post(`${this.apiBaseUrl}/events`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear evento');
    }
  }

  public async updateEvent(eventId: string, eventData: Partial<CreateEventData>): Promise<ApiResponse<Event>> {
    try {
      const formData = new FormData();

      Object.entries(eventData).forEach(([key, value]) => {
        if (key !== 'images' && value !== undefined) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      if (eventData.images && eventData.images.length > 0) {
        eventData.images.forEach((image) => {
          formData.append('images', image);
        });
      }

      const response: AxiosResponse<ApiResponse<Event>> =
        await axios.put(`${this.apiBaseUrl}/events/${eventId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar evento');
    }
  }

  public async deleteEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/events/${eventId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar evento');
    }
  }

  public async attendEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/events/${eventId}/attend`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al asistir al evento');
    }
  }

  public async leaveEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/events/${eventId}/leave`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al abandonar evento');
    }
  }

  public async favoriteEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/events/${eventId}/favorite`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al marcar favorito');
    }
  }

  public async unfavoriteEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/events/${eventId}/favorite`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al quitar favorito');
    }
  }

  public async shareEvent(eventId: string): Promise<ApiResponse<{ shareUrl: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ shareUrl: string }>> =
        await axios.post(`${this.apiBaseUrl}/events/${eventId}/share`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al compartir evento');
    }
  }

  public async viewEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/events/${eventId}/view`);

      return response.data;
    } catch (error: any) {
      // Non-critical, don't throw
      console.warn('Error tracking event view:', error);
      return { success: false };
    }
  }

  public async getEventComments(eventId: string): Promise<EventComment[]> {
    try {
      const response: AxiosResponse<ApiResponse<EventComment[]>> =
        await axios.get(`${this.apiBaseUrl}/events/${eventId}/comments`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener comentarios');
    }
  }

  public async addComment(eventId: string, content: string): Promise<ApiResponse<EventComment>> {
    try {
      const response: AxiosResponse<ApiResponse<EventComment>> =
        await axios.post(`${this.apiBaseUrl}/events/${eventId}/comments`, { content });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar comentario');
    }
  }

  public async deleteComment(eventId: string, commentId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/events/${eventId}/comments/${commentId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar comentario');
    }
  }

  public async likeComment(eventId: string, commentId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/events/${eventId}/comments/${commentId}/like`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dar like');
    }
  }

  public async getEventAttendees(eventId: string): Promise<any[]> {
    try {
      const response: AxiosResponse<ApiResponse<any[]>> =
        await axios.get(`${this.apiBaseUrl}/events/${eventId}/attendees`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener asistentes');
    }
  }

  public async getUserEvents(userId?: string): Promise<Event[]> {
    try {
      const url = userId
        ? `${this.apiBaseUrl}/events/user/${userId}`
        : `${this.apiBaseUrl}/events/user/me`;

      const response: AxiosResponse<ApiResponse<Event[]>> = await axios.get(url);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos del usuario');
    }
  }

  public async getTrendingEvents(limit: number = 10): Promise<Event[]> {
    try {
      const response: AxiosResponse<ApiResponse<Event[]>> =
        await axios.get(`${this.apiBaseUrl}/events/trending`, {
          params: { limit }
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos trending');
    }
  }
}

export const eventService = EventService.getInstance();
export default eventService;