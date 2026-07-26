import { apiClient } from './apiClient';
import type { ApiResponse, PaginatedResponse, Event } from '@/types';

import type { Ticket, TicketType } from '@/types';

class TicketService {
  private static instance: TicketService;

  private constructor() {}

  public static getInstance(): TicketService {
    if (!TicketService.instance) {
      TicketService.instance = new TicketService();
    }
    return TicketService.instance;
  }

  public async getMyTickets(page: number = 1, limit: number = 50): Promise<PaginatedResponse<Ticket>> {
    try {
      const response = await apiClient.get('/tickets/my-tickets', {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tickets');
    }
  }

  public async getTicketById(ticketId: string): Promise<Ticket> {
    try {
      const response = await apiClient.get(`/tickets/${ticketId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Ticket no encontrado');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener ticket');
    }
  }

  public async getEventTickets(eventId: string): Promise<TicketType[]> {
    try {
      const response = await apiClient.get(`/tickets/event/${eventId}/types`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tipos de tickets');
    }
  }

  public async purchaseTickets(
    eventId: string,
    tickets: Array<{ ticketTypeId: string; quantity: number }>,
    paymentMethodId?: string
  ): Promise<ApiResponse<{ tickets: Ticket[]; paymentIntent: any }>> {
    try {
      const response = await apiClient.post('/tickets/purchase', {
        eventId,
        tickets,
        paymentMethodId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al comprar tickets');
    }
  }

  public async validateTicket(ticketId: string, eventId: string): Promise<{ valid: boolean; ticket?: Ticket; message: string }> {
    try {
      const response = await apiClient.post(`/tickets/${ticketId}/validate`, { eventId });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Error al validar ticket');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al validar ticket');
    }
  }

  public async validateByQR(qrCode: string, eventId: string): Promise<{ valid: boolean; ticket?: Ticket; message: string }> {
    try {
      const response = await apiClient.post('/tickets/validate-qr', { qrCode, eventId });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Error al validar QR');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al validar QR');
    }
  }

  public async transferTicket(ticketId: string, recipientEmail: string, message?: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/tickets/${ticketId}/transfer`, {
        recipientEmail,
        message,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al transferir ticket');
    }
  }

  public async cancelTicket(ticketId: string, reason: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/tickets/${ticketId}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cancelar ticket');
    }
  }

  public async getTicketQRCode(ticketId: string): Promise<string> {
    try {
      const response = await apiClient.get(`/tickets/${ticketId}/qr-code`);
      if (response.data.success && response.data.data) {
        return response.data.data.qrCodeUrl;
      }
      throw new Error('Error al obtener código QR');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener código QR');
    }
  }

  public async addToWallet(ticketId: string, walletType: 'apple' | 'google'): Promise<ApiResponse<{ passUrl: string }>> {
    try {
      const response = await apiClient.post(`/tickets/${ticketId}/add-to-wallet`, { walletType });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar a wallet');
    }
  }

  public async downloadTicket(ticketId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/tickets/${ticketId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al descargar ticket');
    }
  }
}

export const ticketService = TicketService.getInstance();
export default ticketService;