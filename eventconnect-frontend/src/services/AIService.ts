import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { Event, User, Tribe, ApiResponse } from '../types/api.types';

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

export interface SmartSuggestion {
  type: 'event_creation' | 'profile_optimization' | 'connection' | 'activity';
  title: string;
  description: string;
  action: {
    type: string;
    payload: Record<string, any>;
  };
  priority: 'low' | 'medium' | 'high';
}

class AIService {
  private static instance: AIService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async getRecommendedEvents(limit: number = 20): Promise<Event[]> {
    try {
      const response: AxiosResponse<ApiResponse<Event[]>> =
        await axios.get(`${this.apiBaseUrl}/ai/recommendations/events`, {
          params: { limit }
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
      const response: AxiosResponse<ApiResponse<User[]>> =
        await axios.get(`${this.apiBaseUrl}/ai/recommendations/users`, {
          params: { limit }
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
      const response: AxiosResponse<ApiResponse<Tribe[]>> =
        await axios.get(`${this.apiBaseUrl}/ai/recommendations/tribes`, {
          params: { limit }
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
      const response: AxiosResponse<ApiResponse<Recommendation[]>> =
        await axios.get(`${this.apiBaseUrl}/ai/recommendations`, {
          params: { limit }
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
      const response: AxiosResponse<ApiResponse<ChatbotConversation>> =
        await axios.post(`${this.apiBaseUrl}/ai/chatbot`, {
          message,
          conversationId
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Error al obtener respuesta del chatbot');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al comunicarse con el chatbot');
    }
  }

  public async getSuggestions(): Promise<SmartSuggestion[]> {
    try {
      const response: AxiosResponse<ApiResponse<SmartSuggestion[]>> =
        await axios.get(`${this.apiBaseUrl}/ai/suggestions`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener sugerencias');
    }
  }

  public async generateEventDescription(eventData: {
    title: string;
    category: string;
    keywords?: string[];
  }): Promise<string> {
    try {
      const response: AxiosResponse<ApiResponse<{ description: string }>> =
        await axios.post(`${this.apiBaseUrl}/ai/generate/event-description`, eventData);

      if (response.data.success && response.data.data) {
        return response.data.data.description;
      }

      throw new Error('Error al generar descripción');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al generar descripción del evento');
    }
  }

  public async analyzeImage(image: File): Promise<{
    tags: string[];
    category: string;
    description: string;
    appropriateForEvents: boolean;
  }> {
    try {
      const formData = new FormData();
      formData.append('image', image);

      const response: AxiosResponse<ApiResponse<{
        tags: string[];
        category: string;
        description: string;
        appropriateForEvents: boolean;
      }>> = await axios.post(`${this.apiBaseUrl}/ai/analyze-image`, formData, {
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
      const response: AxiosResponse<ApiResponse<{
        predictedAttendees: number;
        confidence: number;
        factors: string[];
      }>> = await axios.post(`${this.apiBaseUrl}/ai/predict-attendance`, eventData);

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
      const response: AxiosResponse<ApiResponse<{
        suggestedDates: string[];
        reasoning: string;
      }>> = await axios.post(`${this.apiBaseUrl}/ai/optimal-event-time`, eventData);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { suggestedDates: [], reasoning: '' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener momento óptimo');
    }
  }

  public async moderateContent(content: string, contentType: 'post' | 'comment' | 'message'): Promise<{
    safe: boolean;
    flags: string[];
    confidence: number;
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        safe: boolean;
        flags: string[];
        confidence: number;
      }>> = await axios.post(`${this.apiBaseUrl}/ai/moderate-content`, {
        content,
        contentType
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { safe: true, flags: [], confidence: 0 };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al moderar contenido');
    }
  }

  public async searchSemantic(query: string, type: 'events' | 'users' | 'tribes' | 'all' = 'all', limit: number = 20): Promise<any[]> {
    try {
      const response: AxiosResponse<ApiResponse<any[]>> =
        await axios.post(`${this.apiBaseUrl}/ai/semantic-search`, {
          query,
          type,
          limit
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