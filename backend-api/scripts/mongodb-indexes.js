/**
 * MongoDB Index Optimization Script for EventConnect 2.0
 * Creates optimized indexes for production performance
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect_dev';

async function createOptimizedIndexes() {
  let client;

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Users Collection Indexes
    console.log('\n📊 Creating User indexes...');
    await db.collection('users').createIndexes([
      // Authentication queries
      { key: { email: 1 }, unique: true, name: 'email_unique' },
      { key: { username: 1 }, unique: true, name: 'username_unique' },

      // Active user queries
      { key: { isActive: 1, email: 1 }, name: 'active_users_email' },
      { key: { isActive: 1, username: 1 }, name: 'active_users_username' },

      // Profile and search queries
      { key: { firstName: 1, lastName: 1 }, name: 'user_names' },
      { key: { location: '2dsphere' }, name: 'user_location_geo' },
      { key: { interests: 1 }, name: 'user_interests' },

      // Security and session management
      { key: { 'tokens.token': 1 }, name: 'user_tokens' },
      { key: { refreshTokens: 1 }, name: 'user_refresh_tokens' },
      { key: { lastLogin: -1 }, name: 'user_last_login' },

      // Two-factor authentication
      { key: { 'twoFactor.isEnabled': 1 }, name: 'user_2fa_enabled' },
      { key: { 'twoFactor.tempSecret': 1 }, expireAfterSeconds: 600, name: 'user_2fa_temp_secret_ttl' },

      // Account verification
      { key: { isEmailVerified: 1, createdAt: -1 }, name: 'email_verification_status' },
      { key: { emailVerificationToken: 1 }, expireAfterSeconds: 86400, name: 'email_verification_token_ttl' },

      // Password reset
      { key: { resetPasswordToken: 1 }, expireAfterSeconds: 3600, name: 'password_reset_token_ttl' },

      // Admin queries
      { key: { role: 1, createdAt: -1 }, name: 'user_roles' },
      { key: { createdAt: -1 }, name: 'user_creation_date' }
    ]);

    // Events Collection Indexes
    console.log('📊 Creating Event indexes...');
    await db.collection('events').createIndexes([
      // Core event queries
      { key: { status: 1, startDate: 1 }, name: 'event_status_date' },
      { key: { status: 1, isPrivate: 1, startDate: 1 }, name: 'public_events_by_date' },

      // Geographic queries
      { key: { 'location.coordinates': '2dsphere' }, name: 'event_location_geo' },
      { key: { 'venue.location.coordinates': '2dsphere' }, name: 'venue_location_geo' },

      // Search and filtering
      { key: { category: 1, startDate: 1 }, name: 'events_by_category' },
      { key: { tags: 1, startDate: 1 }, name: 'events_by_tags' },
      { key: { title: 'text', description: 'text' }, name: 'event_text_search' },

      // Creator and organization queries
      { key: { creator: 1, createdAt: -1 }, name: 'events_by_creator' },
      { key: { organizer: 1, startDate: 1 }, name: 'events_by_organizer' },

      // Attendance and capacity
      { key: { 'attendees.userId': 1 }, name: 'event_attendees' },
      { key: { attendeeCount: -1, startDate: 1 }, name: 'popular_events' },
      { key: { capacity: 1, attendeeCount: 1 }, name: 'event_capacity_status' },

      // Time-based queries
      { key: { startDate: 1, endDate: 1 }, name: 'event_time_range' },
      { key: { createdAt: -1 }, name: 'recent_events' },
      { key: { updatedAt: -1 }, name: 'recently_updated_events' },

      // Featured and promoted events
      { key: { isFeatured: 1, startDate: 1 }, name: 'featured_events' },
      { key: { isPromoted: 1, startDate: 1 }, name: 'promoted_events' },

      // Recurring events
      { key: { 'recurrence.isRecurring': 1, 'recurrence.pattern': 1 }, name: 'recurring_events' },

      // Payment and pricing
      { key: { isPaid: 1, 'pricing.amount': 1 }, name: 'paid_events_by_price' },
      { key: { 'tickets.type': 1, 'tickets.available': 1 }, name: 'ticket_availability' }
    ]);

    // Tribes Collection Indexes
    console.log('📊 Creating Tribe indexes...');
    await db.collection('tribes').createIndexes([
      // Core tribe queries
      { key: { isPrivate: 1, isActive: 1 }, name: 'public_active_tribes' },
      { key: { category: 1, isActive: 1 }, name: 'tribes_by_category' },

      // Geographic queries
      { key: { 'location.coordinates': '2dsphere' }, name: 'tribe_location_geo' },

      // Membership queries
      { key: { 'members.userId': 1 }, name: 'tribe_members' },
      { key: { 'admins.userId': 1 }, name: 'tribe_admins' },
      { key: { 'moderators.userId': 1 }, name: 'tribe_moderators' },
      { key: { creator: 1, createdAt: -1 }, name: 'tribes_by_creator' },

      // Activity and popularity
      { key: { 'stats.memberCount': -1 }, name: 'tribes_by_member_count' },
      { key: { 'stats.activityLevel': 1, 'stats.memberCount': -1 }, name: 'active_popular_tribes' },

      // Search
      { key: { name: 'text', description: 'text', tags: 'text' }, name: 'tribe_text_search' },
      { key: { tags: 1 }, name: 'tribes_by_tags' },

      // Time-based
      { key: { createdAt: -1 }, name: 'recent_tribes' },
      { key: { updatedAt: -1 }, name: 'recently_updated_tribes' },

      // Featured tribes
      { key: { isFeatured: 1, 'stats.memberCount': -1 }, name: 'featured_tribes' }
    ]);

    // Messages Collection Indexes
    console.log('📊 Creating Message indexes...');
    await db.collection('messages').createIndexes([
      // Core messaging queries
      { key: { chatId: 1, createdAt: -1 }, name: 'messages_by_chat_recent' },
      { key: { sender: 1, createdAt: -1 }, name: 'messages_by_sender' },
      { key: { recipient: 1, createdAt: -1 }, name: 'messages_by_recipient' },

      // Message status
      { key: { isRead: 1, recipient: 1, createdAt: -1 }, name: 'unread_messages' },
      { key: { isDelivered: 1, createdAt: -1 }, name: 'delivery_status' },

      // Message types
      { key: { messageType: 1, chatId: 1, createdAt: -1 }, name: 'messages_by_type' },

      // Group/tribe messages
      { key: { tribeId: 1, createdAt: -1 }, name: 'tribe_messages' },
      { key: { eventId: 1, createdAt: -1 }, name: 'event_messages' },

      // Search in messages
      { key: { content: 'text' }, name: 'message_content_search' },

      // TTL for temporary messages
      { key: { createdAt: 1 }, expireAfterSeconds: 2592000, name: 'message_ttl_30_days', partialFilterExpression: { isTemporary: true } }
    ]);

    // Posts/Feed Collection Indexes
    console.log('📊 Creating Post indexes...');
    await db.collection('posts').createIndexes([
      // Feed queries
      { key: { author: 1, createdAt: -1 }, name: 'posts_by_author' },
      { key: { isPublic: 1, createdAt: -1 }, name: 'public_posts_feed' },
      { key: { tribeId: 1, createdAt: -1 }, name: 'tribe_posts' },

      // Engagement metrics
      { key: { likeCount: -1, createdAt: -1 }, name: 'popular_posts' },
      { key: { commentCount: -1, createdAt: -1 }, name: 'most_commented_posts' },
      { key: { shareCount: -1, createdAt: -1 }, name: 'most_shared_posts' },

      // User interactions
      { key: { 'likes.userId': 1 }, name: 'post_likes' },
      { key: { 'shares.userId': 1 }, name: 'post_shares' },

      // Content type
      { key: { postType: 1, createdAt: -1 }, name: 'posts_by_type' },
      { key: { hasMedia: 1, createdAt: -1 }, name: 'media_posts' },

      // Search
      { key: { content: 'text', tags: 'text' }, name: 'post_content_search' },
      { key: { tags: 1, createdAt: -1 }, name: 'posts_by_tags' },

      // Time-based
      { key: { createdAt: -1 }, name: 'recent_posts' },
      { key: { updatedAt: -1 }, name: 'recently_updated_posts' }
    ]);

    // Comments Collection Indexes
    console.log('📊 Creating Comment indexes...');
    await db.collection('comments').createIndexes([
      // Core comment queries
      { key: { postId: 1, createdAt: 1 }, name: 'comments_by_post' },
      { key: { author: 1, createdAt: -1 }, name: 'comments_by_author' },

      // Nested comments (replies)
      { key: { parentComment: 1, createdAt: 1 }, name: 'comment_replies' },
      { key: { threadId: 1, createdAt: 1 }, name: 'comment_threads' },

      // Comment interactions
      { key: { 'likes.userId': 1 }, name: 'comment_likes' },
      { key: { likeCount: -1 }, name: 'popular_comments' },

      // Time-based
      { key: { createdAt: -1 }, name: 'recent_comments' }
    ]);

    await db.collection('communityactions').createIndexes([
      { key: { scope: 1, target: 1 }, unique: true, name: 'scope_1_target_1' }
    ]);
    await db.collection('personalplandrafts').createIndexes([
      { key: { owner: 1, updatedAt: -1 }, name: 'owner_1_updatedAt_-1' },
      { key: { owner: 1, slot: 1 }, unique: true, partialFilterExpression: { slot: { $type: 'number' } }, name: 'owner_1_slot_1' }
    ]);
    await db.collection('partnerneeds').createIndexes([
      { key: { owner: 1, createdAt: -1 }, name: 'owner_1_createdAt_-1' },
      { key: { status: 1, createdAt: -1 }, name: 'status_1_createdAt_-1' }
    ]);
    await db.collection('partnerspaces').createIndexes([
      { key: { owner: 1, createdAt: -1 }, name: 'owner_1_createdAt_-1' }
    ]);

    await db.collection('eventreviews').createIndexes([
      { key: { event: 1, user: 1 }, unique: true, name: 'event_1_user_1' }
    ]);
    await db.collection('ideaconditions').createIndexes([
      { key: { idea: 1, user: 1 }, unique: true, name: 'idea_1_user_1' }
    ]);

    // Notifications Collection Indexes
    console.log('📊 Creating Notification indexes...');
    await db.collection('notifications').createIndexes([
      { key: { deliveryKey: 1 }, unique: true, sparse: true, name: 'deliveryKey_1' },
      // Core notification queries
      { key: { recipient: 1, createdAt: -1 }, name: 'notifications_by_recipient' },
      { key: { recipient: 1, isRead: 1, createdAt: -1 }, name: 'unread_notifications' },

      // Notification types
      { key: { type: 1, recipient: 1, createdAt: -1 }, name: 'notifications_by_type' },

      // Related entities
      { key: { relatedEvent: 1, createdAt: -1 }, name: 'event_notifications' },
      { key: { relatedTribe: 1, createdAt: -1 }, name: 'tribe_notifications' },
      { key: { relatedUser: 1, createdAt: -1 }, name: 'user_notifications' },

      // TTL for old notifications (90 days)
      { key: { createdAt: 1 }, expireAfterSeconds: 7776000, name: 'notification_ttl_90_days' }
    ]);

    // Stories Collection Indexes
    console.log('📊 Creating Story indexes...');
    await db.collection('stories').createIndexes([
      // Core story queries
      { key: { author: 1, createdAt: -1 }, name: 'stories_by_author' },
      { key: { isActive: 1, createdAt: -1 }, name: 'active_stories' },

      // Geographic stories
      { key: { 'location.coordinates': '2dsphere' }, name: 'story_location_geo' },

      // Story viewers
      { key: { 'viewers.userId': 1 }, name: 'story_viewers' },

      // TTL for stories (24 hours)
      { key: { createdAt: 1 }, expireAfterSeconds: 86400, name: 'story_ttl_24_hours' }
    ]);

    // Analytics Collection Indexes
    console.log('📊 Creating Analytics indexes...');
    await db.collection('analytics').createIndexes([
      // Time-based analytics
      { key: { eventType: 1, timestamp: -1 }, name: 'analytics_by_event_type' },
      { key: { userId: 1, timestamp: -1 }, name: 'user_analytics' },
      { key: { sessionId: 1, timestamp: 1 }, name: 'session_analytics' },

      // Entity analytics
      { key: { entityType: 1, entityId: 1, timestamp: -1 }, name: 'entity_analytics' },

      // Aggregation queries
      { key: { timestamp: -1 }, name: 'recent_analytics' },
      { key: { 'metadata.platform': 1, timestamp: -1 }, name: 'platform_analytics' },

      // TTL for analytics data (1 year)
      { key: { timestamp: 1 }, expireAfterSeconds: 31536000, name: 'analytics_ttl_1_year' }
    ]);

    // Payments Collection Indexes
    console.log('📊 Creating Payment indexes...');
    await db.collection('payments').createIndexes([
      // Core payment queries
      { key: { userId: 1, createdAt: -1 }, name: 'payments_by_user' },
      { key: { eventId: 1, status: 1 }, name: 'event_payments' },
      { key: { status: 1, createdAt: -1 }, name: 'payments_by_status' },

      // Payment processing
      { key: { stripePaymentIntentId: 1 }, unique: true, sparse: true, name: 'stripe_payment_intent_unique' },
      { key: { stripeChargeId: 1 }, unique: true, sparse: true, name: 'stripe_charge_unique' },

      // Financial reporting
      { key: { amount: 1, createdAt: -1 }, name: 'payments_by_amount' },
      { key: { currency: 1, createdAt: -1 }, name: 'payments_by_currency' },

      // Refunds and disputes
      { key: { refundStatus: 1, createdAt: -1 }, name: 'refund_status' },

      // Time-based
      { key: { createdAt: -1 }, name: 'recent_payments' }
    ]);

    console.log('\n✅ All indexes created successfully!');

    // Display index information
    console.log('\n📋 Index Summary:');
    const collections = ['users', 'events', 'tribes', 'messages', 'posts', 'comments', 'notifications', 'stories', 'analytics', 'payments'];

    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`\n${collectionName}: ${indexes.length} indexes`);
      indexes.forEach(index => {
        if (index.name !== '_id_') {
          console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
if (require.main === module) {
  createOptimizedIndexes()
    .then(() => {
      console.log('\n🎉 MongoDB optimization completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 MongoDB optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { createOptimizedIndexes };
