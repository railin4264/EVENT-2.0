const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
require('dotenv').config();

// Sample event data with corrected categories
const sampleEvents = [
  {
    title: "Tech Summit 2024 - Innovación y Futuro",
    description: "La conferencia tecnológica más importante del año. Reúne a expertos en IA, blockchain, cloud computing y más. Networking, workshops y presentaciones de vanguardia.",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // +8 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Centro de Convenciones CDMX",
      venue: "Sala Principal"
    },
    category: "tecnología",
    maxAttendees: 500,
    attendees: [],
    createdBy: null, // Will be set after user creation
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1582192730841-2a682d7375f9?w=800&h=600&fit=crop",
        publicId: "tech_summit_2024"
      }
    ],
    tags: ["tecnología", "IA", "innovación", "networking", "workshops"],
    price: {
      amount: 1500,
      currency: "MXN"
    },
    attendeesCount: 0
  },
  {
    title: "Concierto de Jazz Nocturno",
    description: "Una noche mágica de jazz con los mejores músicos de la ciudad. Ambiente íntimo, bebidas especiales y música en vivo.",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // +4 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Teatro Principal",
      venue: "Sala de Conciertos"
    },
    category: "música",
    maxAttendees: 200,
    attendees: [],
    createdBy: null,
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1656283384093-1e227e621fad?w=800&h=600&fit=crop",
        publicId: "jazz_nocturno"
      }
    ],
    tags: ["jazz", "música en vivo", "noche", "teatro", "bebidas"],
    price: {
      amount: 800,
      currency: "MXN"
    },
    attendeesCount: 0
  },
  {
    title: "Exposición de Arte Moderno - Nuevas Visiones",
    description: "Explora las tendencias más innovadoras del arte contemporáneo. Obras de artistas emergentes y establecidos. Charlas con curadores.",
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // +6 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Galería Nacional de Arte",
      venue: "Sala Principal"
    },
    category: "arte",
    maxAttendees: 150,
    attendees: [],
    createdBy: null,
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1681397216288-123a8f521e8f?w=800&h=600&fit=crop",
        publicId: "arte_moderno"
      }
    ],
    tags: ["arte", "exposición", "contemporáneo", "curadores", "cultura"],
    price: {
      amount: 300,
      currency: "MXN"
    },
    attendeesCount: 0
  },
  {
    title: "Festival Gastronómico Internacional",
    description: "Sabores del mundo en un solo lugar. Chefs internacionales, degustaciones, talleres culinarios y competencias gastronómicas.",
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // +12 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Plaza Central",
      venue: "Área Gastronómica"
    },
    category: "gastronomía",
    maxAttendees: 800,
    attendees: [],
    createdBy: null,
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1678646142794-253fdd20fa05?w=800&h=600&fit=crop",
        publicId: "festival_gastronomico"
      }
    ],
    tags: ["gastronomía", "chefs", "degustaciones", "talleres", "internacional"],
    price: {
      amount: 1200,
      currency: "MXN"
    },
    attendeesCount: 0
  },
  {
    title: "Maratón Urbano CDMX 2024",
    description: "Recorre las calles más emblemáticas de la ciudad. 5K, 10K y 21K. Medallas, premios y celebración post-carrera.",
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // +6 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Zócalo de la Ciudad",
      venue: "Línea de Salida"
    },
    category: "deportes",
    maxAttendees: 2000,
    attendees: [],
    createdBy: null,
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
        publicId: "maraton_cdmx"
      }
    ],
    tags: ["maratón", "carrera", "deportes", "salud", "ciudad"],
    price: {
      amount: 600,
      currency: "MXN"
    },
    attendeesCount: 0
  },
  {
    title: "Workshop de Emprendimiento Digital",
    description: "Aprende a crear y escalar tu negocio digital. Mentores expertos, networking con emprendedores y recursos prácticos.",
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // +8 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Centro de Innovación Digital",
      venue: "Sala de Conferencias"
    },
    category: "negocios",
    maxAttendees: 100,
    attendees: [],
    createdBy: null,
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
        publicId: "workshop_emprendimiento"
      }
    ],
    tags: ["emprendimiento", "digital", "negocios", "mentores", "networking"],
    price: {
      amount: 900,
      currency: "MXN"
    },
    attendeesCount: 0
  },
  {
    title: "Clase de Yoga al Aire Libre",
    description: "Conecta con tu ser interior en medio de la naturaleza. Clase de yoga para todos los niveles. Incluye meditación y respiración.",
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Parque Chapultepec",
      venue: "Área Verde Central"
    },
    category: "otro",
    maxAttendees: 50,
    attendees: [],
    createdBy: null,
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
        publicId: "yoga_aire_libre"
      }
    ],
    tags: ["yoga", "bienestar", "meditación", "aire libre", "salud"],
    price: {
      amount: 200,
      currency: "MXN"
    },
    attendeesCount: 0
  },
  {
    title: "Meetup de Desarrolladores Web",
    description: "Comparte conocimientos, proyectos y experiencias con otros desarrolladores. Charlas técnicas, networking y colaboraciones.",
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // +4 hours
    location: {
      type: "Point",
      coordinates: [-99.1332, 19.4326], // CDMX
      address: "Coworking Space Tech",
      venue: "Sala de Eventos"
    },
    category: "tecnología",
    maxAttendees: 80,
    attendees: [],
    createdBy: null,
    status: "published",
    isPrivate: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop",
        publicId: "meetup_desarrolladores"
      }
    ],
    tags: ["desarrollo", "web", "programación", "networking", "tecnología"],
    price: {
      amount: 0,
      currency: "MXN"
    },
    attendeesCount: 0
  }
];

async function seedEvents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    console.log('✅ Connected to MongoDB');

    // Get a user to assign as creator (or create one if none exists)
    let user = await User.findOne();
    if (!user) {
      console.log('⚠️ No users found. Creating a test user...');
      user = await User.create({
        username: 'testuser',
        email: 'test@eventconnect.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });
      console.log('✅ Test user created');
    }

    // Clear existing events
    await Event.deleteMany({});
    console.log('✅ Cleared existing events');

    // Create events with the user as creator
    const eventsWithCreator = sampleEvents.map(event => ({
      ...event,
      createdBy: user._id
    }));

    const createdEvents = await Event.insertMany(eventsWithCreator);
    console.log(`✅ Created ${createdEvents.length} events`);

    // Log created events
    createdEvents.forEach(event => {
      console.log(`📅 ${event.title} - ${event.category} - ${event.date.toLocaleDateString()}`);
    });

    console.log('\n🎉 Events seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding events:', error);
    process.exit(1);
  }
}

// Run the seeding
seedEvents();
