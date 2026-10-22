import type { AxiosResponse } from 'axios';
import axios from '@/lib/api/client';
import type { ApiResponse, PaginatedResponse } from '../types/api.types';

export interface Report {
  _id: string;
  reporter: string;
  reportedItem: {
    type: 'user' | 'event' | 'post' | 'comment' | 'message' | 'tribe';
    id: string;
    reference: any;
  };
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface CreateReportData {
  itemType: 'user' | 'event' | 'post' | 'comment' | 'message' | 'tribe';
  itemId: string;
  reason: string;
  description?: string;
  evidence?: File[];
}

export interface ReportFilters {
  status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  itemType?: string;
  page?: number;
  limit?: number;
}

class ReportsService {
  private static instance: ReportsService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }

  public static getInstance(): ReportsService {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService();
    }
    return ReportsService.instance;
  }

  public async createReport(reportData: CreateReportData): Promise<ApiResponse<Report>> {
    try {
      const formData = new FormData();

      formData.append('itemType', reportData.itemType);
      formData.append('itemId', reportData.itemId);
      formData.append('reason', reportData.reason);

      if (reportData.description) {
        formData.append('description', reportData.description);
      }

      if (reportData.evidence && reportData.evidence.length > 0) {
        reportData.evidence.forEach((file) => {
          formData.append('evidence', file);
        });
      }

      const response: AxiosResponse<ApiResponse<Report>> =
        await axios.post(`${this.apiBaseUrl}/reports`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear reporte');
    }
  }

  public async getMyReports(filters: ReportFilters = {}): Promise<PaginatedResponse<Report>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<Report>> =
        await axios.get(`${this.apiBaseUrl}/reports/my-reports?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener reportes');
    }
  }

  public async getReportById(reportId: string): Promise<Report> {
    try {
      const response: AxiosResponse<ApiResponse<Report>> =
        await axios.get(`${this.apiBaseUrl}/reports/${reportId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Reporte no encontrado');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener reporte');
    }
  }

  public async cancelReport(reportId: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> =
        await axios.delete(`${this.apiBaseUrl}/reports/${reportId}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cancelar reporte');
    }
  }

  public async getReportReasons(itemType: string): Promise<string[]> {
    try {
      const response: AxiosResponse<ApiResponse<string[]>> =
        await axios.get(`${this.apiBaseUrl}/reports/reasons/${itemType}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [
        'Spam o contenido engañoso',
        'Contenido inapropiado',
        'Acoso o intimidación',
        'Información falsa',
        'Violencia o contenido peligroso',
        'Otro'
      ];
    } catch (error: any) {
      return [
        'Spam o contenido engañoso',
        'Contenido inapropiado',
        'Acoso o intimidación',
        'Información falsa',
        'Violencia o contenido peligroso',
        'Otro'
      ];
    }
  }

  // Admin-only methods
  public async getAllReports(filters: ReportFilters = {}): Promise<PaginatedResponse<Report>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<PaginatedResponse<Report>> =
        await axios.get(`${this.apiBaseUrl}/reports/admin/all?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener reportes');
    }
  }

  public async resolveReport(reportId: string, resolution: string, action?: 'ban' | 'warn' | 'remove_content'): Promise<ApiResponse<Report>> {
    try {
      const response: AxiosResponse<ApiResponse<Report>> =
        await axios.put(`${this.apiBaseUrl}/reports/${reportId}/resolve`, {
          resolution,
          action
        });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al resolver reporte');
    }
  }

  public async dismissReport(reportId: string, reason: string): Promise<ApiResponse<Report>> {
    try {
      const response: AxiosResponse<ApiResponse<Report>> =
        await axios.put(`${this.apiBaseUrl}/reports/${reportId}/dismiss`, { reason });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al desestimar reporte');
    }
  }
}

export const reportsService = ReportsService.getInstance();
export default reportsService;