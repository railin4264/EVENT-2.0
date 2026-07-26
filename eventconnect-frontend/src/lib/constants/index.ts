export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'
export const APP_NAME = 'EventConnect 2.0'

export const EVENT_CATEGORIES = [
  { id: 'sports', label: 'Sports & Fitness', color: '#10B981' },
  { id: 'music', label: 'Music & Concerts', color: '#8B5CF6' },
  { id: 'food', label: 'Food & Drink', color: '#F59E0B' },
  { id: 'technology', label: 'Technology', color: '#3B82F6' },
  { id: 'art', label: 'Art & Culture', color: '#EC4899' },
  { id: 'business', label: 'Business & Networking', color: '#6366F1' },
  { id: 'health', label: 'Health & Wellness', color: '#06B6D4' },
  { id: 'education', label: 'Education & Learning', color: '#84CC16' },
  { id: 'social', label: 'Social & Meetups', color: '#EF4444' },
  { id: 'entertainment', label: 'Entertainment', color: '#F97316' },
  { id: 'travel', label: 'Travel & Adventure', color: '#14B8A6' },
  { id: 'other', label: 'Other', color: '#6B7280' },
] as const

export const REACTION_TYPES = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😠', label: 'Angry' },
] as const

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const

export const ATTENDEE_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
} as const

export const NOTIFICATION_TYPES = {
  EVENT_INVITATION: 'event_invitation',
  EVENT_REMINDER: 'event_reminder',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  NEW_FOLLOWER: 'new_follower',
  TRIBE_INVITATION: 'tribe_invitation',
  TRIBE_REQUEST: 'tribe_request',
  MESSAGE: 'message',
  ACHIEVEMENT: 'achievement',
  SYSTEM: 'system',
} as const

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  SYSTEM: 'system',
} as const

export const THEME_COLORS = {
  PRIMARY: '#6366F1',
  SECONDARY: '#8B5CF6',
  ACCENT: '#EC4899',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
} as const

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
export const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/ogg']

export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_SEARCH_DEBOUNCE = 300

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  EXPLORE: '/explore',
  EVENTS: '/events',
  CREATE_EVENT: '/events/create',
  TRIBES: '/tribes',
  MESSAGES: '/messages',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
} as const