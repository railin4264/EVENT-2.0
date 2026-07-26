const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Tribe = require('../src/models/Tribe');

// Sample data
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@eventconnect.com',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'EventConnect',
    role: 'admin',
    verified: true,
    bio: 'EventConnect Platform Administrator',
    interests: ['technology', 'management', 'community'],
    birthDate: new Date('1990-01-01'),
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326],
      address: 'Ciudad de México, México'
    }
  },
  {
    username: 'organizer1',
    email: 'organizer@eventconnect.com',
    password: 'OrganizerPass123!',
    firstName: 'María',
    lastName: 'González',
    verified: true,
    bio: 'Organizadora de eventos tecnológicos y meetups',
    interests: ['technology', 'networking', 'startups'],
    birthDate: new Date('1992-05-15'),
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326],
      address: 'Ciudad de México, México'
    }
  },
  {
    username: 'socialuser',
    email: 'social@eventconnect.com',
    password: 'SocialPass123!',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    bio: 'Entusiasta de eventos sociales y deportivos',
    interests: ['sports', 'music', 'social'],
    birthDate: new Date('1995-08-20'),
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326],
      address: 'Ciudad de México, México'
    }
  }
];

const sampleEvents = [
  {
    title: 'Tech Summit 2024 - Innovación y Futuro',
    description: 'La conferencia tecnológica más importante del año. Reúne a expertos en IA, blockchain, cloud computing y más.',
    category: 'tecnología',
    date: new Date('2025-09-19T10:00:00.000Z'),
    endDate: new Date('2025-09-19T18:00:00.000Z'),
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326],
      address: 'Centro de Convenciones CDMX',
      venue: 'Sala Principal'
    },
    maxAttendees: 500,
    price: { amount: 1500, currency: 'MXN' },
    tags: ['tecnología', 'IA', 'innovación', 'networking', 'workshops'],
    images: [{
      url: 'https://images.unsplash.com/photo-1582192730841-2a682d7375f9?w=800&h=600&fit=crop',
      publicId: 'tech_summit_2024'
    }]
  },
  {
    title: 'Concierto de Jazz Nocturno',
    description: 'Una noche mágica de jazz con los mejores músicos de la ciudad.',
    category: 'música',
    date: new Date('2025-09-15T20:00:00.000Z'),
    endDate: new Date('2025-09-16T00:00:00.000Z'),
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326],
      address: 'Teatro Principal',
      venue: 'Sala de Conciertos'
    },
    maxAttendees: 200,
    price: { amount: 800, currency: 'MXN' },
    tags: ['jazz', 'musica-en-vivo', 'noche', 'teatro'],
    images: [{
      url: 'https://images.unsplash.com/photo-1656283384093-1e227e621fad?w=800&h=600&fit=crop',
      publicId: 'jazz_nocturno'
    }]
  }
];

const sampleTribes = [
  {
    name: 'Desarrolladores CDMX',
    description: 'Comunidad de desarrolladores de software en la Ciudad de México',
    category: 'technology',
    tags: ['desarrollo', 'programming', 'web', 'mobile'],
    isPrivate: false,
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326],
      address: 'Ciudad de México, México'
    }
  },
  {
    name: 'Amantes del Jazz',
    description: 'Para los verdaderos fanáticos del jazz y la música en vivo',
    category: 'music',
    tags: ['jazz', 'música', 'conciertos'],
    isPrivate: false,
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326],
      address: 'Ciudad de México, México'
    }
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    await Tribe.deleteMany({});
    console.log('✅ Cleared existing data');

    // Seed Users
    const users = [];
    for (const userData of sampleUsers) {
      // Don't manually hash password - let the User model pre-save middleware handle it
      const user = new User(userData);
      await user.save();
      users.push(user);
    }
    console.log(`✅ Seeded ${users.length} users`);

    // Seed Events
    const events = [];
    for (let i = 0; i < sampleEvents.length; i++) {
      const eventData = sampleEvents[i];
      eventData.createdBy = users[i % users.length]._id;
      const event = new Event(eventData);
      await event.save();
      events.push(event);
    }
    console.log(`✅ Seeded ${events.length} events`);

    // Seed Tribes
    const tribes = [];
    for (let i = 0; i < sampleTribes.length; i++) {
      const tribeData = sampleTribes[i];
      const creator = users[i % users.length];
      tribeData.creator = creator._id;
      tribeData.members = [{
        user: creator._id,
        role: 'admin',
        joinedAt: new Date(),
        status: 'active'
      }];
      const tribe = new Tribe(tribeData);
      await tribe.save();
      tribes.push(tribe);
    }
    console.log(`✅ Seeded ${tribes.length} tribes`);

    // Create some relationships
    // Add users to events (simulate joining events)
    if (users.length > 1 && events.length > 0) {
      // User 1 joins Event 1
      events[0].attendees = [users[1]._id];
      await events[0].save();

      // User 2 joins Event 2
      if (events.length > 1) {
        events[1].attendees = [users[2]._id, users[0]._id];
        await events[1].save();
      }

      console.log('✅ Created sample event relationships');
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Sample accounts created:');
    console.log('Admin: admin@eventconnect.com / AdminPass123!');
    console.log('Organizer: organizer@eventconnect.com / OrganizerPass123!');
    console.log('User: social@eventconnect.com / SocialPass123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };