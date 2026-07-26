import { apiClient } from './apiClient';
import type { Event, User, Tribe, ApiResponse } from '@/types';

export interface Recommendation {
  type: 'event' | 'user' | 'tribe';
  item: Event | User | Tribe;
  score: number;
  reason: string;
}

export interface ChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatbotConversation {
  id: string;
  messages: ChatbotMessage[];
  context?: Record<string, any>;
}

class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async getRecommendedEvents(limit: number = 20): Promise<Event[]> {
    try {
      const response = await apiClient.get('/ai/recommendations/events', {
        params: { limit },
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener eventos recomendados');
    }
  }

  public async getRecommendedUsers(limit: number = 20): Promise<User[]> {
    try {
      const response = await apiClient.get('/ai/recommendations/users', {
        params: { limit },
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios recomendados');
    }
  }

  public async getRecommendedTribes(limit: number = 10): Promise<Tribe[]> {
    try {
      const response = await apiClient.get('/ai/recommendations/tribes', {
        params: { limit },
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tribus recomendadas');
    }
  }

  public async getAllRecommendations(limit: number = 10): Promise<Recommendation[]> {
    try {
      const response = await apiClient.get('/ai/recommendations', {
        params: { limit },
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener recomendaciones');
    }
  }

  public async chatWithBot(message: string, conversationId?: string): Promise<ChatbotConversation> {
    try {
      const response = await apiClient.post('/ai/chatbot', {
        message,
        conversationId,
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Error al obtener respuesta del chatbot');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al comunicarse con el chatbot');
    }
  }

  public async generateEventDescription(
    title: string,
    category: string,
    keywords?: string[]
  ): Promise<string> {
    try {
      const response = await apiClient.post('/ai/generate/event-description', {
        title,
        category,
        keywords,
      });
      if (response.data.success && response.data.data) {
        return response.data.data.description;
      }
      throw new Error('Error al generar descripción');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al generar descripción del evento');
    }
  }

  public async analyzeImage(imageUri: string): Promise<{
    tags: string[];
    category: string;
    description: string;
    appropriateForEvents: boolean;
  }> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      const response = await apiClient.post('/ai/analyze-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Error al analizar imagen');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al analizar imagen');
    }
  }

  public async getPredictedAttendance(eventData: {
    category: string;
    date: string;
    location: { lat: number; lng: number };
    price?: number;
  }): Promise<{ predictedAttendees: number; confidence: number; factors: string[] }> {
    try {
      const response = await apiClient.post('/ai/predict-attendance', eventData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { predictedAttendees: 0, confidence: 0, factors: [] };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al predecir asistencia');
    }
  }

  public async getOptimalEventTime(eventData: {
    category: string;
    targetAudience: string[];
    location?: { lat: number; lng: number };
  }): Promise<{ suggestedDates: string[]; reasoning: string }> {
    try {
      const response = await apiClient.post('/ai/optimal-event-time', eventData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { suggestedDates: [], reasoning: '' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener momento óptimo');
    }
  }

  public async searchSemantic(
    query: string,
    type: 'events' | 'users' | 'tribes' | 'all' = 'all',
    limit: number = 20
  ): Promise<any[]> {
    try {
      const response = await apiClient.post('/ai/semantic-search', {
        query,
        type,
        limit,
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error en búsqueda semántica');
    }
  }
}

export const aiService = AIService.getInstance();
export default aiService;