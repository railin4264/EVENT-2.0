#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const colors = require('colors');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect_v2';

async function setupMongoDB() {
  console.log('\n🗃️ SETTING UP MONGODB'.bold.cyan);
  console.log('='.repeat(50).gray);

  try {
    console.log(`🔌 Connecting to: ${MONGODB_URI}`.yellow);
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    
    console.log('✅ MongoDB Connected Successfully!'.green);
    
    // Create indexes for better performance
    const collections = [
      {
        name: 'users',
        indexes: [
          { email: 1 },
          { username: 1 },
          { 'profile.location': '2dsphere' }
        ]
      },
      {
        name: 'events',
        indexes: [
          { title: 'text', description: 'text' },
          { location: '2dsphere' },
          { startDate: 1 },
          { category: 1 },
          { 'host.id': 1 }
        ]
      },
      {
        name: 'tribes',
        indexes: [
          { name: 'text', description: 'text' },
          { category: 1 },
          { 'members.userId': 1 }
        ]
      },
      {
        name: 'posts',
        indexes: [
          { authorId: 1 },
          { createdAt: -1 },
          { 'tribe.id': 1 }
        ]
      },
      {
        name: 'notifications',
        indexes: [
          { userId: 1 },
          { createdAt: -1 },
          { read: 1 }
        ]
      }
    ];

    console.log('\n📋 Creating indexes...'.yellow);
    
    for (const collection of collections) {
      try {
        const coll = db.collection(collection.name);
        
        for (const index of collection.indexes) {
          await coll.createIndex(index);
          console.log(`  ✅ Created index for ${collection.name}: ${Object.keys(index).join(', ')}`.green);
        }
      } catch (error) {
        if (error.code === 85) {
          console.log(`  ⚠️  Index already exists for ${collection.name}`.yellow);
        } else {
          console.log(`  ❌ Error creating index for ${collection.name}: ${error.message}`.red);
        }
      }
    }

    // Insert sample data if collections are empty
    console.log('\n🌱 Checking for sample data...'.yellow);
    
    const userCount = await db.collection('users').countDocuments();
    const eventCount = await db.collection('events').countDocuments();
    const tribeCount = await db.collection('tribes').countDocuments();

    if (userCount === 0 && eventCount === 0 && tribeCount === 0) {
      console.log('📦 Inserting sample data...'.yellow);
      await insertSampleData(db);
    } else {
      console.log(`📊 Database has data: ${userCount} users, ${eventCount} events, ${tribeCount} tribes`.green);
    }

    await client.close();
    console.log('\n🎉 MongoDB setup completed successfully!'.bold.green);
    
  } catch (error) {
    console.log(`❌ MongoDB setup failed: ${error.message}`.red);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTION:'.bold.yellow);
      console.log('1. Install MongoDB: https://www.mongodb.com/try/download/community');
      console.log('2. Start MongoDB service:');
      console.log('   Windows: net start MongoDB');
      console.log('   macOS: brew services start mongodb-community');
      console.log('   Linux: sudo systemctl start mongod');
      console.log('\n🌐 OR use MongoDB Atlas (cloud):');
      console.log('1. Create account: https://cloud.mongodb.com');
      console.log('2. Create cluster and get connection string');
      console.log('3. Update MONGODB_URI in .env file');
    }
    
    process.exit(1);
  }
}

async function insertSampleData(db) {
  const sampleUsers = [
    {
      username: 'demo_user',
      email: 'demo@eventconnect.com',
      password: '$2b$12$sample.hash.for.demo.purposes',
      profile: {
        firstName: 'Demo',
        lastName: 'User',
        bio: 'Demo user for testing EventConnect',
        avatar: 'https://via.placeholder.com/150',
        location: { type: 'Point', coordinates: [-74.006, 40.7128] }, // NYC
        interests: ['technology', 'networking', 'startups']
      },
      gamification: {
        level: 5,
        experience: 1250,
        badges: ['early_adopter', 'event_creator'],
        achievements: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const sampleEvents = [
    {
      title: 'Tech Networking Meetup',
      description: 'Connect with fellow tech enthusiasts in the city!',
      category: 'technology',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
      location: {
        type: 'Point',
        coordinates: [-74.006, 40.7128],
        address: 'Tech Hub, New York, NY'
      },
      host: { id: 'demo_user_id', name: 'Demo User' },
      attendees: [],
      maxAttendees: 50,
      price: 0,
      isPublic: true,
      tags: ['networking', 'tech', 'meetup'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const sampleTribes = [
    {
      name: 'Tech Innovators',
      description: 'A community for technology enthusiasts and innovators',
      category: 'technology',
      isPublic: true,
      image: 'https://via.placeholder.com/300x200',
      creator: { id: 'demo_user_id', name: 'Demo User' },
      members: [{ userId: 'demo_user_id', role: 'admin', joinedAt: new Date() }],
      memberCount: 1,
      settings: {
        allowPosts: true,
        allowEvents: true,
        requireApproval: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.collection('users').insertMany(sampleUsers);
  await db.collection('events').insertMany(sampleEvents);
  await db.collection('tribes').insertMany(sampleTribes);
  
  console.log('  ✅ Sample data inserted successfully!'.green);
}

// Run setup
setupMongoDB().catch(console.error);
