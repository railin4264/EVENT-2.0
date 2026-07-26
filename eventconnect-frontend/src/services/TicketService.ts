import axios, { AxiosResponse } from 'axios';
import type { ApiResponse, PaginatedResponse, Event } from '../types/api.types';

export interface Ticket {
  _id: string;
  event: string | Event;
  user: string;
  ticketType: TicketType;
  qrCode: string;
  price: number;
  currency: string;
  status: 'active' | 'used' | 'cancelled' | 'expired' | 'transferred';
  purchaseDate: string;
  validFrom: string;
  validUntil: string;
  usedAt?: string;
  metadata?: Record<string, any>;
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  available: number;
  perks?: string[];
  isVIP?: boolean;
}

export interface PurchaseTicketsData {
  eventId: string;
  tickets: {
    ticketTypeId: string;
    quantity: number;
  }[];
  paymentMethodId?: string;
}

export interface TransferTicketData {
  ticketId: string;
  recipientEmail: string;
  message?: string;
}

export interface ValidateTicketResult {
  valid: boolean;
  ticket?: Ticket;
  message: string;
}

class TicketService {
  private static instance: TicketService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): TicketService {
    if (!TicketService.instance) {
      TicketService.instance = new TicketService();
    }
    return TicketService.instance;
  }

  public async getMyTickets(page: number = 1, limit: number = 50): Promise<PaginatedResponse<Ticket>> {
    try {
      const response: AxiosResponse<PaginatedResponse<Ticket>> =
        await axios.get(`${this.apiBaseUrl}/tickets/my-tickets`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tickets');
    }
  }

  public async getTicketById(ticketId: string): Promise<Ticket> {
    try {
      const response: AxiosResponse<ApiResponse<Ticket>> =
        await axios.get(`${this.apiBaseUrl}/tickets/${ticketId}`);

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
      const response: AxiosResponse<ApiResponse<TicketType[]>> =
        await axios.get(`${this.apiBaseUrl}/tickets/event/${eventId}/types`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener tipos de tickets');
    }
  }

  public async purchaseTickets(data: PurchaseTicketsData): Promise<ApiResponse<{ tickets: Ticket[]; paymentIntent: any }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ tickets: Ticket[]; paymentIntent: any }>> =
        await axios.post(`${this.apiBaseUrl}/tickets/purchase`, data);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al comprar tickets');
    }
  }

  public async validateTicket(ticketId: string, eventId: string): Promise<ValidateTicketResult> {
    try {
      const response: AxiosResponse<ApiResponse<ValidateTicketResult>> =
        await axios.post(`${this.apiBaseUrl}/tickets/${ticketId}/validate`, { eventId });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Error al validar ticket');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al validar ticket');
    }
  }

  public async validateByQR(qrCode: string, eventId: string): Promise<ValidateTicketResult> {
    try {
      const response: AxiosResponse<ApiResponse<ValidateTicketResult>> =
        await axios.post(`${this.apiBaseUrl}/tickets/validate-qr`, { qrCode, eventId });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Error al validar QR');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al validar QR');
    }
  }

  public async transferTicket(data: TransferTicketData): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/tickets/${data.ticketId}/transfer`, {
          recipientEmail: data.recipientEmail,
          message: data.message
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al transferir ticket');
    }
  }

  public async cancelTicket(ticketId: string, reason: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.post(`${this.apiBaseUrl}/tickets/${ticketId}/cancel`, { reason });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cancelar ticket');
    }
  }

  public async downloadTicket(ticketId: string): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> =
        await axios.get(`${this.apiBaseUrl}/tickets/${ticketId}/download`, {
          responseType: 'blob'
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al descargar ticket');
    }
  }

  public async getTicketQRCode(ticketId: string): Promise<string> {
    try {
      const response: AxiosResponse<ApiResponse<{ qrCodeUrl: string }>> =
        await axios.get(`${this.apiBaseUrl}/tickets/${ticketId}/qr-code`);

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
      const response: AxiosResponse<ApiResponse<{ passUrl: string }>> =
        await axios.post(`${this.apiBaseUrl}/tickets/${ticketId}/add-to-wallet`, { walletType });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar a wallet');
    }
  }

  public async getEventSales(eventId: string): Promise<{
    totalSold: number;
    totalRevenue: number;
    byType: Record<string, { sold: number; revenue: number }>;
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        totalSold: number;
        totalRevenue: number;
        byType: Record<string, { sold: number; revenue: number }>;
      }>> = await axios.get(`${this.apiBaseUrl}/tickets/event/${eventId}/sales`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { totalSold: 0, totalRevenue: 0, byType: {} };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener ventas del evento');
    }
  }
}

export const ticketService = TicketService.getInstance();
export default ticketService;