import type { EVENT_CATEGORIES } from '../constants';

// Core types for EventConnect Mobile App

export interface User {
  id: string;
  _id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  country?: string;
  countryCode?: string;
  preferredLocale?: string;
  preferredCurrency?: string;
  bio?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  interests?: string[];
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id?: string;
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  endDate?: string;
  location: {
    lat?: number;
    lng?: number;
    address: string;
    city?: string;
    country?: string;
    coordinates?: [number, number];
    type?: string;
    venue?: string;
  } | string;
  price: number | { amount: number; currency: string };
  currency?: string;
  maxAttendees?: number;
  currentAttendees?: number;
  attendees: string[] | Array<{ user: string | User; status: string; joinedAt: string }>;
  attendeesCount?: number;
  isPrivate?: boolean;
  isSecretLocation?: boolean;
  isRecurring?: boolean;
  recurrenceSchedule?: string;
  isTourOrTrip?: boolean;
  isCommercialDeal?: boolean;
  createdBy: User | string;
  image?: string;
  images: string[] | Array<{ url: string; publicId: string }>;
  tags: string[];
  isVirtual?: boolean;
  virtualLink?: string;
  isAttending?: boolean;
  isFavorite?: boolean;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export type EventCategory = (typeof EVENT_CATEGORIES)[number]['value'] | 'arts' | 'travel';

export interface Tribe {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  members: User[];
  memberCount: number;
  createdBy: User;
  admins: User[];
  isPublic: boolean;
  avatar?: string;
  banner?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sender: User;
  receiver?: User;
  chatId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'location' | 'event' | 'tribe';
  media?: {
    url: string;
    type: string;
    size?: number;
  };
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  reference?: {
    id: string;
    type: 'event' | 'tribe' | 'user';
  };
  replyTo?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'tribe';
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipient: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType = 
  | 'like'
  | 'comment'
  | 'follow'
  | 'event_invite'
  | 'event_update'
  | 'event_reminder'
  | 'tribe_invite'
  | 'tribe_update'
  | 'message'
  | 'achievement'
  | 'system'
  | 'announcement';

export type NotificationCategory = 
  | 'social'
  | 'events'
  | 'tribes'
  | 'system'
  | 'achievements';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: Record<string, any>;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface Story {
  _id: string;
  id?: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  } | any;
  content: Array<{
    type: 'image' | 'video' | 'text';
    url?: string;
    text?: string;
    backgroundColor?: string;
    duration: number;
  }>;
  viewers?: Array<{
    user: string;
    viewedAt: string;
  }>;
  mediaUrl?: string;
  mediaUrls?: string[];
  viewCount?: number;
  expiresAt: string;
  isHighlight?: boolean;
  highlightTitle?: string;
  createdAt: string;
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  available: number;
  perks?: string[];
  isVIP?: boolean;
}

export interface Ticket {
  id: string;
  _id?: string;
  eventId: string;
  event?: Event | any;
  userId: string;
  user?: User;
  type: string;
  ticketType: TicketType | any;
  price: number;
  currency: string;
  status: 'active' | 'used' | 'cancelled' | 'transferred' | 'expired';
  qrCode?: string;
  data?: any;
  validFrom: string;
  validUntil: string;
  purchaseDate: string;
  usedAt?: string;
  createdAt: string;
}

export interface WalletBalance {
  available: number;
  pending: number;
  totalSpent: number;
  ticketsPurchased: number;
  totalSaved: number;
  currency: string;
}

export interface Transaction {
  id: string;
  _id?: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  referenceId?: string;
  referenceType?: 'event' | 'ticket' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  user: User;
  achievements: Achievement[];
  totalXP: number;
  level: number;
  stats: {
    eventsAttended: number;
    eventsCreated: number;
    tribesJoined: number;
    connectionsMade: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EventDetail: { eventId: string };
  TribeDetail: { tribeId: string };
  UserProfile: { userId: string };
  ChatDetail: { chatId: string };
  NewChat: undefined;
  CreateEvent: undefined;
  CreateTribe: undefined;
  Notifications: undefined;
  Settings: undefined;
  Login: undefined;
  Register: undefined;
  PostDetail: { postId: string };
  Search: undefined;
  Wallet: undefined;
  Services: undefined;
  Discovery: undefined;
  Messages: undefined;
  Tribes: undefined;
  StoriesViewer: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Feed: undefined;
  Discovery: undefined;
  Messages: undefined;
  Map: undefined;
  Tribes: undefined;
  Events: undefined;
  Profile: undefined;
  CreateHub: undefined;
};

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  country?: string;
  countryCode?: string;
  preferredLocale?: string;
  preferredCurrency?: string;
  lastName: string;
  name?: string;
  interests?: string[];
  birthDate?: string;
  gender?: string;
  acceptTerms?: boolean;
}

export interface CreateEventForm {
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  time: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  price: number;
  maxAttendees: number;
  tags: string[];
  isVirtual: boolean;
  virtualLink?: string;
}

export interface CreateTribeForm {
  name: string;
  description: string;
  category: EventCategory;
  isPublic: boolean;
  tags: string[];
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    textVariant: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    surfaceVariant: string;
    errorContainer: string;
    onErrorContainer: string;
    onSurface?: string;
    onSurfaceVariant?: string;
    outline?: string;
    pink?: string;
    violet?: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl?: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl?: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
      lineHeight?: number;
      letterSpacing?: number;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
      lineHeight?: number;
      letterSpacing?: number;
    };
    h3: {
      fontSize: number;
      fontWeight: string;
      lineHeight?: number;
      letterSpacing?: number;
    };
    body: {
      fontSize: number;
      fontWeight: string;
      lineHeight?: number;
      letterSpacing?: number;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
      lineHeight?: number;
      letterSpacing?: number;
    };
    button?: {
      fontSize: number;
      fontWeight: string;
      lineHeight?: number;
      letterSpacing?: number;
    };
  };
  gradients: {
    primaryCTA: string[];
    secondaryCTA: string[];
    surface: string[];
  };
  glass: {
    light: any;
    medium: any;
    heavy: any;
  };
}


























