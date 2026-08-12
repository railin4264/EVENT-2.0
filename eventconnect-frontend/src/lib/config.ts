// ============================================================
// API CONFIGURATION
// ============================================================

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
  TIMEOUT: 30000, // 30 seconds

  // Headers
  HEADERS: {
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web',
  },

  // Storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth-token',
    REFRESH_TOKEN: 'refresh-token',
    USER: 'user-data',
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Rate limiting
  RATE_LIMIT: {
    WINDOW: 1000, // 1 second
    MAX_REQUESTS: 10,
  },
} as const

// ============================================================
// API ENDPOINTS
// ============================================================

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Events
  EVENTS: {
    LIST: '/events',
    CREATE: '/events',
    GET: (id: string) => `/events/${id}`,
    UPDATE: (id: string) => `/events/${id}`,
    DELETE: (id: string) => `/events/${id}`,
    SEARCH: '/events/search',
    NEARBY: '/events/nearby',
    FAVORITES: '/events/favorites',
    ATTEND: (id: string) => `/events/${id}/attend`,
    JOIN: (id: string) => `/events/${id}/join`,
    LEAVE: (id: string) => `/events/${id}/leave`,
    FAVORITE: (id: string) => `/events/${id}/favorite`,
    ATTENDEES: (id: string) => `/events/${id}/attendees`,
    COMMENTS: (id: string) => `/events/${id}/comments`,
    COMMENT: (id: string, commentId: string) => `/events/${id}/comments/${commentId}`,
    VIEW: (id: string) => `/events/${id}/view`,
    SHARE: (id: string) => `/events/${id}/share`,
  },

  // Users
  USERS: {
    PROFILE: '/users/profile',
    GET: (id: string) => `/users/${id}`,
    UPDATE_PROFILE: '/users/profile',
    EVENTS: (id: string) => `/users/${id}/events`,
    AVATAR: '/users/avatar',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD: '/notifications/unread-count',
    READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
    DELETE: (id: string) => `/notifications/${id}`,
  },

  // Chat
  CHAT: {
    CONVERSATIONS: '/chat/chats',
    CONVERSATION: (id: string) => `/chat/conversations/${id}`,
    CREATE_CONVERSATION: '/chat/conversations',
    MESSAGES: (conversationId: string) => `/chat/messages/${conversationId}`,
    SEND_MESSAGE: '/chat/messages',
    DELETE_MESSAGE: (id: string) => `/chat/messages/${id}`,
  },

  // Gamification
  GAMIFICATION: {
    ACHIEVEMENTS: '/gamification/achievements',
    USER_ACHIEVEMENTS: '/gamification/user-achievements',
    LEADERBOARD: '/gamification/leaderboard',
    CLAIM: (achievementId: string) => `/gamification/claim/${achievementId}`,
    CHALLENGES: '/gamification/challenges',
    JOIN_CHALLENGE: (id: string) => `/gamification/challenges/${id}/join`,
  },

  // Tribes
  TRIBES: {
    LIST: '/tribes',
    CREATE: '/tribes',
    GET: (id: string) => `/tribes/${id}`,
    UPDATE: (id: string) => `/tribes/${id}`,
    DELETE: (id: string) => `/tribes/${id}`,
    JOIN: (id: string) => `/tribes/${id}/join`,
    LEAVE: (id: string) => `/tribes/${id}/leave`,
    MEMBERS: (id: string) => `/tribes/${id}/members`,
    EVENTS: (id: string) => `/tribes/${id}/events`,
  },

  // Dashboard & Analytics
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT: '/dashboard/recent',
    RECOMMENDED: '/dashboard/recommended',
  },

  ANALYTICS: {
    EVENT: (id: string) => `/analytics/events/${id}`,
    OVERVIEW: '/analytics/overview',
  },

  // Maps
  MAPS: {
    GEOCODE: '/maps/geocode',
    REVERSE_GEOCODE: '/maps/reverse-geocode',
  },

  // Search
  SEARCH: {
    GLOBAL: '/search/global',
    SUGGESTIONS: '/search/suggestions',
  },

  // Feed
  FEED: {
    LIST: '/feed',
    TRENDING: '/feed/trending',
    CREATE_POST: '/feed/posts',
  },

  // Follows
  FOLLOWS: {
    FOLLOW: (userId: string) => `/follows/${userId}`,
    UNFOLLOW: (userId: string) => `/follows/${userId}`,
    FOLLOWERS: (userId: string) => `/follows/followers/${userId}`,
    FOLLOWING: (userId: string) => `/follows/following/${userId}`,
  },

  // Upload
  UPLOAD: {
    IMAGE: '/upload/image',
    FILE: '/upload/file',
    DELETE: (publicId: string) => `/upload/${publicId}`,
  },

  // Tickets & Payments
  TICKETS: {
    LIST: '/tickets',
    PURCHASE: '/tickets/purchase',
    GET: (id: string) => `/tickets/${id}`,
    VALIDATE: (id: string) => `/tickets/${id}/validate`,
  },

  PAYMENTS: {
    CREATE_INTENT: '/payments/create-intent',
    CONFIRM: '/payments/confirm',
    HISTORY: '/payments/history',
  },
} as const

// ============================================================
// WEBSOCKET EVENTS
// ============================================================

export const WS_EVENTS = {
  NOTIFICATION: 'notification',
  MESSAGE: 'message',
  EVENT_UPDATE: 'event-update',
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
} as const

// ============================================================
// APP CONSTANTS
// ============================================================

export const APP_CONSTANTS = {
  // Event categories
  EVENT_CATEGORIES: [
    'music',
    'sports',
    'technology',
    'food',
    'art',
    'business',
    'education',
    'other',
  ] as const,

  // Event statuses
  EVENT_STATUSES: ['draft', 'published', 'cancelled', 'completed'] as const,

  // Attendee statuses
  ATTENDEE_STATUSES: [
    'attending',
    'maybe',
    'not-attending',
    'confirmed',
    'pending',
  ] as const,

  // Notification types
  NOTIFICATION_TYPES: [
    'event_invite',
    'new_follower',
    'event_reminder',
    'achievement',
    'tribe_invite',
    'event_update',
    'like',
    'comment',
  ] as const,

  // Achievement rarities
  ACHIEVEMENT_RARITIES: ['common', 'rare', 'epic', 'legendary'] as const,

  // Tribe member roles
  TRIBE_ROLES: ['admin', 'moderator', 'member'] as const,

  // Password validation
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PASSWORD_MIN_LENGTH: 8,

  // XP levels
  XP_PER_LEVEL: 100,

  // Map defaults
  MAP_DEFAULTS: {
    CENTER: [40.7128, -74.006] as [number, number], // New York
    ZOOM: 12,
    RADIUS: 10, // km
  },
} as const

// Export API_URL for backward compatibility
export const API_URL = API_CONFIG.BASE_URL
