// App constants
export const APP_NAME = 'EventConnect';
export const APP_VERSION = '2.0.0';

// API Configuration
// API Configuration
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
const ENV_WS_URL = process.env.EXPO_PUBLIC_WS_URL;

export const API_BASE_URL = ENV_API_URL 
  ? `${ENV_API_URL}/api`
  : (__DEV__ ? 'http://localhost:5000/api' : 'https://api.eventconnect.com/api');

export const SOCKET_URL = ENV_WS_URL || (__DEV__ 
  ? 'http://localhost:5000' 
  : 'https://api.eventconnect.com');

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME_PREFERENCE: 'theme_preference',
  NOTIFICATION_SETTINGS: 'notification_settings',
  LOCATION_PERMISSION: 'location_permission',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

// Event Categories
export const EVENT_CATEGORIES = [
  { value: 'music', label: 'Música', icon: '🎵' },
  { value: 'sports', label: 'Deportes', icon: '⚽' },
  { value: 'technology', label: 'Tecnología', icon: '💻' },
  { value: 'business', label: 'Negocios', icon: '💼' },
  { value: 'education', label: 'Educación', icon: '📚' },
  { value: 'arts', label: 'Artes', icon: '🎨' },
  { value: 'food', label: 'Comida', icon: '🍕' },
  { value: 'health', label: 'Salud', icon: '🏥' },
  { value: 'travel', label: 'Viajes', icon: '✈️' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'other', label: 'Otros', icon: '🎪' },
] as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  EVENT_INVITE: 'event_invite',
  EVENT_UPDATE: 'event_update',
  EVENT_REMINDER: 'event_reminder',
  TRIBE_INVITE: 'tribe_invite',
  TRIBE_UPDATE: 'tribe_update',
  MESSAGE: 'message',
  ACHIEVEMENT: 'achievement',
  SYSTEM: 'system',
  ANNOUNCEMENT: 'announcement',
} as const;

// Achievement Categories
export const ACHIEVEMENT_CATEGORIES = {
  SOCIAL: 'social',
  EVENTS: 'events',
  TRIBES: 'tribes',
  EXPLORER: 'explorer',
  CREATOR: 'creator',
} as const;

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_REGION: {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  DEFAULT_ZOOM: 15,
  SEARCH_RADIUS: 25, // km
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
  INFINITE_SCROLL_THRESHOLD: 0.8,
} as const;

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Haptic Feedback Types
export const HAPTIC_TYPES = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// Image Configuration
export const IMAGE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  QUALITY: 0.8,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  EVENT_TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  EVENT_DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
  },
  TRIBE_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  TRIBE_DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 500,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  AUTH_REQUIRED: 'Debes iniciar sesión para continuar.',
  INVALID_CREDENTIALS: 'Credenciales inválidas.',
  USER_NOT_FOUND: 'Usuario no encontrado.',
  EVENT_NOT_FOUND: 'Evento no encontrado.',
  TRIBE_NOT_FOUND: 'Tribu no encontrada.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
  VALIDATION_ERROR: 'Por favor, verifica los datos ingresados.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '¡Bienvenido de vuelta!',
  REGISTER_SUCCESS: '¡Cuenta creada exitosamente!',
  EVENT_CREATED: 'Evento creado exitosamente.',
  EVENT_UPDATED: 'Evento actualizado exitosamente.',
  TRIBE_CREATED: 'Tribu creada exitosamente.',
  TRIBE_JOINED: 'Te has unido a la tribu.',
  PROFILE_UPDATED: 'Perfil actualizado exitosamente.',
  MESSAGE_SENT: 'Mensaje enviado.',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_AI_RECOMMENDATIONS: true,
  ENABLE_GAMIFICATION: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_LOCATION_SERVICES: true,
  ENABLE_CAMERA_INTEGRATION: true,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ANALYTICS: true,
} as const;


























