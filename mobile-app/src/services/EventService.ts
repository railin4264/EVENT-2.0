import { apiClient } from './apiClient';
import { Event, CreateEventForm, ApiResponse, PaginatedResponse, EventCategory } from '@/types';

export interface EventFilters {
  category?: EventCategory;
  search?: string;
  dateRange?: 'today' | 'tomorrow' | 'this-week' | 'this-month' | 'all';
  priceRange?: string; // "min,max"
  distance?: number;
  isVirtual?: boolean;
  isFree?: boolean;
  isRecurring?: boolean;
  isTourOrTrip?: boolean;
  isCommercialDeal?: boolean;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radius?: number;
}

/** Normalize the API's canonical `events` collection for native list consumers. */
export function normalizeEventPage(payload: unknown): PaginatedResponse<Event> {
  const body = payload as { success?: boolean; events?: unknown; data?: unknown; pagination?: PaginatedResponse<Event>['pagination']; message?: string } | null;
  const rows = body?.events ?? body?.data;
  if (body?.success !== true || !Array.isArray(rows)) throw new Error(body?.message || 'No pudimos cargar el catálogo de eventos');
  return { success: true, data: rows, pagination: body.pagination || { page: 1, limit: Math.max(1, rows.length), total: rows.length, pages: rows.length ? 1 : 0 } };
}

class EventService {
  private static instance: EventService;

  private constructor() {}

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

      const response = await apiClient.get(`/events?${params.toString()}`);
      return normalizeEventPage(response.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos');
    }
  }

  public async getEventById(eventId: string): Promise<Event> {
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      
      if (response.data.success && response.data.event) {
        return response.data.event;
      }
      
      throw new Error('Evento no encontrado');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener evento');
    }
  }

  public async createEvent(eventData: CreateEventForm): Promise<ApiResponse<Event>> {
    try {
      const response = await apiClient.post('/events', eventData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear evento');
    }
  }

  public async updateEvent(eventId: string, eventData: Partial<CreateEventForm>): Promise<ApiResponse<Event>> {
    try {
      const response = await apiClient.put(`/events/${eventId}`, eventData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar evento');
    }
  }

  public async deleteEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/events/${eventId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar evento');
    }
  }

  public async joinEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/events/${eventId}/join`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al unirse al evento');
    }
  }

  public async leaveEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/events/${eventId}/leave`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al salir del evento');
    }
  }

  public async getNearbyEvents(lat: number, lng: number, radius: number = 25, limit: number = 20, category?: string): Promise<Event[]> {
    try {
      const params: any = { lat, lng, radius, limit };
      if (category && category !== 'Todos') {
        params.category = category;
      }
      
      const response = await apiClient.get('/events/nearby', { params });
      
      if (response.data.success && Array.isArray(response.data.events)) {
        return response.data.events;
      }
      
      throw new Error(response.data?.message || 'Respuesta de eventos cercanos inválida');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos cercanos');
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

      const response = await apiClient.get(`/events/search?${params.toString()}`);
      return normalizeEventPage(response.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al buscar eventos');
    }
  }

  public async getUserEvents(userId?: string): Promise<Event[]> {
    try {
      const url = userId
        ? `/events/user/${userId}`
        : '/events/user/me';

      const response = await apiClient.get(url);
      
      if (response.data.success && response.data.events) {
        return response.data.events;
      }
      
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos del usuario');
    }
  }

  public async getEventAttendees(eventId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/events/${eventId}/attendees`);
      
      if (response.data.success && response.data.attendees) {
        return response.data.attendees;
      }
      
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener asistentes del evento');
    }
  }

  public async likeEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/events/${eventId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al dar like al evento');
    }
  }

  public async unlikeEvent(eventId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/events/${eventId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al quitar like del evento');
    }
  }

  public async shareEvent(eventId: string): Promise<ApiResponse<{ shareUrl: string }>> {
    try {
      const response = await apiClient.post(`/events/${eventId}/share`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al compartir evento');
    }
  }

  public async reportEvent(eventId: string, reason: string, description?: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/events/${eventId}/report`, {
        reason,
        description
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reportar evento');
    }
  }

  public async getEventCategories(): Promise<EventCategory[]> {
    try {
      const response = await apiClient.get('/events/categories');
      
      if (response.data.success && response.data.categories) {
        return response.data.categories;
      }
      
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener categorías');
    }
  }

  public async getTrendingEvents(limit: number = 10): Promise<Event[]> {
    try {
      const response = await apiClient.get('/events/trending', {
        params: { limit }
      });

      if (response.data.success && response.data.events) {
        return response.data.events;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos trending');
    }
  }

  public async getFavoriteEvents(): Promise<Event[]> {
    try {
      const response = await apiClient.get('/events/favorites');

      if (response.data.success && response.data.events) {
        return response.data.events;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos favoritos');
    }
  }

  public async toggleFavorite(eventId: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`/events/${eventId}/favorite`);

      if (response.data.success) {
        return response.data.isFavorited;
      }

      return false;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al marcar/desmarcar favorito');
    }
  }
}

export const eventService = EventService.getInstance();
export default eventService;


























