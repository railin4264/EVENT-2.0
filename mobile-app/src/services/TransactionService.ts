import { api } from './api';
import type { Transaction, WalletBalance } from '@/types';

class TransactionService {
  async getBalance(): Promise<WalletBalance> {
    try {
      const response = await api.get('/wallet/balance');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Return fallback to prevent crashes
      return {
        available: 0,
        pending: 0,
        totalSpent: 0,
        ticketsPurchased: 0,
        totalSaved: 0,
        currency: 'COP'
      };
    }
  }

  async getTransactions(params?: any): Promise<{data: Transaction[]}> {
    try {
      const response = await api.get('/wallet/transactions', { params });
      return { data: response.data.data.transactions || [] };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { data: [] };
    }
  }

  async sendMoney(recipientId: string, amount: number, note?: string): Promise<Transaction> {
    try {
      const response = await api.post('/wallet/transfer', {
        recipientId,
        amount,
        note
      });
      return response.data.data.transaction;
    } catch (error) {
      console.error('Error sending money:', error);
      throw error;
    }
  }

  async topUp(amount: number, methodId?: string): Promise<Transaction> {
    try {
      const response = await api.post('/wallet/topup', {
        amount,
        methodId
      });
      return response.data.data.transaction;
    } catch (error) {
      console.error('Error topping up:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();
