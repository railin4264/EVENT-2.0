import { apiClient } from './apiClient';
import type { Chat, Message, ApiResponse, PaginatedResponse } from '@/types';
export interface SendMessageData { chatId: string; content: string; messageType?: 'text' | 'image' | 'video' | 'audio' | 'file'; media?: { uri: string; type: string; name: string }; replyTo?: string }
export interface CreateChatData { type: 'direct' | 'group' | 'tribe'; participants: string[]; name?: string }
const normalizeChat = (chat: any): Chat => ({ ...chat, id: chat.chatId || chat.id || chat._id, participants: (chat.participants || []).map((p: any) => p.user || p) });
class ChatService {
  async getChats(page = 1, limit = 50): Promise<PaginatedResponse<Chat>> {
    const { data } = await apiClient.get('/chat/chats', { params: { page, limit } });
    return { ...data, data: (data.data || []).map(normalizeChat) };
  }
  async getChatById(chatId: string): Promise<Chat> {
    // The API lists conversations; locate the requested chat using its public chatId.
    for (let page = 1; ; page++) {
      const result = await this.getChats(page);
      const chat = result.data.find((c: any) => c.id === chatId || c._id === chatId);
      if (chat) return chat;
      if (!(result.pagination as any)?.hasMore || !result.data.length) break;
    }
    throw new Error('Conversación no encontrada');
  }
  async getMessages(chatId: string, page = 1, limit = 50): Promise<PaginatedResponse<Message>> {
    return (await apiClient.get(`/chat/${encodeURIComponent(chatId)}/messages`, { params: { page, limit } })).data;
  }
  async sendMessage(message: SendMessageData): Promise<ApiResponse<Message>> {
    const { chatId, ...body } = message;
    if (body.media) throw new Error('Comparte archivos desde la web.');
    return (await apiClient.post(`/chat/${encodeURIComponent(chatId)}/messages`, body)).data;
  }
  async createChat(chat: CreateChatData): Promise<ApiResponse<Chat>> {
    const direct = chat.type === 'direct';
    const { data } = await apiClient.post(direct ? '/chat/direct' : '/chat/group', direct ? { userId: chat.participants[0] } : { name: chat.name, participantIds: chat.participants });
    return { ...data, data: normalizeChat(data.data) };
  }
  async markAsRead(chatId: string): Promise<ApiResponse<void>> {
    const messages = await this.getMessages(chatId);
    const unread = messages.data.filter((message: any) => !message.isRead);
    await Promise.all(unread.map((message: any) => apiClient.put(`/chat/${encodeURIComponent(chatId)}/messages/${message._id || message.id}/read`)));
    return { success: true };
  }
  async getUnreadCount(): Promise<number> {
    const chats = await this.getChats();
    return chats.data.reduce((total, chat: any) => total + (chat.unreadCount || 0), 0);
  }
  async leaveChat(chatId: string): Promise<ApiResponse<void>> {
    return (await apiClient.put(`/chat/${encodeURIComponent(chatId)}/leave`)).data;
  }
  async deleteChat(chatId: string): Promise<ApiResponse<void>> { return this.leaveChat(chatId); }
  async deleteMessage(_messageId: string): Promise<ApiResponse<void>> { throw new Error('No está disponible eliminar mensajes.'); }
}
export const chatService = new ChatService();
export default chatService;
