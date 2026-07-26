import { apiClient } from './apiClient';

// Constants
const REPORT_CATEGORIES = [
  { value: 'spam', label: 'Spam', description: 'Unwanted or irrelevant content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or harassment' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Content that violates guidelines' },
  { value: 'fake', label: 'Fake Information', description: 'Misleading or false information' },
  { value: 'copyright', label: 'Copyright Violation', description: 'Unauthorized use of copyrighted material' },
  { value: 'other', label: 'Other', description: 'Other reason' },
];

const REPORT_TYPES = [
  { value: 'user', label: 'User' },
  { value: 'event', label: 'Event' },
  { value: 'tribe', label: 'Tribe' },
  { value: 'post', label: 'Post' },
  { value: 'comment', label: 'Comment' },
  { value: 'message', label: 'Message' },
];

const REPORT_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export interface ReportCategory {
  value: string;
  label: string;
  description: string;
}

export interface ReportType {
  value: string;
  label: string;
}

export interface ReportConfig {
  types: ReportType[];
  categories: ReportCategory[];
}

export interface CreateReportRequest {
  type: 'user' | 'event' | 'tribe' | 'post' | 'comment' | 'message';
  category: string;
  reason: string;
  description?: string;
  reportedUserId?: string;
  reportedEventId?: string;
  reportedTribeId?: string;
  reportedPostId?: string;
  reportedCommentId?: string;
  evidence?: string[];
}

export interface Report {
  _id: string;
  type: string;
  category: string;
  reason: string;
  description?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportedItem?: any;
  createdAt: string;
  reviewedAt?: string;
  resolution?: string;
}

export interface ReportsResponse {
  success: boolean;
  reports: Report[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ReportConfigResponse {
  success: boolean;
  config: ReportConfig;
}

class ReportsService {
  async getConfig(): Promise<ReportConfigResponse> {
    const response = await apiClient.get('/reports/config');
    return response.data;
  }

  async createReport(data: CreateReportRequest): Promise<{ success: boolean; message: string; report?: any }> {
    const response = await apiClient.post('/reports', data);
    return response.data;
  }

  async getMyReports(params?: {
    page?: number;
    limit?: number;
  }): Promise<ReportsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/reports/my-reports?${queryParams.toString()}`);
    return response.data;
  }

  // Quick report methods for common scenarios
  async reportUser(userId: string, category: string, reason: string, description?: string): Promise<{ success: boolean; message: string }> {
    return this.createReport({
      type: 'user',
      category,
      reason,
      description,
      reportedUserId: userId,
    });
  }

  async reportEvent(eventId: string, category: string, reason: string, description?: string): Promise<{ success: boolean; message: string }> {
    return this.createReport({
      type: 'event',
      category,
      reason,
      description,
      reportedEventId: eventId,
    });
  }

  async reportTribe(tribeId: string, category: string, reason: string, description?: string): Promise<{ success: boolean; message: string }> {
    return this.createReport({
      type: 'tribe',
      category,
      reason,
      description,
      reportedTribeId: tribeId,
    });
  }

  async reportPost(postId: string, category: string, reason: string, description?: string): Promise<{ success: boolean; message: string }> {
    return this.createReport({
      type: 'post',
      category,
      reason,
      description,
      reportedPostId: postId,
    });
  }

  async reportComment(commentId: string, category: string, reason: string, description?: string): Promise<{ success: boolean; message: string }> {
    return this.createReport({
      type: 'comment',
      category,
      reason,
      description,
      reportedCommentId: commentId,
    });
  }
}

export const reportsService = new ReportsService();

// Report status display information
export const REPORT_STATUS_INFO = {
  pending: {
    label: 'Pendiente',
    color: '#FF9500',
    icon: 'time-outline',
    description: 'Tu reporte está en cola para revisión'
  },
  under_review: {
    label: 'En revisión',
    color: '#007AFF',
    icon: 'eye-outline',
    description: 'Un moderador está revisando tu reporte'
  },
  resolved: {
    label: 'Resuelto',
    color: '#34C759',
    icon: 'checkmark-circle-outline',
    description: 'Tu reporte ha sido resuelto'
  },
  dismissed: {
    label: 'Desestimado',
    color: '#8E8E93',
    icon: 'close-circle-outline',
    description: 'Tu reporte no requiere acción'
  },
  escalated: {
    label: 'Escalado',
    color: '#FF3B30',
    icon: 'warning-outline',
    description: 'Tu reporte ha sido escalado a administración'
  }
};

// Report priority display information
export const REPORT_PRIORITY_INFO = {
  low: {
    label: 'Baja',
    color: '#8E8E93'
  },
  medium: {
    label: 'Media',
    color: '#007AFF'
  },
  high: {
    label: 'Alta',
    color: '#FF9500'
  },
  urgent: {
    label: 'Urgente',
    color: '#FF3B30'
  }
};

export default reportsService;
