import { apiClient } from './apiClient';
import type { ApiResponse, PaginatedResponse } from '@/types';

import type { Ticket, TicketType } from '@/types';
import { clearTicketPasses, readTicketPasses, saveTicketPasses } from '@/utils/ticketPassStore';

export interface AdmissionResult {
  valid: boolean;
  message: string;
  ticket?: { event?: { title?: string } };
  quantity?: number;
  orderNumber?: string;
  checkedInAt?: string;
}

export class AdmissionError extends Error {
  constructor(message: string, public status?: number) { super(message); this.name = 'AdmissionError'; }
}

class TicketService {
  private static instance: TicketService;

  private constructor() {}

  public static getInstance(): TicketService {
    if (!TicketService.instance) {
      TicketService.instance = new TicketService();
    }
    return TicketService.instance;
  }

  public async getOwnedPasses(owner: string, current: () => boolean = () => true): Promise<{ tickets: Ticket[]; offline: boolean; savedAt: number | null }> {
    if (!owner || !current()) throw new Error('Inicia sesión para ver tus entradas.');
    try {
      const response = await apiClient.get('/tickets/my-tickets');
      if (response.data?.success !== true || !Array.isArray(response.data?.data)) throw new Error('No se pudieron verificar tus entradas.');
      const tickets = response.data.data as Ticket[];
      let savedAt: number | null = null;
      if (current()) {
        try { await saveTicketPasses(owner, tickets, current); if (current()) savedAt = Date.now(); } catch { /* Online ticket remains available if secure storage is unavailable. */ }
      }
      return { tickets, offline: false, savedAt };
    } catch (error: any) {
      if (error.response) {
        if ([401, 403, 404].includes(error.response.status)) await clearTicketPasses(owner).catch(() => undefined);
        throw new Error(error.response.data?.message || 'No se pudieron verificar tus entradas.');
      }
      // A server rejection is never grounds to resurrect a saved admission.
      if (!error.request && !['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code)) throw error;
      if (!current()) throw new Error('La sesión cambió.');
      const cached = await readTicketPasses(owner);
      if (!cached.tickets.length) throw new Error('Sin conexión. Abre tus entradas con internet antes de salir para guardar el pase.');
      return { ...cached, offline: true };
    }
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
      try {
        const ownedRes = await apiClient.get(`/tickets/owned/${ticketId}`);
        if (ownedRes.data?.success && ownedRes.data?.data) {
          return ownedRes.data.data;
        }
      } catch (e) {}

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

  public async validateTicket(ticketId: string, eventId?: string): Promise<{ valid: boolean; ticket?: any; message: string }> {
    try {
      const body: any = {};
      if (eventId) body.eventId = eventId;
      const response = await apiClient.post(`/tickets/${ticketId}/validate`, body);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      if (response.data.valid !== undefined) return response.data;
      throw new Error('Error al validar ticket');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al validar ticket');
    }
  }

  public async validateByQR(qrCode: string, eventId?: string): Promise<AdmissionResult> {
    try {
      const body: any = { qrCode };
      if (eventId) body.eventId = eventId;
      const response = await apiClient.post('/tickets/validate-qr', body);
      if (response.data.success && response.data.data?.valid === true) {
        return response.data.data;
      }
      if (response.data.valid === true) return response.data;
      throw new AdmissionError(response.data.data?.message || response.data.message || 'No se confirmó el registro de la entrada.');
    } catch (error: any) {
      if (error instanceof AdmissionError) throw error;
      throw new AdmissionError(error.response?.data?.message || 'No se pudo confirmar el registro. Si la conexión falló, verifica el estado antes de reintentar.', error.response?.status);
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
