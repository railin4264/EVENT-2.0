import { apiClient } from './apiClient';
import type { ApiResponse, PaginatedResponse, Message, Chat } from '@/types';

export interface SendMessageData {
  chatId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'location' | 'event' | 'tribe';
  media?: {
    uri: string;
    type: string;
    name: string;
  };
  replyTo?: string;
}

export interface CreateChatData {
  type: 'direct' | 'group' | 'tribe';
  participants: string[];
  name?: string;
}

class ChatService {
  private static instance: ChatService;

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public async getChats(page: number = 1, limit: number = 50): Promise<PaginatedResponse<Chat>> {
    try {
      const response = await apiClient.get('/chat/conversations', {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener conversaciones');
    }
  }

  public async getChatById(chatId: string): Promise<Chat> {
    try {
      const response = await apiClient.get(`/chat/conversations/${chatId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Conversación no encontrada');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener conversación');
    }
  }

  public async getMessages(chatId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<Message>> {
    try {
      const response = await apiClient.get(`/chat/messages/${chatId}`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener mensajes');
    }
  }

  public async sendMessage(messageData: SendMessageData): Promise<ApiResponse<Message>> {
    try {
      const formData = new FormData();
      formData.append('room', messageData.chatId);
      formData.append('content', messageData.content);

      if (messageData.messageType) {
        formData.append('type', messageData.messageType);
      }

      if (messageData.replyTo) {
        formData.append('replyTo', messageData.replyTo);
      }

      if (messageData.media) {
        formData.append('attachments', {
          uri: messageData.media.uri,
          type: messageData.media.type,
          name: messageData.media.name,
        } as any);
      }

      const response = await apiClient.post('/chat/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al enviar mensaje');
    }
  }

  public async createChat(chatData: CreateChatData): Promise<ApiResponse<Chat>> {
    try {
      const response = await apiClient.post('/chat/conversations', chatData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear conversación');
    }
  }

  public async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/chat/messages/${messageId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar mensaje');
    }
  }

  public async markAsRead(chatId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/chat/conversations/${chatId}/read`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al marcar como leído');
    }
  }

  public async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get('/chat/unread-count');
      if (response.data.success && response.data.data) {
        return response.data.data.count;
      }
      return 0;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener mensajes no leídos');
    }
  }

  public async leaveChat(chatId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/chat/conversations/${chatId}/leave`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al abandonar conversación');
    }
  }

  public async deleteChat(chatId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/chat/conversations/${chatId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar conversación');
    }
  }
}

export const chatService = ChatService.getInstance();
export default chatService;