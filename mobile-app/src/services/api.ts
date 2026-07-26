// API client and config
export { apiClient, apiConfig } from './apiClient';
export { apiClient as api } from './apiClient';

// Centralized service exports
export { default as eventService } from './EventService';
export { default as authService } from './AuthService';
export { default as analyticsService } from './AnalyticsService';

// Services with default exports
export { default as tribesService } from './tribesService';
export { default as notificationsService } from './notificationsService';
export { default as socketService } from './socketService';
export { default as reportsService } from './reportsService';

export { default as feedService } from './FeedService';

// Re-export types and interfaces
export type { EventFilters } from './EventService';
export type { FeedPost } from './FeedService';