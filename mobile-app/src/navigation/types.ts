export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;

  // Main tabs
  Home: undefined;
  Feed: undefined;
  Discovery: undefined;
  Map: undefined;
  Profile: undefined;

  // Event screens
  Events: undefined;
  EventDetail: { eventId: string };
  CreateEvent: undefined;

  // Tribe screens
  Tribes: undefined;
  TribeDetail: { tribeId: string };
  CreateTribe: undefined;

  // Social
  StoriesViewer: { storyId?: string; userId?: string };
  CreateStory: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };

  // Messaging
  Messages: undefined;
  ChatDetail: { chatId: string };
  NewChat: undefined;

  // Utility
  Notifications: undefined;
  Settings: undefined;
  Search: undefined;
  Wallet: undefined;
  Services: undefined;
  QRScanner: undefined;
  Tickets: undefined;
  TicketDetail: { ticketId: string };
  Leaderboard: undefined;
  Achievements: undefined;
  Challenges: undefined;
  Checkout: { eventId: string; ticketType?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  CreateHub: undefined;
  Feed: undefined;
  Profile: undefined;
};
