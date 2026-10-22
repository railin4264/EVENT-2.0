import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { ApiResponse, PaginatedResponse } from '../types/api.types';

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

export interface CreatePaymentIntentData {
  amount: number;
  currency: string;
  eventId?: string;
  ticketIds?: string[];
  metadata?: Record<string, any>;
}

class PaymentService {
  private static instance: PaymentService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  public async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
    try {
      const response: AxiosResponse<ApiResponse<PaymentIntent>> =
        await axios.post(`${this.apiBaseUrl}/payments/create-intent`, data);

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
      const response: AxiosResponse<ApiResponse<Transaction>> =
        await axios.post(`${this.apiBaseUrl}/payments/confirm`, {
          paymentIntentId,
          paymentMethodId
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al confirmar pago');
    }
  }

  public async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const response: AxiosResponse<ApiResponse<PaymentIntent>> =
        await axios.get(`${this.apiBaseUrl}/payments/intent/${paymentIntentId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Intención de pago no encontrada');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener intención de pago');
    }
  }

  public async getPaymentHistory(page: number = 1, limit: number = 50): Promise<PaginatedResponse<Transaction>> {
    try {
      const response: AxiosResponse<PaginatedResponse<Transaction>> =
        await axios.get(`${this.apiBaseUrl}/payments/history`, {
          params: { page, limit }
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener historial de pagos');
    }
  }

  public async getTransaction(transactionId: string): Promise<Transaction> {
    try {
      const response: AxiosResponse<ApiResponse<Transaction>> =
        await axios.get(`${this.apiBaseUrl}/payments/transactions/${transactionId}`);

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
      const response: AxiosResponse<ApiResponse<Transaction>> =
        await axios.post(`${this.apiBaseUrl}/payments/refund`, {
          transactionId,
          reason
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al solicitar reembolso');
    }
  }

  public async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response: AxiosResponse<ApiResponse<PaymentMethod[]>> =
        await axios.get(`${this.apiBaseUrl}/payments/methods`);

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
      const response: AxiosResponse<ApiResponse<PaymentMethod>> =
        await axios.post(`${this.apiBaseUrl}/payments/methods`, { paymentMethodId });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al agregar método de pago');
    }
  }

  public async removePaymentMethod(paymentMethodId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/payments/methods/${paymentMethodId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar método de pago');
    }
  }

  public async setDefaultPaymentMethod(paymentMethodId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.put(`${this.apiBaseUrl}/payments/methods/${paymentMethodId}/default`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al establecer método de pago predeterminado');
    }
  }

  public async getBalance(): Promise<{ available: number; pending: number; currency: string }> {
    try {
      const response: AxiosResponse<ApiResponse<{ available: number; pending: number; currency: string }>> =
        await axios.get(`${this.apiBaseUrl}/payments/balance`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return { available: 0, pending: 0, currency: 'USD' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener balance');
    }
  }

  public async setupWallet(): Promise<ApiResponse<{ walletId: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ walletId: string }>> =
        await axios.post(`${this.apiBaseUrl}/payments/wallet/setup`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al configurar wallet');
    }
  }
}

export const paymentService = PaymentService.getInstance();
export default paymentService;