import { apiClient } from './apiClient';
import type { ApiResponse, PaginatedResponse } from '@/types';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: 'payment' | 'refund' | 'payout';
  description: string;
  relatedTo?: {
    type: 'event' | 'ticket' | 'subscription';
    id: string;
  };
  createdAt: string;
}

class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  public async createPaymentIntent(amount: number, currency: string, eventId?: string, ticketIds?: string[]): Promise<PaymentIntent> {
    try {
      const response = await apiClient.post('/payments/create-intent', {
        amount,
        currency,
        eventId,
        ticketIds,
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Error al crear intención de pago');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear intención de pago');
    }
  }

  public async confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<ApiResponse<Transaction>> {
    try {
      const response = await apiClient.post('/payments/confirm', {
        paymentIntentId,
        paymentMethodId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al confirmar pago');
    }
  }

  public async getPaymentHistory(page: number = 1, limit: number = 50): Promise<PaginatedResponse<Transaction>> {
    try {
      const response = await apiClient.get('/payments/history', {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener historial de pagos');
    }
  }

  public async getTransaction(transactionId: string): Promise<Transaction> {
    try {
      const response = await apiClient.get(`/payments/transactions/${transactionId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Transacción no encontrada');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener transacción');
    }
  }

  public async requestRefund(transactionId: string, reason: string): Promise<ApiResponse<Transaction>> {
    try {
      const response = await apiClient.post('/payments/refund', {
        transactionId,
        reason,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al solicitar reembolso');
    }
  }

  public async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiClient.get('/payments/methods');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener métodos de pago');
    }
  }

  public async addPaymentMethod(paymentMethodId: string): Promise<ApiResponse<PaymentMethod>> {
    try {
      const response = await apiClient.post('/payments/methods', { paymentMethodId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar método de pago');
    }
  }

  public async removePaymentMethod(paymentMethodId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/payments/methods/${paymentMethodId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar método de pago');
    }
  }

  public async setDefaultPaymentMethod(paymentMethodId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/payments/methods/${paymentMethodId}/default`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al establecer método de pago predeterminado');
    }
  }

  public async getBalance(): Promise<{ available: number; pending: number; currency: string }> {
    try {
      const response = await apiClient.get('/payments/balance');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { available: 0, pending: 0, currency: 'USD' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener balance');
    }
  }
}

export const paymentService = PaymentService.getInstance();
export default paymentService;