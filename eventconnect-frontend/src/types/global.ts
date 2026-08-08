// Global type definitions for EventConnect Frontend

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export {};

// Allow importing CSS from node_modules (e.g. leaflet/dist/leaflet.css) in
// dynamic imports without a type error. Next.js handles the actual bundling.
declare module '*.css';
declare module 'leaflet/dist/leaflet.css';