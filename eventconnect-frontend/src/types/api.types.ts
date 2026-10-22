// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  // confirmPassword is frontend-only validation — never sent to backend
  name?: string;
  firstName?: string;
  lastName?: string;
  acceptTerms: boolean;
  interests?: string[];
  birthDate: string;
  phone?: string;
  country?: string;
  countryCode?: string;
  preferredLocale?: string;
  preferredCurrency?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  accessToken: string; // canonical field from backend
  refreshToken: string;
}

// User Types
export interface User {
  _id?: string;       // may be absent on login (backend returns id only)
  id: string;        // canonical ID (from _id)
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;      // Full name (computed from firstName + lastName)
  avatar?: string;
  country?: string;
  countryCode?: string;
  preferredLocale?: string;
  preferredCurrency?: string;
  bio?: string;
  phone?: string;
  location?: LocationData;
  interests: string[];
  role: 'user' | 'admin';
  isActive: boolean;
  isPrivate?: boolean;
  followers?: string[];
  following?: string[];
  points?: number;
  stats: {
    eventsCreated: number;
    eventsAttended: number;
    followers: number;
    following: number;
    connections?: number;
    points: number;
    level: number;
  };
  settings?: {
    notifications?: Record<string, boolean>;
    privacy?: Record<string, boolean>;
    preferences?: { theme?: string; language?: string; timezone?: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface LocationData {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  address: string;
  name?: string;
  venue?: string;
  city?: string;
  country?: string;
}

// Event Types
export interface Event {
  timeZone?: string;
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  endDate: string;
  location: LocationData;
  images: EventImage[];
  maxAttendees?: number;
  attendees: EventAttendee[];
  attendanceSummary?: unknown;
  createdBy: User;
  status: EventStatus;
  isPrivate: boolean;
  tags: string[];
  price?: {
    amount: number;
    currency: string;
  };
  comments: EventComment[];
  views: string[];
  shares: string[];
  tribe?: string;
  createdAt: string;
  updatedAt: string;
  // Runtime properties added by API
  isAttending?: boolean;
  isFavorite?: boolean;
  attendeesCount?: number;
  imageUrl?: string;
}

export interface EventImage {
  url: string;
  publicId: string;
  alt?: string;
}

export interface EventAttendee {
  user: string | User;
  status: 'pending' | 'confirmed' | 'declined';
  joinedAt: string;
}

export interface EventComment {
  _id: string;
  user: string | User;
  content: string;
  reactions: CommentReaction[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentReaction {
  user: string;
  type: 'like' | 'love' | 'laugh' | 'angry' | 'sad';
}

export type EventCategory = 
  | 'sports'
  | 'music'
  | 'food'
  | 'technology'
  | 'art'
  | 'business'
  | 'health'
  | 'education'
  | 'social'
  | 'entertainment'
  | 'travel'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

// Tribe Types
export interface Tribe {
  _id: string;
  name: string;
  description: string;
  avatar?: string;
  cover?: string;
  category: string;
  isPrivate: boolean;
  members: TribeMember[];
  admins: string[];
  createdBy: string | User;
  rules?: string[];
  location?: LocationData;
  stats: {
    memberCount: number;
    eventCount: number;
    activityLevel: 'low' | 'medium' | 'high';
  };
  createdAt: string;
  updatedAt: string;
}

export interface TribeMember {
  user: string | User;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: string;
  status: 'active' | 'inactive' | 'banned';
}

// Chat Types
export interface ChatRoom {
  _id: string;
  chatId?: string;
  type: 'direct' | 'group' | 'tribe' | 'event';
  name?: string;
  description?: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  user: string | User;
  role: 'member' | 'admin';
  joinedAt: string;
  lastSeen: string;
  isTyping: boolean;
}

export interface ChatMessage {
  _id: string;
  room: string;
  sender: string | User;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  attachments?: MessageAttachment[];
  reactions: MessageReaction[];
  mentions: string[];
  replyTo?: string;
  isEdited: boolean;
  editedAt?: string;
  readBy: MessageRead[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface MessageReaction {
  user: string;
  emoji: string;
}

export interface MessageRead {
  user: string;
  readAt: string;
}

// Notification Types
export interface Notification {
  _id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export type NotificationType = 
  | 'event_invitation'
  | 'event_reminder'
  | 'event_update'
  | 'event_cancelled'
  | 'new_follower'
  | 'tribe_invitation'
  | 'tribe_request'
  | 'message'
  | 'achievement'
  | 'system';

// Gamification Types
export interface UserStats {
  points: number;
  level: number;
  nextLevelPoints: number;
  totalEvents: number;
  completedEvents: number;
  achievementsCount: number;
  currentStreak: number;
  longestStreak: number;
}

export interface Achievement {
  _id: string;
  name: string;
  description: string;
  icon: string;
  category: 'events' | 'social' | 'exploration' | 'engagement';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  requirements: AchievementRequirement[];
  unlockedBy: string[];
}

export interface AchievementRequirement {
  type: 'event_count' | 'follower_count' | 'tribe_count' | 'streak' | 'special';
  value: number;
  description: string;
}

export interface UserAchievement {
  achievement: string | Achievement;
  unlockedAt: string;
  progress: number;
  isCompleted: boolean;
}

// Story Types
export interface Story {
  _id: string;
  user: string | User;
  content: StoryContent[];
  viewers: StoryViewer[];
  expiresAt: string;
  isHighlight: boolean;
  highlightTitle?: string;
  createdAt: string;
}

export interface StoryContent {
  type: 'image' | 'video' | 'text';
  url?: string;
  text?: string;
  backgroundColor?: string;
  duration: number;
}

export interface StoryViewer {
  user: string;
  viewedAt: string;
}

// Feed Types
export interface FeedPost {
  _id: string;
  user: string | User;
  content: string;
  attachments?: PostAttachment[];
  event?: string | Event;
  location?: LocationData;
  mentions: string[];
  hashtags: string[];
  reactions: PostReaction[];
  comments: FeedComment[];
  shares: PostShare[];
  isPromoted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostAttachment {
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface PostReaction {
  user: string;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  createdAt: string;
}

export interface FeedComment {
  _id: string;
  user: string | User;
  content: string;
  mentions: string[];
  reactions: PostReaction[];
  replies: FeedComment[];
  createdAt: string;
  updatedAt: string;
}

export interface PostShare {
  user: string;
  sharedAt: string;
  message?: string;
}
