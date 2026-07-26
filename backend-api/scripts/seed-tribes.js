const mongoose = require('mongoose');
const Tribe = require('../src/models/Tribe');
const User = require('../src/models/User');
require('dotenv').config();

// Sample tribe data with corrected structure
const sampleTribes = [
  {
    name: "Tech Enthusiasts CDMX",
    description: "Comunidad de apasionados por la tecnología. Compartimos conocimientos, proyectos y oportunidades en el mundo tech.",
    category: "technology",
    creator: null, // Will be set after user creation
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop",
      alt: "Tech Enthusiasts"
    },
    tags: ["tecnología", "programación", "IA", "startups", "networking"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  },
  {
    name: "Arte y Cultura Contemporánea",
    description: "Exploramos las tendencias más innovadoras del arte moderno. Visitas a galerías, charlas con artistas y exposiciones.",
    category: "art",
    creator: null,
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop",
      alt: "Arte y Cultura"
    },
    tags: ["arte", "cultura", "exposiciones", "galerías", "contemporáneo"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  },
  {
    name: "Foodies México",
    description: "Amantes de la gastronomía. Descubrimos nuevos restaurantes, compartimos recetas y organizamos eventos culinarios.",
    category: "food",
    creator: null,
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop",
      alt: "Foodies México"
    },
    tags: ["gastronomía", "restaurantes", "recetas", "chefs", "cultura culinaria"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  },
  {
    name: "Emprendedores Digitales",
    description: "Comunidad de emprendedores que construyen el futuro digital. Mentoring, networking y colaboraciones.",
    category: "business",
    creator: null,
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop",
      alt: "Emprendedores Digitales"
    },
    tags: ["emprendimiento", "startups", "digital", "negocios", "innovación"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  },
  {
    name: "Música en Vivo",
    description: "Apasionados por la música en vivo. Conciertos, jam sessions y descubrimiento de nuevos talentos musicales.",
    category: "music",
    creator: null,
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      alt: "Música en Vivo"
    },
    tags: ["música", "conciertos", "en vivo", "jam sessions", "talentos"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  },
  {
    name: "Salud y Bienestar",
    description: "Comunidad enfocada en el bienestar integral. Yoga, meditación, nutrición y hábitos saludables.",
    category: "health",
    creator: null,
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
      alt: "Salud y Bienestar"
    },
    tags: ["salud", "bienestar", "yoga", "meditación", "nutrición"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  },
  {
    name: "Deportes Urbanos",
    description: "Amantes de los deportes urbanos. Running, ciclismo, skateboarding y actividades al aire libre.",
    category: "sports",
    creator: null,
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
      alt: "Deportes Urbanos"
    },
    tags: ["deportes", "urbanos", "running", "ciclismo", "aire libre"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  },
  {
    name: "Desarrolladores Web México",
    description: "Compartimos conocimientos, proyectos y experiencias con otros desarrolladores. Charlas técnicas, networking y colaboraciones.",
    category: "technology",
    creator: null,
    members: [],
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Ciudad de México",
      isVirtual: false
    },
    avatar: {
      url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=400&fit=crop",
      alt: "Desarrolladores Web"
    },
    tags: ["desarrollo", "web", "programación", "frontend", "backend"],
    settings: {
      privacy: "public",
      membership: "open"
    },
    stats: {
      totalMembers: 0,
      totalEvents: 0,
      averageRating: 0
    },
    isActive: true
  }
];

async function seedTribes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    console.log('✅ Connected to MongoDB');

    // Get users to assign as creator and members
    let users = await User.find().limit(5);
    if (users.length === 0) {
      console.log('⚠️ No users found. Creating test users...');
      users = await User.insertMany([
        {
          username: 'admin1',
          email: 'admin1@eventconnect.com',
          password: 'password123',
          firstName: 'Admin',
          lastName: 'One'
        },
        {
          username: 'user1',
          email: 'user1@eventconnect.com',
          password: 'password123',
          firstName: 'User',
          lastName: 'One'
        },
        {
          username: 'user2',
          email: 'user2@eventconnect.com',
          password: 'password123',
          firstName: 'User',
          lastName: 'Two'
        }
      ]);
      console.log('✅ Test users created');
    }

    // Clear existing tribes
    await Tribe.deleteMany({});
    console.log('✅ Cleared existing tribes');

    // Create tribes with users as creator and members
    const tribesWithUsers = sampleTribes.map((tribe, index) => {
      const creatorUser = users[index % users.length];
      const memberUsers = users.slice(0, Math.min(3, users.length));
      
      return {
        ...tribe,
        creator: creatorUser._id,
        members: memberUsers.map(user => ({
          user: user._id,
          role: user._id.equals(creatorUser._id) ? 'admin' : 'member',
          joinedAt: new Date(),
          status: 'active'
        }))
      };
    });

    const createdTribes = await Tribe.insertMany(tribesWithUsers);
    console.log(`✅ Created ${createdTribes.length} tribes`);

    // Log created tribes
    createdTribes.forEach(tribe => {
      console.log(`🏘️ ${tribe.name} - ${tribe.category} - ${tribe.members.length} miembros`);
    });

    console.log('\n🎉 Tribes seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding tribes:', error);
    process.exit(1);
  }
}

// Run the seeding
seedTribes();
