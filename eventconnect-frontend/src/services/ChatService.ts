import axios, { AxiosResponse } from 'axios';
import type { ChatRoom, ChatMessage, ChatParticipant, MessageAttachment, ApiResponse, PaginatedResponse } from '../types/api.types';

export interface CreateConversationData {
  type: 'direct' | 'group' | 'tribe';
  participants: string[];
  name?: string;
  description?: string;
}

export interface SendMessageData {
  room: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  attachments?: File[];
  mentions?: string[];
  replyTo?: string;
}

export interface MessageFilters {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

class ChatService {
  private static instance: ChatService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public async getConversations(page: number = 1, limit: number = 50): Promise<PaginatedResponse<ChatRoom>> {
    try {
      const response: AxiosResponse<PaginatedResponse<ChatRoom>> =
        await axios.get(`${this.apiBaseUrl}/chat/conversations`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener conversaciones');
    }
  }

  public async getConversationById(conversationId: string): Promise<ChatRoom> {
    try {
      const response: AxiosResponse<ApiResponse<ChatRoom>> =
        await axios.get(`${this.apiBaseUrl}/chat/conversations/${conversationId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Conversación no encontrada');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener conversación');
    }
  }

  public async createConversation(conversationData: CreateConversationData): Promise<ApiResponse<ChatRoom>> {
    try {
      const response: AxiosResponse<ApiResponse<ChatRoom>> =
        await axios.post(`${this.apiBaseUrl}/chat/conversations`, conversationData);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear conversación');
    }
  }

  public async getMessages(conversationId: string, filters: MessageFilters = {}): Promise<PaginatedResponse<ChatMessage>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<ChatMessage>> =
        await axios.get(`${this.apiBaseUrl}/chat/messages/${conversationId}?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener mensajes');
    }
  }

  public async sendMessage(messageData: SendMessageData): Promise<ApiResponse<ChatMessage>> {
    try {
      const formData = new FormData();

      formData.append('room', messageData.room);
      formData.append('content', messageData.content);

      if (messageData.type) {
        formData.append('type', messageData.type);
      }

      if (messageData.mentions && messageData.mentions.length > 0) {
        formData.append('mentions', JSON.stringify(messageData.mentions));
      }

      if (messageData.replyTo) {
        formData.append('replyTo', messageData.replyTo);
      }

      if (messageData.attachments && messageData.attachments.length > 0) {
        messageData.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response: AxiosResponse<ApiResponse<ChatMessage>> =
        await axios.post(`${this.apiBaseUrl}/chat/messages`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al enviar mensaje');
    }
  }

  public async updateMessage(messageId: string, content: string): Promise<ApiResponse<ChatMessage>> {
    try {
      const response: AxiosResponse<ApiResponse<ChatMessage>> =
        await axios.put(`${this.apiBaseUrl}/chat/messages/${messageId}`, { content });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar mensaje');
    }
  }

  public async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/chat/messages/${messageId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar mensaje');
    }
  }

  public async markAsRead(messageId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/chat/messages/${messageId}/read`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al marcar como leído');
    }
  }

  public async markConversationAsRead(conversationId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/chat/conversations/${conversationId}/read`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al marcar conversación como leída');
    }
  }

  public async reactToMessage(messageId: string, emoji: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/chat/messages/${messageId}/react`, { emoji });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al reaccionar al mensaje');
    }
  }

  public async deleteReaction(messageId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/chat/messages/${messageId}/react`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar reacción');
    }
  }

  public async addParticipants(conversationId: string, userIds: string[]): Promise<ApiResponse<ChatRoom>> {
    try {
      const response: AxiosResponse<ApiResponse<ChatRoom>> =
        await axios.post(`${this.apiBaseUrl}/chat/conversations/${conversationId}/participants`, { userIds });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar participantes');
    }
  }

  public async removeParticipant(conversationId: string, userId: string): Promise<ApiResponse<ChatRoom>> {
    try {
      const response: AxiosResponse<ApiResponse<ChatRoom>> =
        await axios.delete(`${this.apiBaseUrl}/chat/conversations/${conversationId}/participants/${userId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar participante');
    }
  }

  public async leaveConversation(conversationId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/chat/conversations/${conversationId}/leave`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al abandonar conversación');
    }
  }

  public async updateConversation(conversationId: string, data: { name?: string; description?: string }): Promise<ApiResponse<ChatRoom>> {
    try {
      const response: AxiosResponse<ApiResponse<ChatRoom>> =
        await axios.put(`${this.apiBaseUrl}/chat/conversations/${conversationId}`, data);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar conversación');
    }
  }

  public async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/chat/conversations/${conversationId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar conversación');
    }
  }

  public async searchMessages(conversationId: string, query: string): Promise<ChatMessage[]> {
    try {
      const response: AxiosResponse<ApiResponse<ChatMessage[]>> =
        await axios.get(`${this.apiBaseUrl}/chat/conversations/${conversationId}/search`, {
          params: { q: query }
        });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al buscar mensajes');
    }
  }

  public async getUnreadCount(): Promise<number> {
    try {
      const response: AxiosResponse<ApiResponse<{ count: number }>> =
        await axios.get(`${this.apiBaseUrl}/chat/unread-count`);

      if (response.data.success && response.data.data) {
        return response.data.data.count;
      }

      return 0;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener mensajes no leídos');
    }
  }
}

export const chatService = ChatService.getInstance();
export default chatService;