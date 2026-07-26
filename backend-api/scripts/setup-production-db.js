#!/usr/bin/env node

/**
 * Production Database Setup Script
 * Configures MongoDB for production environment
 */

require('dotenv').config({ path: '.env.production' });
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Import models to ensure they're registered
require('../src/models/User');
require('../src/models/Event');
require('../src/models/Tribe');
require('../src/models/Chat');
require('../src/models/Message');
require('../src/models/Achievement');
require('../src/models/UserAchievement');

async function setupProductionDatabase() {
  try {
    console.log('🚀 Setting up production database...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB successfully\n');

    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    
    // User indexes
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.db.collection('users').createIndex({ username: 1 }, { unique: true });
    await mongoose.connection.db.collection('users').createIndex({ 'location.coordinates': '2dsphere' });
    await mongoose.connection.db.collection('users').createIndex({ createdAt: -1 });
    console.log('✅ User indexes created');

    // Event indexes
    await mongoose.connection.db.collection('events').createIndex({ 'location.coordinates': '2dsphere' });
    await mongoose.connection.db.collection('events').createIndex({ date: 1 });
    await mongoose.connection.db.collection('events').createIndex({ category: 1 });
    await mongoose.connection.db.collection('events').createIndex({ createdBy: 1 });
    await mongoose.connection.db.collection('events').createIndex({ title: 'text', description: 'text' });
    await mongoose.connection.db.collection('events').createIndex({ createdAt: -1 });
    console.log('✅ Event indexes created');

    // Tribe indexes
    await mongoose.connection.db.collection('tribes').createIndex({ name: 'text', description: 'text' });
    await mongoose.connection.db.collection('tribes').createIndex({ category: 1 });
    await mongoose.connection.db.collection('tribes').createIndex({ createdBy: 1 });
    await mongoose.connection.db.collection('tribes').createIndex({ members: 1 });
    await mongoose.connection.db.collection('tribes').createIndex({ createdAt: -1 });
    console.log('✅ Tribe indexes created');

    // Chat indexes
    await mongoose.connection.db.collection('chats').createIndex({ participants: 1 });
    await mongoose.connection.db.collection('chats').createIndex({ tribeId: 1 });
    await mongoose.connection.db.collection('chats').createIndex({ createdAt: -1 });
    console.log('✅ Chat indexes created');

    // Message indexes
    await mongoose.connection.db.collection('messages').createIndex({ chatId: 1, createdAt: -1 });
    await mongoose.connection.db.collection('messages').createIndex({ sender: 1 });
    await mongoose.connection.db.collection('messages').createIndex({ createdAt: -1 });
    console.log('✅ Message indexes created');

    // Achievement indexes
    await mongoose.connection.db.collection('achievements').createIndex({ type: 1 });
    await mongoose.connection.db.collection('achievements').createIndex({ category: 1 });
    console.log('✅ Achievement indexes created');

    // UserAchievement indexes
    await mongoose.connection.db.collection('userachievements').createIndex({ userId: 1, achievementId: 1 }, { unique: true });
    await mongoose.connection.db.collection('userachievements').createIndex({ userId: 1, earnedAt: -1 });
    console.log('✅ UserAchievement indexes created\n');

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const User = mongoose.model('User');
    
    const adminExists = await User.findOne({ email: 'admin@eventconnect.com' });
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const adminUser = new User({
        username: 'admin',
        email: 'admin@eventconnect.com',
        password: await bcrypt.hash('Admin123!@#', 12),
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        isVerified: true,
        bio: 'System Administrator',
        location: {
          type: 'Point',
          coordinates: [-69.9312, 18.4861], // Santo Domingo
          address: 'Santo Domingo, Dominican Republic'
        }
      });
      
      await adminUser.save();
      console.log('✅ Default admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create default achievements
    console.log('\n🏆 Creating default achievements...');
    const Achievement = mongoose.model('Achievement');
    
    const defaultAchievements = [
      {
        name: 'First Event',
        description: 'Create your first event',
        type: 'event_creation',
        category: 'events',
        points: 100,
        icon: '🎉',
        requirements: { eventsCreated: 1 }
      },
      {
        name: 'Social Butterfly',
        description: 'Join 5 tribes',
        type: 'tribe_joining',
        category: 'social',
        points: 200,
        icon: '🦋',
        requirements: { tribesJoined: 5 }
      },
      {
        name: 'Event Organizer',
        description: 'Create 10 events',
        type: 'event_creation',
        category: 'events',
        points: 500,
        icon: '📅',
        requirements: { eventsCreated: 10 }
      },
      {
        name: 'Chat Master',
        description: 'Send 100 messages',
        type: 'messaging',
        category: 'communication',
        points: 150,
        icon: '💬',
        requirements: { messagesSent: 100 }
      },
      {
        name: 'Map Explorer',
        description: 'Attend events in 5 different locations',
        type: 'location_exploration',
        category: 'exploration',
        points: 300,
        icon: '🗺️',
        requirements: { uniqueLocations: 5 }
      }
    ];

    for (const achievement of defaultAchievements) {
      const exists = await Achievement.findOne({ name: achievement.name });
      if (!exists) {
        await Achievement.create(achievement);
      }
    }
    console.log('✅ Default achievements created');

    // Create default tribes
    console.log('\n👥 Creating default tribes...');
    const Tribe = mongoose.model('Tribe');
    
    const defaultTribes = [
      {
        name: 'Tech Enthusiasts',
        description: 'A community for technology lovers and innovators',
        category: 'tecnologia',
        isPublic: true,
        tags: ['technology', 'innovation', 'programming'],
        createdBy: adminExists ? adminExists._id : (await User.findOne({ email: 'admin@eventconnect.com' }))._id
      },
      {
        name: 'Music Lovers',
        description: 'Share your passion for music and discover new sounds',
        category: 'musica',
        isPublic: true,
        tags: ['music', 'concerts', 'festivals'],
        createdBy: adminExists ? adminExists._id : (await User.findOne({ email: 'admin@eventconnect.com' }))._id
      },
      {
        name: 'Sports Fans',
        description: 'Connect with fellow sports enthusiasts',
        category: 'deportes',
        isPublic: true,
        tags: ['sports', 'fitness', 'competition'],
        createdBy: adminExists ? adminExists._id : (await User.findOne({ email: 'admin@eventconnect.com' }))._id
      }
    ];

    for (const tribe of defaultTribes) {
      const exists = await Tribe.findOne({ name: tribe.name });
      if (!exists) {
        await Tribe.create(tribe);
      }
    }
    console.log('✅ Default tribes created');

    console.log('\n🎉 Production database setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Database indexes created');
    console.log('✅ Default admin user created');
    console.log('✅ Default achievements created');
    console.log('✅ Default tribes created');
    console.log('\n🔐 Admin credentials:');
    console.log('Email: admin@eventconnect.com');
    console.log('Password: Admin123!@#');
    console.log('\n⚠️  Remember to change the admin password after first login!');

  } catch (error) {
    console.error('❌ Error setting up production database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
}

// Run the setup
if (require.main === module) {
  setupProductionDatabase();
}

module.exports = setupProductionDatabase;
















