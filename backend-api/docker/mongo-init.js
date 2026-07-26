// MongoDB initialization script for EventConnect 2.0
// Creates optimized database, collections, and indexes for production

print('🚀 Initializing EventConnect MongoDB database...');

// Switch to eventconnect database
db = db.getSiblingDB('eventconnect');

// Create application user with appropriate permissions
db.createUser({
  user: 'eventconnect_app',
  pwd: process.env.MONGODB_APP_PASSWORD || 'eventconnect_secure_password_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'eventconnect'
    }
  ]
});

print('✅ Created application user');

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ location: '2dsphere' });
db.users.createIndex({ 'pushTokens.token': 1 });
db.users.createIndex({ 'oauthAccounts.provider': 1, 'oauthAccounts.providerId': 1 });
db.users.createIndex({ createdAt: 1 });
db.users.createIndex({ lastLogin: 1 });
db.users.createIndex({ isActive: 1 });

print('✅ Created Users collection indexes');

// Events collection indexes
db.events.createIndex({ location: '2dsphere' });
db.events.createIndex({ creator: 1 });
db.events.createIndex({ startDate: 1 });
db.events.createIndex({ endDate: 1 });
db.events.createIndex({ category: 1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ isPrivate: 1 });
db.events.createIndex({ featured: 1 });
db.events.createIndex({ 'attendees.user': 1 });
db.events.createIndex({ tags: 1 });
db.events.createIndex({ title: 'text', description: 'text', tags: 'text' });
db.events.createIndex({ createdAt: 1 });

print('✅ Created Events collection indexes');

// Tribes collection indexes
db.tribes.createIndex({ name: 1 }, { unique: true });
db.tribes.createIndex({ creator: 1 });
db.tribes.createIndex({ category: 1 });
db.tribes.createIndex({ isPrivate: 1 });
db.tribes.createIndex({ 'members.user': 1 });
db.tribes.createIndex({ location: '2dsphere' });
db.tribes.createIndex({ createdAt: 1 });
db.tribes.createIndex({ name: 'text', description: 'text', tags: 'text' });

print('✅ Created Tribes collection indexes');

// Notifications collection indexes
db.notifications.createIndex({ recipient: 1, read: 1 });
db.notifications.createIndex({ createdAt: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ 'data.eventId': 1 });
db.notifications.createIndex({ 'data.tribeId': 1 });

print('✅ Created Notifications collection indexes');

// Messages collection indexes
db.messages.createIndex({ conversationId: 1, createdAt: 1 });
db.messages.createIndex({ sender: 1 });
db.messages.createIndex({ createdAt: 1 });
db.messages.createIndex({ type: 1 });

print('✅ Created Messages collection indexes');

// Conversations collection indexes
db.conversations.createIndex({ participants: 1 });
db.conversations.createIndex({ type: 1 });
db.conversations.createIndex({ updatedAt: 1 });
db.conversations.createIndex({ 'lastMessage.createdAt': 1 });

print('✅ Created Conversations collection indexes');

// Stories collection indexes
db.stories.createIndex({ creator: 1 });
db.stories.createIndex({ expiresAt: 1 });
db.stories.createIndex({ createdAt: 1 });
db.stories.createIndex({ 'viewers.user': 1 });
db.stories.createIndex({ isPrivate: 1 });

print('✅ Created Stories collection indexes');

// Follows collection indexes
db.follows.createIndex({ follower: 1, following: 1 }, { unique: true });
db.follows.createIndex({ follower: 1 });
db.follows.createIndex({ following: 1 });
db.follows.createIndex({ createdAt: 1 });
db.follows.createIndex({ status: 1 });

print('✅ Created Follows collection indexes');

// Comments collection indexes
db.comments.createIndex({ targetType: 1, targetId: 1 });
db.comments.createIndex({ author: 1 });
db.comments.createIndex({ parentComment: 1 });
db.comments.createIndex({ createdAt: 1 });

print('✅ Created Comments collection indexes');

// Reactions collection indexes
db.reactions.createIndex({ targetType: 1, targetId: 1, user: 1 }, { unique: true });
db.reactions.createIndex({ user: 1 });
db.reactions.createIndex({ createdAt: 1 });
db.reactions.createIndex({ type: 1 });

print('✅ Created Reactions collection indexes');

// Reports collection indexes
db.reports.createIndex({ targetType: 1, targetId: 1 });
db.reports.createIndex({ reporter: 1 });
db.reports.createIndex({ status: 1 });
db.reports.createIndex({ createdAt: 1 });
db.reports.createIndex({ category: 1 });

print('✅ Created Reports collection indexes');

// Payments collection indexes
db.payments.createIndex({ user: 1 });
db.payments.createIndex({ eventId: 1 });
db.payments.createIndex({ stripePaymentIntentId: 1 }, { unique: true });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ createdAt: 1 });

print('✅ Created Payments collection indexes');

// Tickets collection indexes
db.tickets.createIndex({ eventId: 1, userId: 1 }, { unique: true });
db.tickets.createIndex({ userId: 1 });
db.tickets.createIndex({ eventId: 1 });
db.tickets.createIndex({ qrCode: 1 }, { unique: true });
db.tickets.createIndex({ status: 1 });
db.tickets.createIndex({ createdAt: 1 });

print('✅ Created Tickets collection indexes');

// Analytics collection indexes
db.analytics.createIndex({ eventType: 1, timestamp: 1 });
db.analytics.createIndex({ userId: 1, timestamp: 1 });
db.analytics.createIndex({ 'data.eventId': 1 });
db.analytics.createIndex({ 'data.tribeId': 1 });
db.analytics.createIndex({ timestamp: 1 });

print('✅ Created Analytics collection indexes');

// Performance metrics collection indexes
db.performancemetrics.createIndex({ timestamp: 1 });
db.performancemetrics.createIndex({ type: 1 });
db.performancemetrics.createIndex({ endpoint: 1 });

print('✅ Created Performance metrics collection indexes');

// Cache collection indexes (for session storage)
db.cache.createIndex({ key: 1 }, { unique: true });
db.cache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('✅ Created Cache collection indexes');

// Create TTL indexes for temporary data
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
db.stories.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.analytics.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
db.performancemetrics.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

print('✅ Created TTL indexes for data cleanup');

// Create compound indexes for common queries
db.events.createIndex({ location: '2dsphere', startDate: 1, category: 1 });
db.events.createIndex({ creator: 1, status: 1, startDate: 1 });
db.users.createIndex({ location: '2dsphere', isActive: 1, verified: 1 });
db.notifications.createIndex({ recipient: 1, type: 1, createdAt: -1 });
db.messages.createIndex({ conversationId: 1, createdAt: -1 });

print('✅ Created compound indexes for optimized queries');

// Initialize default categories and data
db.categories.insertMany([
  { name: 'Music', icon: '🎵', color: '#FF6B6B' },
  { name: 'Sports', icon: '⚽', color: '#4ECDC4' },
  { name: 'Technology', icon: '💻', color: '#45B7D1' },
  { name: 'Art', icon: '🎨', color: '#FFA726' },
  { name: 'Food', icon: '🍕', color: '#66BB6A' },
  { name: 'Business', icon: '💼', color: '#AB47BC' },
  { name: 'Education', icon: '📚', color: '#26A69A' },
  { name: 'Gaming', icon: '🎮', color: '#EF5350' },
  { name: 'Health', icon: '🏥', color: '#42A5F5' },
  { name: 'Travel', icon: '✈️', color: '#29B6F6' }
]);

print('✅ Inserted default categories');

// Create admin user if it doesn't exist
const adminExists = db.users.findOne({ email: 'admin@eventconnect.com' });
if (!adminExists) {
  db.users.insertOne({
    email: 'admin@eventconnect.com',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    password: '$2a$10$rQK8VfZ8vDyQJqWxjFDH7uGZa2N8dQzVk3nZ7XpZ9QF4Q0ZX8Y9mS', // hashed 'admin123'
    role: 'admin',
    verified: true,
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      notifications: {
        email: true,
        push: true,
        eventReminders: true,
        newMessages: true,
        weeklyDigest: false
      },
      privacy: {
        showProfile: true,
        showAttendedEvents: true,
        showLocation: false
      },
      preferences: {
        theme: 'system',
        language: 'es',
        timezone: 'America/Mexico_City'
      }
    }
  });
  print('✅ Created default admin user');
}

print('🎉 EventConnect MongoDB initialization completed successfully!');
print('📊 Total indexes created:', db.stats().indexes);
print('💾 Database size:', db.stats().dataSize, 'bytes');