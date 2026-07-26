const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const User = require('../src/models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');

const sampleEvents = [
  {
    title: 'Conferencia de Tecnología 2024',
    description: 'La mayor conferencia de tecnología del año con speakers internacionales',
    category: 'tecnología',
    date: new Date('2024-12-15T10:00:00Z'),
    location: {
      type: 'Point',
      coordinates: [-99.1332, 19.4326], // Ciudad de México
      address: 'Centro de Convenciones, Ciudad de México',
      venue: 'Centro de Convenciones'
    },
    maxAttendees: 500,
    status: 'published',
    tags: ['tecnología', 'innovación', 'networking'],
    price: { amount: 150, currency: 'MXN' }
  },
  {
    title: 'Festival de Música Electrónica',
    description: 'El mejor festival de música electrónica con DJs internacionales',
    category: 'música',
    date: new Date('2024-12-20T18:00:00Z'),
    location: {
      type: 'Point',
      coordinates: [-99.1500, 19.4000], // Cerca de Ciudad de México
      address: 'Foro Sol, Ciudad de México',
      venue: 'Foro Sol'
    },
    maxAttendees: 1000,
    status: 'published',
    tags: ['música', 'electrónica', 'festival'],
    price: { amount: 300, currency: 'MXN' }
  },
  {
    title: 'Workshop de Arte Digital',
    description: 'Aprende las últimas técnicas de arte digital con expertos',
    category: 'arte',
    date: new Date('2024-12-18T14:00:00Z'),
    location: {
      type: 'Point',
      coordinates: [-99.1200, 19.4500], // Ciudad de México
      address: 'Centro Cultural, Ciudad de México',
      venue: 'Centro Cultural'
    },
    maxAttendees: 50,
    status: 'published',
    tags: ['arte', 'digital', 'workshop'],
    price: { amount: 200, currency: 'MXN' }
  },
  {
    title: 'Maratón de Programación',
    description: 'Competencia de programación de 24 horas con premios increíbles',
    category: 'tecnología',
    date: new Date('2024-12-22T09:00:00Z'),
    location: {
      type: 'Point',
      coordinates: [-99.1400, 19.4200], // Ciudad de México
      address: 'Universidad Tecnológica, Ciudad de México',
      venue: 'Universidad Tecnológica'
    },
    maxAttendees: 100,
    status: 'published',
    tags: ['programación', 'competencia', 'hackathon'],
    price: { amount: 50, currency: 'MXN' }
  },
  {
    title: 'Degustación de Vinos',
    description: 'Degustación de vinos premium con sommelier experto',
    category: 'gastronomía',
    date: new Date('2024-12-25T19:00:00Z'),
    location: {
      type: 'Point',
      coordinates: [-99.1600, 19.4100], // Ciudad de México
      address: 'Bodega Premium, Ciudad de México',
      venue: 'Bodega Premium'
    },
    maxAttendees: 30,
    status: 'published',
    tags: ['vino', 'degustación', 'gastronomía'],
    price: { amount: 400, currency: 'MXN' }
  }
];

async function seedEvents() {
  try {
    console.log('🌱 Seeding events...');
    
    // Find a user to be the creator
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }
    
    // Clear existing events
    await Event.deleteMany({});
    console.log('🗑️ Cleared existing events');
    
    // Create sample events
    for (const eventData of sampleEvents) {
      const event = new Event({
        ...eventData,
        createdBy: user._id,
        attendees: []
      });
      
      await event.save();
      console.log(`✅ Created event: ${event.title}`);
    }
    
    console.log('🎉 Events seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding events:', error);
    process.exit(1);
  }
}

seedEvents();
























