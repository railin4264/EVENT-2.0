// ============================================================
// BACKEND MODELS - TypeScript Interfaces
// Base URL: http://localhost:5000/api
// ============================================================

// ============================================================
// USER MODELS
// ============================================================

export interface User {
  _id: string
  id?: string
  username: string
  email: string
  firstName: string
  lastName: string
  name?: string
  birthDate?: string
  age?: number
  avatar?: string
  bio?: string
  location?: string
  interests: string[]
  role?: 'user' | 'admin'
  isActive?: boolean
  // Counts (legacy flat fields)
  level: number
  xp?: number
  followers: number
  following: number
  eventsAttended: number
  eventsCreated: number
  // Stats object (api.types.ts shape)
  stats?: {
    eventsCreated: number
    eventsAttended: number
    followers: number
    following: number
    connections?: number
    points: number
    level: number
  }
  points?: number
  isEmailVerified?: boolean
  lastActive?: Date
  settings?: UserSettings
  createdAt: Date | string
  updatedAt: Date | string
}

export interface UserSettings {
  notifications: {
    email: boolean
    push: boolean
    eventReminders: boolean
    newFollowers: boolean
    eventUpdates: boolean
  }
  privacy: {
    showEmail: boolean
    showLocation: boolean
    profileVisibility: 'public' | 'private' | 'friends'
  }
  theme: 'light' | 'dark' | 'auto'
}

export interface PublicUser {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  bio?: string
  location?: string
  interests: string[]
  level: number
  xp: number
  followers: number
  following: number
  eventsAttended: number
  eventsCreated: number
}

// ============================================================
// AUTH MODELS
// ============================================================

export interface RegisterRequest {
  username: string
  email: string
  password: string // min 8 chars, uppercase, lowercase, number, special char
  firstName: string
  lastName: string
  acceptTerms: boolean
  interests?: string[]
  bio?: string
  location?: string
  birthDate?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  token: string
  user: User
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

// ============================================================
// EVENT MODELS
// ============================================================

export type EventCategory =
  | 'music'
  | 'sports'
  | 'technology'
  | 'food'
  | 'art'
  | 'business'
  | 'education'
  | 'dance'
  | 'outdoors'
  | 'wellness'
  | 'workshop'
  | 'literature'
  | 'gaming'
  | 'film'
  | 'photography'
  | 'culture'
  | 'community'
  | 'family'
  | 'networking'
  | 'nightlife'
  | 'entertainment'
  | 'health'
  | 'religion'
  | 'politics'
  | 'charity'
  | 'science'
  | 'party'
  | 'social'
  | 'other'

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export type AttendeeStatus =
  | 'attending'
  | 'maybe'
  | 'not-attending'
  | 'confirmed'
  | 'pending'

export interface EventLocation {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
  address: string
  venue?: string
  city?: string
  country?: string
  countryCode?: string
}

export interface EventImage {
  url: string
  publicId: string
  width?: number
  height?: number
}

export interface EventPrice {
  amount: number
  currency: string
}

export interface EventAttendee {
  user: string | User // User ID or populated User
  status: AttendeeStatus
  joinedAt: Date
}

export interface Event {
  imported?: boolean
  organizer?: string
  publicSource?: { name?: string; datasetUrl?: string; license?: string; licenseUrl?: string }
  attendanceSummary?: unknown;
  timeZone?: string
  _id: string
  title: string
  description: string
  category: EventCategory
  date: Date | string
  endDate?: Date | string
  location: EventLocation
  images: EventImage[]
  imageUrl?: string // optional shortcut (backend may return images[0]?.url as imageUrl)
  maxAttendees?: number
  attendees: EventAttendee[]
  createdBy: string | User
  status: EventStatus
  isPrivate: boolean
  ageRestriction?: {
    minAge: number
    maxAge?: number
    isAdultOnly: boolean
  }
  tags: string[]
  price?: EventPrice
  attendeesCount?: number
  isFull?: boolean
  viewsCount?: number
  sharesCount?: number
  likesCount?: number
  commentsCount?: number
  isAttending?: boolean
  isFavorite?: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CreateEventRequest {
  title: string
  description: string
  category: EventCategory
  date: Date
  endDate?: Date
  location: {
    coordinates: [number, number]
    address: string
    venue?: string
  }
  images?: EventImage[]
  maxAttendees?: number
  isPrivate?: boolean
  ageRestriction?: {
    minAge: number
    maxAge?: number
    isAdultOnly: boolean
  }
  tags?: string[]
  price?: EventPrice

}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

export interface EventFilters {
  countryCode?: string
  city?: string
  timeFilter?: string
  isUnofficial?: string
  category?: EventCategory
  date_from?: string
  date_to?: string
  status?: EventStatus
  search?: string
  lat?: number
  lng?: number
  radius?: number // in kilometers
  page?: number
  limit?: number
  sort?: string
}

// ============================================================
// NOTIFICATION MODELS
// ============================================================

export type NotificationType =
  | 'event_invite'
  | 'new_follower'
  | 'event_reminder'
  | 'achievement'
  | 'tribe_invite'
  | 'event_update'
  | 'like'
  | 'comment'
  | 'event_cancelled'
  | 'event_starting_soon'

export interface Notification {
  _id: string
  recipient?: string | User
  user?: string
  sender?: string | User
  type: NotificationType
  title: string
  message: string
  read?: boolean
  isRead?: boolean
  data?: any
  link?: string
  priority?: 'low' | 'medium' | 'high'
  createdAt: Date | string
}

// ============================================================
// CHAT MODELS
// ============================================================

export type MessageType = 'text' | 'image' | 'file'

export interface Message {
  _id: string
  conversation: string // Conversation ID
  sender: string | User // User ID or populated User
  content: string
  type: MessageType
  read: boolean
  attachments?: {
    url: string
    type: string
    name: string
  }[]
  createdAt: Date
  updatedAt: Date
}

export interface Conversation {
  _id: string
  participants: (string | User)[] // User IDs or populated Users
  lastMessage?: Message
  unreadCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface SendMessageRequest {
  conversationId: string
  content: string
  type?: MessageType
  attachments?: {
    url: string
    type: string
    name: string
  }[]
}

// ============================================================
// GAMIFICATION MODELS
// ============================================================

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Achievement {
  _id: string
  name: string
  description: string
  icon: string
  xpReward: number
  requirement: {
    type: string
    value: number
  }
  rarity: AchievementRarity
  category?: string
  isSecret?: boolean
  createdAt: Date
}

export interface UserAchievement {
  _id: string
  user: string | User
  achievement: string | Achievement
  unlockedAt: Date
  progress?: number
}

export interface Challenge {
  _id: string
  title: string
  description: string
  type: string
  goal: number
  reward: {
    xp: number
    badge?: string
  }
  startDate: Date
  endDate: Date
  participants: (string | User)[]
  status: 'active' | 'completed' | 'expired'
  createdAt: Date
}

export interface LeaderboardEntry {
  rank: number
  user: User
  xp: number
  level: number
  eventsAttended: number
  eventsCreated: number
}

// ============================================================
// TRIBE MODELS
// ============================================================

export type TribeMemberRole = 'admin' | 'moderator' | 'member'

export interface TribeMember {
  user: string | User
  role: TribeMemberRole
  joinedAt: Date
}

export interface Tribe {
  _id: string
  name: string
  description: string
  image?: string
  category: string
  members: TribeMember[]
  createdBy: string | User
  isPrivate: boolean
  membersCount?: number // virtual field
  eventsCount?: number // virtual field
  tags?: string[]
  rules?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTribeRequest {
  name: string
  description: string
  image?: string
  category: string
  isPrivate?: boolean
  tags?: string[]
  rules?: string
}

// ============================================================
// COMMENT MODELS
// ============================================================

export interface Comment {
  _id: string
  event: string | Event
  user: string | User
  content: string
  likes: (string | User)[]
  replies?: Comment[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateCommentRequest {
  eventId: string
  content: string
  parentId?: string // for replies
}

// ============================================================
// TICKET & PAYMENT MODELS
// ============================================================

export type TicketStatus = 'valid' | 'used' | 'cancelled' | 'expired'

export interface Ticket {
  _id: string
  event: string | Event
  user: string | User
  qrCode: string
  status: TicketStatus
  purchaseDate: Date
  price: EventPrice
  validatedAt?: Date
  validatedBy?: string | User
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Payment {
  _id: string
  user: string | User
  event: string | Event
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: string
  transactionId?: string
  ticket?: string | Ticket
  createdAt: Date
  updatedAt: Date
}

export interface CreatePaymentIntentRequest {
  eventId: string
  amount: number
  currency: string
}

// ============================================================
// ANALYTICS MODELS
// ============================================================

export interface EventAnalytics {
  eventId: string
  views: number
  shares: number
  favorites: number
  attendees: {
    total: number
    confirmed: number
    pending: number
    maybe: number
  }
  demographics: {
    ageGroups: Record<string, number>
    genderDistribution: Record<string, number>
    locationDistribution: Record<string, number>
  }
  engagement: {
    comments: number
    likes: number
    avgRating?: number
  }
  revenue?: {
    totalSales: number
    ticketsSold: number
    currency: string
  }
}

export interface DashboardStats {
  totalEvents: number
  upcomingEvents: number
  attendedEvents: number
  createdEvents: number
  totalXP: number
  level: number
  achievements: number
  followers: number
  following: number
  notifications: {
    unread: number
    total: number
  }
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T = any> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiError {
  success: false
  error: string
  message: string
  statusCode: number
  details?: any
}

// ============================================================
// WEBSOCKET EVENT TYPES
// ============================================================

export interface WebSocketEvent {
  type: 'notification' | 'message' | 'event-update' | 'user-online' | 'user-offline'
  data: any
  timestamp: Date
}

export interface NotificationEvent extends WebSocketEvent {
  type: 'notification'
  data: Notification
}

export interface MessageEvent extends WebSocketEvent {
  type: 'message'
  data: Message
}

export interface EventUpdateEvent extends WebSocketEvent {
  type: 'event-update'
  data: {
    eventId: string
    updateType: 'cancelled' | 'updated' | 'reminder'
    event: Event
  }
}

export interface UserStatusEvent extends WebSocketEvent {
  type: 'user-online' | 'user-offline'
  data: {
    userId: string
    status: 'online' | 'offline'
  }
}
