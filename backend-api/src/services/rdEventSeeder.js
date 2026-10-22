/**
 * Dominican Republic Innovative Events & Verified Organizers Auto-Seeder
 * ----------------------------------------------------------------------
 * Solves the cold-start problem automatically: ensures the platform is
 * never empty by seeding verified Dominican community creators and
 * innovative upcoming cultural activities across Santo Domingo, Santiago,
 * Jarabacoa, and Punta Cana.
 */

const User = require('../models/User');
const Event = require('../models/Event');
const logger = require('../utils/logger');

// Verified organizer profiles in Dominican Republic
const SEED_ORGANIZERS = [
  {
    username: 'acusticard',
    email: 'acustica@eventnow.do',
    firstName: 'Acústica',
    lastName: 'Dominicana',
    role: 'organizer',
    isOrganizerVerified: true,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    bio: 'Colectivo independiente de músicos de cámara, violín y cuerdas al aire libre en plazas y parques de Santo Domingo.',
    organizerVerification: {
      status: 'verified',
      organizationName: 'Acústica Dominicana SRL',
      documentType: 'rnc',
      documentNumber: '131-89452-1',
      phoneNumber: '+1 (809) 555-0142',
      socialProofUrl: 'https://instagram.com/acusticard',
      reviewedAt: new Date()
    }
  },
  {
    username: 'arte_parque',
    email: 'arte@eventnow.do',
    firstName: 'Arte al Parque',
    lastName: 'RD',
    role: 'organizer',
    isOrganizerVerified: true,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1460661419200-1845a1df98c1?w=400&q=80',
    bio: 'Comunidad artística que lleva lienzos, pinceles y caballetes a los parques de RD. Pintar en el parque, conectar y relajarse.',
    organizerVerification: {
      status: 'verified',
      organizationName: 'Arte & Vida Colectivo',
      documentType: 'cedula',
      documentNumber: '402-2345678-9',
      phoneNumber: '+1 (829) 555-0188',
      socialProofUrl: 'https://instagram.com/artealparquerd',
      reviewedAt: new Date()
    }
  },
  {
    username: 'astronomia_rd',
    email: 'astronomia@eventnow.do',
    firstName: 'Sociedad',
    lastName: 'Astronómica',
    role: 'organizer',
    isOrganizerVerified: true,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&q=80',
    bio: 'Divulgación científica y noches de observación con telescopios profesionales en Santo Domingo y Jarabacoa.',
    organizerVerification: {
      status: 'verified',
      organizationName: 'AstroRD Club',
      documentType: 'rnc',
      documentNumber: '132-77412-3',
      phoneNumber: '+1 (809) 555-0199',
      socialProofUrl: 'https://instagram.com/astrodominicana',
      reviewedAt: new Date()
    }
  },
  {
    username: 'tech_cibao',
    email: 'techcibao@eventnow.do',
    firstName: 'Comunidad Tech',
    lastName: 'Cibao',
    role: 'organizer',
    isOrganizerVerified: true,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=80',
    bio: 'Hackathons, open source meetups y talleres de código e IA para desarrolladores y entusiastas de la tecnología.',
    organizerVerification: {
      status: 'verified',
      organizationName: 'Tech Cibao Hub',
      documentType: 'rnc',
      documentNumber: '101-99882-5',
      phoneNumber: '+1 (849) 555-0122',
      socialProofUrl: 'https://github.com/techcibaord',
      reviewedAt: new Date()
    }
  },
  {
    username: 'fe_esperanza_rd',
    email: 'fe@eventnow.do',
    firstName: 'Comunidad de Fe',
    lastName: '& Esperanza RD',
    role: 'organizer',
    isOrganizerVerified: true,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=400&q=80',
    bio: 'Comunidad ecuménica y de fe que organiza retiros, vigilias de oración, misas al aire libre y encuentros de meditación y reflexión espiritual.',
    organizerVerification: {
      status: 'verified',
      organizationName: 'Comunidad de Fe y Esperanza RD',
      documentType: 'rnc',
      documentNumber: '130-44589-2',
      phoneNumber: '+1 (809) 555-0155',
      socialProofUrl: 'https://instagram.com/fe_esperanza_rd',
      reviewedAt: new Date()
    }
  },
  {
    username: 'foro_civico_rd',
    email: 'civismo@eventnow.do',
    firstName: 'Foro Ciudadano',
    lastName: '& Civismo RD',
    role: 'organizer',
    isOrganizerVerified: true,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=400&q=80',
    bio: 'Plataforma cívica ciudadana e independiente dedicada a foros de debate, participación ciudadana, asambleas vecinales y educación cívica en República Dominicana.',
    organizerVerification: {
      status: 'verified',
      organizationName: 'Foro Ciudadano por la Democracia RD',
      documentType: 'rnc',
      documentNumber: '101-77890-4',
      phoneNumber: '+1 (829) 555-0190',
      socialProofUrl: 'https://twitter.com/forocivicord',
      reviewedAt: new Date()
    }
  }
];

// Helper to calculate future date relative to now
const daysFromNow = (days, hour = 18, minute = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// Innovative Dominican Republic events definition
const getEventsData = (organizerMap) => [
  {
    title: 'Violín Acústico al Atardecer en el Parque',
    description: 'Una experiencia musical al aire libre. Músicos dominicanos interpretarán piezas clásicas, bandas sonoras y adaptaciones en violín mientras cae el sol. Trae tu manta, café o merienda para compartir en un ambiente sereno.',
    category: 'music',
    activityType: 'Violín en el Parque',
    organizerKey: 'acusticard',
    date: daysFromNow(2, 17, 30),
    location: {
      type: 'Point',
      coordinates: [-69.9192, 18.4721], // Parque Iberoamérica, Santo Domingo
      address: 'Parque Iberoamérica, Calle César Nicolás Penson',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Parque Iberoamérica (Área del Anfiteatro)'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['violin', 'musica', 'parque', 'santo domingo', 'aire libre', 'acustico'],
    images: [{ url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80', isCover: true }],
    maxAttendees: 150,
    status: 'published',
    isFeatured: true
  },
  {
    title: 'Pintar en el Parque: Atardecer con Pincel y Lienzo',
    description: '¿Alguna vez quisiste pintar al aire libre sin presiones? Incluye caballete, lienzo, acrílicos y guía básica por artistas locales. No se requiere experiencia previa. Ven a descubrir tu lado creativo frente al mar Caribe.',
    category: 'art',
    activityType: 'Pintar en el Parque',
    organizerKey: 'arte_parque',
    date: daysFromNow(3, 16, 0),
    location: {
      type: 'Point',
      coordinates: [-69.9458, 18.4412], // Parque Mirador Sur
      address: 'Parque Mirador Sur, Av. Anacaona',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Mirador Sur (Km 5)'
    },
    price: { amount: 650, currency: 'DOP' },
    paymentMode: 'door',
    paymentInfo: 'Pago de materiales directamente en el punto de encuentro.',
    tags: ['pintura', 'arte', 'mirador sur', 'taller', 'aire libre'],
    images: [{ url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80', isCover: true }],
    maxAttendees: 40,
    status: 'published',
    isFeatured: true
  },
  {
    title: 'Noche de Astronomía: Cráteres Lunares y Planetas',
    description: 'Observación astronómica abierta al público con telescopios computarizados. Aprenderemos a identificar constelaciones visibles desde el Caribe y observaremos los anillos de Saturno y detalles lunares en pantalla ampliada.',
    category: 'culture',
    activityType: 'Astronomía y Telescopios',
    organizerKey: 'astronomia_rd',
    date: daysFromNow(5, 19, 0),
    location: {
      type: 'Point',
      coordinates: [-69.9602, 18.4908], // Jardín Botánico
      address: 'Jardín Botánico Nacional Dr. Rafael M. Moscoso',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Plaza Central del Jardín Botánico'
    },
    price: { amount: 200, currency: 'DOP' },
    paymentMode: 'door',
    paymentInfo: 'RD$200 en taquilla de entrada para apoyo de mantenimiento.',
    tags: ['astronomia', 'ciencia', 'telescopio', 'botanico', 'familia'],
    images: [{ url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', isCover: true }],
    maxAttendees: 200,
    status: 'published'
  },
  {
    title: 'Piano & Jam Acústico Comunitario',
    description: 'Un piano vertical en el patio y micrófonos abiertos para quien quiera compartir una melodía, cantar o simplemente disfrutar de buena música entre amigos. Ambiente bohemio e íntimo en el corazón colonial.',
    category: 'music',
    activityType: 'Jam Session & Piano',
    organizerKey: 'acusticard',
    date: daysFromNow(6, 20, 0),
    location: {
      type: 'Point',
      coordinates: [-69.8856, 18.4735], // Zona Colonial
      address: 'Calle Arzobispo Meriño, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Patio Colonial Casa de Teatro'
    },
    price: { amount: 350, currency: 'DOP' },
    paymentMode: 'door',
    tags: ['piano', 'musica en vivo', 'zona colonial', 'jam', 'acustico'],
    images: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80', isCover: true }],
    maxAttendees: 80,
    status: 'published',
    isFeatured: true
  },
  {
    title: 'Tech Meetup Cibao: Desarrollo Web, IA y Networking',
    description: 'Encuentro mensual de la comunidad tech de Santiago y el Cibao. Charlas de 20 minutos sobre agentes de IA, frontend moderno y oportunidades de trabajo remoto. Espacio de networking con pizza y refrescos.',
    category: 'technology',
    activityType: 'Tech Meetup & IA',
    organizerKey: 'tech_cibao',
    date: daysFromNow(7, 18, 30),
    location: {
      type: 'Point',
      coordinates: [-70.6970, 19.4517], // Santiago de los Caballeros
      address: 'Av. 27 de Febrero, Santiago de los Caballeros',
      city: 'Santiago',
      country: 'República Dominicana',
      venue: 'Auditorio Centro de Innovación Cibao'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['tech', 'programacion', 'inteligencia artificial', 'santiago', 'cibao'],
    images: [{ url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80', isCover: true }],
    maxAttendees: 100,
    status: 'published'
  },
  {
    title: 'Secret Rooftop Sunset Session (DJ Set Acústico)',
    description: 'Un encuentro íntimo en una terraza privada con vista de 360 grados de la ciudad de Santo Domingo. House orgánico, vinilos y cócteles de autor. La dirección exacta se enviará por mensaje privado 3 horas antes del inicio.',
    category: 'party',
    activityType: 'Secret Rooftop',
    organizerKey: 'acusticard',
    date: daysFromNow(4, 18, 0),
    isSecretLocation: true,
    isUnofficial: true,
    location: {
      type: 'Point',
      coordinates: [-69.8995, 18.4688],
      address: 'Zona Colonial / Gazcue (Secreta)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Rooftop Secreto'
    },
    price: { amount: 500, currency: 'DOP' },
    paymentMode: 'door',
    paymentInfo: 'Entrada en puerta incluye cóctel de bienvenida.',
    tags: ['rooftop', 'secreto', 'sunset', 'dj', 'extraoficial'],
    images: [{ url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80', isCover: true }],
    maxAttendees: 50,
    status: 'published'
  },
  {
    title: 'Torneo Abierto de Ajedrez Rápido y Juegos de Estrategia',
    description: 'Mesas al aire libre preparadas para partidas rápidas de 10 minutos (Blitz) y juegos de mesa modernos (Catan, Carcassonne). Abierto para todas las edades y niveles.',
    category: 'gaming',
    activityType: 'Ajedrez en la Plaza',
    organizerKey: 'arte_parque',
    date: daysFromNow(8, 15, 0),
    location: {
      type: 'Point',
      coordinates: [-69.8833, 18.4750],
      address: 'Plaza España, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Explanada Plaza España'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['ajedrez', 'juegos de mesa', 'plaza españa', 'familia', 'gratis'],
    images: [{ url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&q=80', isCover: true }],
    maxAttendees: 60,
    status: 'published'
  },
  {
    title: 'Yoga y Baño Sonoro al Amanecer',
    description: 'Comienza tu fin de semana conectando con tu respiración y el sonido de la naturaleza. Sesión de Vinyasa Yoga suave de 60 minutos guiada con cuencos de cuarzo. Trae tu tapete y ropa cómoda.',
    category: 'wellness',
    activityType: 'Yoga & Mindfulness',
    organizerKey: 'arte_parque',
    date: daysFromNow(9, 7, 30),
    location: {
      type: 'Point',
      coordinates: [-69.9400, 18.4450],
      address: 'Parque Mirador Sur (Área de la Salud)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Parque Mirador Sur'
    },
    price: { amount: 300, currency: 'DOP' },
    paymentMode: 'door',
    tags: ['yoga', 'salud', 'bienestar', 'mirador sur', 'meditacion'],
    images: [{ url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80', isCover: true }],
    maxAttendees: 50,
    status: 'published'
  },
  {
    title: 'Vigilia Acústica de Oración & Reflexión bajo las Estrellas',
    description: 'Un encuentro de paz, oración y cánticos acústicos al aire libre. Músicos locales acompañarán momentos de silencio, alabanza y reflexión para renovar la fe en un ambiente de comunión comunitaria y respeto ecuménico. Entrada libre para todas las familias.',
    category: 'religion',
    activityType: 'Vigilia de Oración',
    organizerKey: 'fe_esperanza_rd',
    date: daysFromNow(4, 19, 0),
    location: {
      type: 'Point',
      coordinates: [-69.8851, 18.4739],
      address: 'Ruinas de San Francisco, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Atrio de las Ruinas de San Francisco'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['religion', 'espiritualidad', 'oracion', 'vigilia', 'fe', 'familia', 'santo domingo'],
    images: [{ url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=1200&q=80', isCover: true }],
    maxAttendees: 250,
    status: 'published',
    isFeatured: true
  },
  {
    title: 'Foro Ciudadano: Debate Abierto sobre Movilidad Urbana & Metro de Santo Domingo',
    description: 'Espacio cívico y plural para debatir soluciones a los desafíos del tránsito, transporte colectivo y movilidad sostenible en el Gran Santo Domingo. Contará con paneles de urbanistas, líderes comunitarios y micrófono abierto para propuestas de la ciudadanía.',
    category: 'politics',
    activityType: 'Foro Cívico & Debate',
    organizerKey: 'foro_civico_rd',
    date: daysFromNow(5, 18, 0),
    location: {
      type: 'Point',
      coordinates: [-69.9070, 18.4870],
      address: 'Auditorio Mauricio Báez, Villa Juana',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Auditorio del Club Mauricio Báez'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['politica', 'civismo', 'debate', 'ciudadania', 'transporte', 'santo domingo'],
    images: [{ url: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&q=80', isCover: true }],
    maxAttendees: 180,
    status: 'published'
  },
  {
    title: 'Retiro de Paz Interior & Meditación Bíblica al Atardecer',
    description: 'Tarde de retiro espiritual y discernimiento guiada por líderes pastorales y consejeros familiares. Talleres de gratitud, dinámicas para jóvenes y tiempo para reconectar con el propósito espiritual. Incluye refrigerio comunitario.',
    category: 'religion',
    activityType: 'Retiro Espiritual',
    organizerKey: 'fe_esperanza_rd',
    date: daysFromNow(7, 15, 30),
    location: {
      type: 'Point',
      coordinates: [-69.9602, 18.4908],
      address: 'Jardín Botánico Nacional Dr. Rafael M. Moscoso',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Pabellón de Helechos, Jardín Botánico'
    },
    price: { amount: 250, currency: 'DOP' },
    paymentMode: 'door',
    paymentInfo: 'Aporte de RD$250 en puerta para materiales y refrigerio.',
    tags: ['religion', 'retiro', 'meditacion', 'espiritualidad', 'paz'],
    images: [{ url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200&q=80', isCover: true }],
    maxAttendees: 90,
    status: 'published'
  },
  {
    title: 'Asamblea Vecinal & Cabildo Abierto: Preservación del Patrimonio Colonial',
    description: 'Reunión ciudadana y vecinal para discutir ordenanzas de preservación arquitectónica, seguridad peatonal y convivencia comunitaria en la Ciudad Colonial de Santo Domingo. Abierto a todos los residentes y defensores del patrimonio histórico.',
    category: 'politics',
    activityType: 'Cabildo Abierto & Asamblea',
    organizerKey: 'foro_civico_rd',
    date: daysFromNow(10, 10, 0),
    location: {
      type: 'Point',
      coordinates: [-69.8833, 18.4750],
      address: 'Plaza España, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Explanada Plaza España'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['politica', 'civismo', 'cabildo', 'asamblea', 'zona colonial', 'patrimonio'],
    images: [{ url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80', isCover: true }],
    maxAttendees: 120,
    status: 'published'
  }
];

class RDEventSeeder {
  /**
   * Ensure organizers exist, creating them if necessary
   */
  static async ensureOrganizers() {
    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_DATA !== 'true') return {};
    const map = {};

    // Demo data must never provision or promote an administrator account.
    const adminUser = await User.findOne({ email: 'admin@eventnow.do', role: 'admin' });
    if (adminUser) map.admin_eventnow = adminUser;

    for (const orgData of SEED_ORGANIZERS) {
      let user = await User.findOne({
        $or: [{ username: orgData.username }, { email: orgData.email }]
      });

      if (!user) {
        user = new User({
          ...orgData, isOrganizerVerified: false, verified: false, organizerVerification: { status: 'none' }, bio: '[DEMO] Perfil ficticio para pruebas locales.',
          password: require('crypto').randomBytes(32).toString('hex') + 'Aa1!',
          isActive: true,
          isEmailVerified: false
        });
        await user.save();
        logger.info(`Seeded verified organizer: @${user.username}`);
      }
      map[orgData.username] = user;
    }
    return map;
  }

  /**
   * Seed innovative Dominican Republic events
   */
  static async seedAllRDEvents(force = false) {
    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_DATA !== 'true') return { success: true, skipped: true };
    try {
      const organizerMap = await this.ensureOrganizers();
      const eventsData = getEventsData(organizerMap);
      let insertedCount = 0;
      let updatedCount = 0;

      for (const ev of eventsData) {
        const organizer = organizerMap[ev.organizerKey];
        if (!organizer) continue;

        const existing = await Event.findOne({
          title: ev.title, source: 'demo_catalog',
          status: { $ne: 'cancelled' }
        });

        const sanitizedTags = (ev.tags || []).map(t =>
          t.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
        ).filter(Boolean);

        const mode = ev.paymentMode === 'door' ? 'onsite' : ev.paymentMode;

        if (existing) {
          // If past date or forced, update date to upcoming future
          if (force || new Date(existing.date) < new Date()) {
            existing.date = ev.date;
            existing.createdBy = organizer._id;
            existing.isOrganizerVerified = false;
            existing.status = 'draft';
            existing.tags = [...sanitizedTags, 'demo'];
            existing.paymentMode = mode;
            await existing.save();
            updatedCount++;
          }
        } else {
          const newEvent = new Event({
            ...ev,
            paymentMode: mode,
            tags: [...sanitizedTags, 'demo'], source: 'demo_catalog', status: 'draft',
            createdBy: organizer._id,
            isOrganizerVerified: false
          });
          await newEvent.save();
          insertedCount++;
        }
      }

      logger.info(`RD Event Seeder completed: ${insertedCount} inserted, ${updatedCount} refreshed.`);
      return { success: true, inserted: insertedCount, updated: updatedCount };
    } catch (error) {
      logger.error('RD Event Seeder error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Seed Dominican Tribes, Spontaneous Coros, Social Feed Posts, and Initial Event Innovations
   */
  static async seedEcosystemData(organizerMapInput = null) {
    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_DATA !== 'true') return;
    try {
      const Tribe = require('../models/Tribe');
      const Post = require('../models/Post');
      const SpontaneousCoro = require('../models/SpontaneousCoro');
      const EventSong = require('../models/EventSong');
      const EventAfter = require('../models/EventAfter');
      const EventPlusOne = require('../models/EventPlusOne');

      const organizerMap = organizerMapInput || (await this.ensureOrganizers());
      const orgValues = Object.values(organizerMap);
      if (!orgValues.length) return;

      const adminUser = organizerMap.admin_eventnow || orgValues[0];
      const u1 = organizerMap.acusticard || orgValues[0];
      const u2 = organizerMap.arte_parque || orgValues[1] || orgValues[0];
      const u3 = organizerMap.tech_cibao || orgValues[2] || orgValues[0];
      const u4 = organizerMap.astronomia_rd || orgValues[3] || orgValues[0];
      const u5 = organizerMap.fe_esperanza_rd || orgValues[4] || orgValues[0];

      // 1. Seed Rich Dominican Tribes (Public + Private with rules, posts, coverImage, and joinRequests)
      const tribesSeed = [
        {
          name: 'Coro de Senderismo Pico Duarte & Cibao',
          description: 'Comunidad de montañistas, exploradores de ríos y amantes del ecoturismo en Jarabacoa, Constanza, Valle Nuevo y el Pico Duarte. Compartimos rutas, equipo y transporte.',
          category: 'outdoor',
          creator: u4._id,
          welcomeMessage: '¡Bienvenido al Coro de Senderismo! Presenta tu ruta favorita en RD y prepárate para la próxima subida.',
          location: {
            type: 'Point',
            coordinates: [-70.6384, 19.1202],
            address: 'Jarabacoa & Cibao, República Dominicana',
            city: 'Jarabacoa',
            country: 'DO'
          },
          avatar: {
            url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80',
            alt: 'Senderismo Pico Duarte'
          },
          coverImage: {
            url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
            alt: 'Cordillera Central RD'
          },
          tags: ['senderismo', 'pico-duarte', 'jarabacoa', 'naturaleza', 'camping'],
          rules: [
            { title: 'No dejar rastro (Leave No Trace)', description: 'Toda basura que sube a la montaña baja con nosotros.', isRequired: true },
            { title: 'Compañerismo en la ruta', description: 'Nadie se queda atrás durante las excursiones grupales.', isRequired: true }
          ],
          settings: { privacy: 'public', membership: 'open' },
          posts: [
            {
              author: u4._id,
              content: '¡Familia! Este mes estamos organizando la ruta por Mata Grande hacia el Pico Duarte. ¿Quiénes se apuntan para el entrenamiento previo en el Mirador Sur?',
              images: [],
              likes: [{ user: u1._id }, { user: u2._id }],
              comments: [
                { user: u1._id, content: '¡Me anoto! Tengo casa de campaña para 3 personas disponible.', createdAt: new Date(Date.now() - 3600000 * 5) }
              ],
              createdAt: new Date(Date.now() - 3600000 * 12)
            },
            {
              author: u2._id,
              content: 'Les comparto el listado actualizado de abrigo térmico y botas recomendadas para Valle Nuevo en esta temporada.',
              images: [],
              likes: [{ user: u4._id }],
              comments: [],
              createdAt: new Date(Date.now() - 3600000 * 28)
            }
          ]
        },
        {
          name: 'Developers & AI Santo Domingo',
          description: 'El punto de encuentro para ingenieros de software, fundadores de startups, diseñadores de producto y entusiastas de Inteligencia Artificial en Santo Domingo y toda RD.',
          category: 'technology',
          creator: u3._id,
          welcomeMessage: '¡Hola dev! Comparte en qué proyecto o stack estás trabajando hoy.',
          location: {
            type: 'Point',
            coordinates: [-69.9312, 18.4861],
            address: 'Piantini, Santo Domingo, RD',
            city: 'Santo Domingo',
            country: 'DO'
          },
          avatar: {
            url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=80',
            alt: 'Developers & AI SD'
          },
          coverImage: {
            url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
            alt: 'Hackathon Santo Domingo'
          },
          tags: ['tech', 'ia', 'javascript', 'startups', 'santo-domingo'],
          rules: [
            { title: 'Cero spam comercial', description: 'Comparte ofertas laborales o proyectos reales con valor técnico.', isRequired: true },
            { title: 'Feedback constructivo', description: 'Apoyamos tanto a juniors como a seniors con respeto.', isRequired: true }
          ],
          settings: { privacy: 'public', membership: 'open' },
          posts: [
            {
              author: u3._id,
              content: '¿Quiénes van al próximo meetup de agentes de IA y Next.js? Estaremos haciendo demos en vivo de proyectos locales hechos en RD.',
              images: [],
              likes: [{ user: adminUser._id }, { user: u1._id }],
              comments: [
                { user: adminUser._id, content: '¡Ahí estaremos! Llevaremos stickers y premios para los mejores demos.', createdAt: new Date(Date.now() - 3600000 * 2) }
              ],
              createdAt: new Date(Date.now() - 3600000 * 8)
            }
          ]
        },
        {
          name: 'Amantes del Merengue, Bachata & Son',
          description: 'Tribu cultural dedicada a celebrar nuestras raíces musicales dominicanas: conciertos acústicos, clases de baile, historia del son en las Ruinas de San Francisco y peñas bohemias.',
          category: 'music',
          creator: u1._id,
          welcomeMessage: '¡Que viva nuestra música! Cuéntanos cuál es tu canción favorita de Juan Luis Guerra o Bonyé.',
          location: {
            type: 'Point',
            coordinates: [-69.8851, 18.4739],
            address: 'Ciudad Colonial, Santo Domingo, RD',
            city: 'Santo Domingo',
            country: 'DO'
          },
          avatar: {
            url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
            alt: 'Merengue Bachata y Son'
          },
          coverImage: {
            url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
            alt: 'Noche Colonial Musical'
          },
          tags: ['merengue', 'bachata', 'son', 'zona-colonial', 'baile'],
          rules: [
            { title: 'Respeto en la pista', description: 'Todos los niveles de baile son bienvenidos en nuestros encuentros.', isRequired: true }
          ],
          settings: { privacy: 'public', membership: 'open' },
          posts: [
            {
              author: u1._id,
              content: 'Este domingo nos juntamos a las 5:30 PM frente a las Ruinas de San Francisco para compartir antes de que empiece la música en vivo. ¡Traigan buena vibra!',
              images: [],
              likes: [{ user: u2._id }, { user: u3._id }, { user: u4._id }],
              comments: [],
              createdAt: new Date(Date.now() - 3600000 * 16)
            }
          ]
        },
        {
          name: 'Círculo Gastronómico Secreto RD',
          description: 'Comunidad privada de amantes de la alta cocina caribeña, cenas clandestinas de autor, catas de ron envejecido y cacao orgánico dominicano con cupos estrictamente limitados.',
          category: 'food_drink',
          creator: adminUser._id,
          welcomeMessage: 'Bienvenido al Círculo Gastronómico Secreto. Las ubicaciones de nuestras cenas se confirman solo a miembros aprobados.',
          location: {
            type: 'Point',
            coordinates: [-69.9395, 18.4715],
            address: 'Naco / Piantini, Santo Domingo, RD',
            city: 'Santo Domingo',
            country: 'DO'
          },
          avatar: {
            url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
            alt: 'Círculo Gastronómico Secreto RD'
          },
          coverImage: {
            url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
            alt: 'Cena Clandestina RD'
          },
          tags: ['gastronomia', 'cata', 'chef', 'privado', 'santo-domingo'],
          rules: [
            { title: 'Puntualidad en las reservas', description: 'Los menús de degustación inician a la hora exacta acordada.', isRequired: true },
            { title: 'Confidencialidad de ubicaciones', description: 'No publicar la dirección exacta de los pop-ups antes del evento.', isRequired: true }
          ],
          settings: { privacy: 'private', membership: 'approval_required' },
          joinRequests: [
            {
              user: u5._id,
              message: '¡Hola! Soy amante de la gastronomía dominicana de autor y me encantaría participar en las próximas catas.',
              status: 'pending',
              requestedAt: new Date(Date.now() - 3600000 * 4)
            }
          ],
          posts: [
            {
              author: adminUser._id,
              content: 'El menú secreto de este viernes tendrá 5 tiempos inspirados en Samaná (pescado con coco horneado al cacao de Yamasá y maridaje de ron). Solo quedan 4 sillas.',
              images: [],
              likes: [{ user: u1._id }, { user: u2._id }],
              comments: [
                { user: u2._id, content: '¡Increíble propuesta! Confirmo mi asistencia para el viernes.', createdAt: new Date(Date.now() - 3600000 * 3) }
              ],
              createdAt: new Date(Date.now() - 3600000 * 10)
            }
          ]
        },
        {
          name: 'Club VIP de Fotografía Nocturna & Rooftops',
          description: 'Colectivo privado de fotógrafos urbanos, cineastas y creadores visuales con acceso a azoteas históricas, sesiones de larga exposición y talleres de iluminación en Santo Domingo y Santiago.',
          category: 'photography',
          creator: u2._id,
          welcomeMessage: '¡Lente listo! Comparte tu equipo fotográfico y tu portafolio al entrar.',
          location: {
            type: 'Point',
            coordinates: [-69.8878, 18.4728],
            address: 'Zona Colonial, Santo Domingo, RD',
            city: 'Santo Domingo',
            country: 'DO'
          },
          avatar: {
            url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
            alt: 'Club VIP Fotografía Nocturna'
          },
          coverImage: {
            url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80',
            alt: 'Fotografía Nocturna Rooftops'
          },
          tags: ['fotografia', 'rooftops', 'nocturna', 'arte-visual', 'vip'],
          rules: [
            { title: 'Cuidado de las locaciones', description: 'Respetar las normas de seguridad en cada terraza y edificio patrimonial.', isRequired: true },
            { title: 'Créditos entre miembros', description: 'Etiquetar siempre a los modelos y colegas colaboradores.', isRequired: true }
          ],
          settings: { privacy: 'private', membership: 'approval_required' },
          joinRequests: [
            {
              user: u4._id,
              message: 'Hola, hago astrofotografía y fotografía nocturna con Sony A7IV, me gustaría sumarme a las salidas en rooftops.',
              status: 'pending',
              requestedAt: new Date(Date.now() - 3600000 * 6)
            }
          ],
          posts: [
            {
              author: u2._id,
              content: 'Conseguimos permiso exclusivo para subir al mirador superior frente al Ozama durante la hora azul este sábado. Recuerden traer trípode.',
              images: [],
              likes: [{ user: adminUser._id }, { user: u1._id }],
              comments: [],
              createdAt: new Date(Date.now() - 3600000 * 14)
            }
          ]
        }
      ];

      for (const tData of tribesSeed) {
        const existingTribe = await Tribe.findOne({ name: tData.name });
        if (!existingTribe) {
          const initialMembers = [
            { user: tData.creator, role: 'admin', status: 'active' },
            ...[adminUser, u1, u2, u3]
              .filter(u => u && String(u._id) !== String(tData.creator))
              .slice(0, 2)
              .map(u => ({ user: u._id, role: 'member', status: 'active' }))
          ];

          await Tribe.create({
            ...tData,
            members: initialMembers,
            moderators: [tData.creator]
          });
        } else {
          // Ensure existing seeded tribes have posts, rules, coverImage, and settings
          let modified = false;
          if (!existingTribe.posts || existingTribe.posts.length === 0) {
            existingTribe.posts = tData.posts || [];
            modified = true;
          }
          if (!existingTribe.rules || existingTribe.rules.length === 0) {
            existingTribe.rules = tData.rules || [];
            modified = true;
          }
          if (!existingTribe.coverImage || !existingTribe.coverImage.url) {
            existingTribe.coverImage = tData.coverImage;
            modified = true;
          }
          if (modified) {
            await existingTribe.save();
          }
        }
      }
      logger.info('Seeded Dominican Tribes (Public + Private with joinRequests and posts).');

      // 1b. Seed Social Feed Posts (/feed) if Post collection is empty
      const postCount = await Post.countDocuments({ isDeleted: { $ne: true } });
      if (postCount < 3) {
        const sampleEvents = await Event.find({ status: 'published' }).limit(3);
        const feedPostsSeed = [
          {
            user: u1._id,
            content: '¡Qué noche tan mágica vivimos ayer con los violines bajo las estrellas en el Parque Iberoamérica! Gracias a los más de 80 asistentes que cantaron con nosotros. Este fin de semana repetimos en la Ciudad Colonial. 🎻✨🇩🇴',
            type: 'image',
            visibility: 'public',
            images: [
              {
                url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1000&q=80',
                publicId: 'seed_post_1'
              }
            ],
            tags: ['musica', 'violin', 'santodomingo', 'cultura'],
            location: {
              type: 'Point',
              coordinates: [-69.9192, 18.4721],
              address: 'Parque Iberoamérica, Santo Domingo'
            },
            eventData: sampleEvents[0] ? {
              eventId: sampleEvents[0]._id,
              name: sampleEvents[0].title,
              location: sampleEvents[0].location?.address || 'Santo Domingo',
              date: sampleEvents[0].date ? new Date(sampleEvents[0].date).toISOString() : ''
            } : undefined,
            likes: [{ user: u2._id }, { user: u3._id }, { user: adminUser._id }],
            comments: [
              {
                user: u2._id,
                text: '¡Estuvo espectacular! El arreglo de Juan Luis Guerra en cuerdas fue inolvidable.'
              }
            ]
          },
          {
            user: u2._id,
            content: 'Lista la paleta de colores para nuestra sesión de Pintura & Picnic de este sábado en el Mirador Sur 🎨🌿. No necesitas experiencia previa, nosotros llevamos los caballetes, lienzos y pinceles.',
            type: 'image',
            visibility: 'public',
            images: [
              {
                url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1000&q=80',
                publicId: 'seed_post_2'
              }
            ],
            tags: ['arte', 'miradorsur', 'pintura', 'findesemana'],
            location: {
              type: 'Point',
              coordinates: [-69.9458, 18.4412],
              address: 'Parque Mirador Sur, Santo Domingo'
            },
            eventData: sampleEvents[1] ? {
              eventId: sampleEvents[1]._id,
              name: sampleEvents[1].title,
              location: sampleEvents[1].location?.address || 'Santo Domingo',
              date: sampleEvents[1].date ? new Date(sampleEvents[1].date).toISOString() : ''
            } : undefined,
            likes: [{ user: u1._id }, { user: u4._id }],
            comments: []
          },
          {
            user: u3._id,
            content: 'La comunidad tecnológica del Cibao y Santo Domingo sigue creciendo a otro nivel 🚀💻. En el próximo Tech Meetup veremos cómo construir agentes de IA en producción y conectar con startups locales.',
            type: 'text',
            visibility: 'public',
            tags: ['tech', 'ia', 'cibao', 'santiago', 'developers'],
            location: {
              type: 'Point',
              coordinates: [-70.6970, 19.4517],
              address: 'Av. 27 de Febrero, Santiago'
            },
            eventData: sampleEvents[2] ? {
              eventId: sampleEvents[2]._id,
              name: sampleEvents[2].title,
              location: sampleEvents[2].location?.address || 'Santiago',
              date: sampleEvents[2].date ? new Date(sampleEvents[2].date).toISOString() : ''
            } : undefined,
            likes: [{ user: adminUser._id }, { user: u1._id }, { user: u4._id }],
            comments: [
              {
                user: adminUser._id,
                text: '¡Excelente iniciativa para toda la comunidad de desarrolladores en RD!'
              }
            ]
          },
          {
            user: u4._id,
            content: 'Anoche logramos capturar los anillos de Saturno y el cráter Tycho de la Luna desde el Jardín Botánico Nacional 🔭🌙. ¡Prepárense para la próxima jornada de observación astronómica abierta a toda la familia!',
            type: 'image',
            visibility: 'public',
            images: [
              {
                url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80',
                publicId: 'seed_post_4'
              }
            ],
            tags: ['astronomia', 'ciencia', 'jardinbotanico', 'rd'],
            location: {
              type: 'Point',
              coordinates: [-69.9602, 18.4908],
              address: 'Jardín Botánico Nacional, Santo Domingo'
            },
            likes: [{ user: u2._id }, { user: u5._id }],
            comments: []
          },
          {
            user: adminUser._id,
            content: '¡Bienvenidos a EventNow RD 2.0! 🇩🇴🔥 Explora eventos verificados cerca de tu ubicación, únete a las Tribus de tus intereses o arma un Coro espontáneo hoy mismo.',
            type: 'text',
            visibility: 'public',
            tags: ['eventnow', 'republicadominicana', 'coros', 'tribus'],
            location: {
              type: 'Point',
              coordinates: [-69.9312, 18.4861],
              address: 'Distrito Nacional, República Dominicana'
            },
            likes: [{ user: u1._id }, { user: u2._id }, { user: u3._id }, { user: u4._id }],
            comments: []
          }
        ];

        await Post.insertMany(feedPostsSeed);
        logger.info('Seeded 5 sample social Posts for /feed.');
      }

      // 2. Seed Active Spontaneous Coros for /plans
      const activeCorosCount = await SpontaneousCoro.countDocuments({
        status: 'active',
        expiresAt: { $gt: new Date() }
      });
      if (activeCorosCount < 3) {
        const sampleEvents = await Event.find({ status: 'published' }).limit(4);
        const corosSeed = [
          {
            title: 'Café de especialidad y charla creativa en Gazcue / Zona Colonial',
            mood: 'cafe',
            city: 'Santo Domingo',
            meetingSpot: 'Café Casa Barista, Calle El Conde (Zona Colonial)',
            timeSlot: 'afternoon',
            creator: (organizerMap.acusticard || orgValues[0])._id,
            maxMembers: 5,
            recommendedEvent: sampleEvents[0]?._id
          },
          {
            title: 'Boceteo urbano y pintura libre viendo el atardecer en el Mirador',
            mood: 'art',
            city: 'Santo Domingo',
            meetingSpot: 'Mirador Sur - Explanada Km 5',
            timeSlot: 'afternoon',
            creator: (organizerMap.arte_parque || orgValues[0])._id,
            maxMembers: 6,
            recommendedEvent: sampleEvents[1]?._id
          },
          {
            title: 'Partidas rápidas de Ajedrez Blitz + Frappé en Plaza España',
            mood: 'gaming',
            city: 'Santo Domingo',
            meetingSpot: 'Terrazas de Plaza España, Ciudad Colonial',
            timeSlot: 'evening',
            creator: (organizerMap.astronomia_rd || orgValues[0])._id,
            maxMembers: 4,
            recommendedEvent: sampleEvents[2]?._id
          },
          {
            title: 'Co-working nocturno + tacos entre developers en Los Jardines',
            mood: 'food',
            city: 'Santiago',
            meetingSpot: 'Food Park Los Jardines Metropolitanos',
            timeSlot: 'night',
            creator: (organizerMap.tech_cibao || orgValues[0])._id,
            maxMembers: 5,
            recommendedEvent: sampleEvents[3]?._id
          }
        ];

        for (const cData of corosSeed) {
          await SpontaneousCoro.create({
            ...cData,
            members: [
              { user: cData.creator, status: 'confirmed' },
              { user: orgValues[(orgValues.length - 1)]?._id || cData.creator, status: 'confirmed' }
            ],
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
        }
        logger.info('Seeded active SpontaneousCoros for /plans.');
      }

      // 3. Seed Event Innovations (Songs, Afterspots, PlusOne, Solo Welcome Host) on upcoming events
      const topEvents = await Event.find({ status: 'published', date: { $gte: new Date() } }).sort({ date: 1 }).limit(15);
      for (const ev of topEvents) {
        if (!ev.soloWelcomeHost || !ev.soloWelcomeHost.user) {
          ev.soloWelcomeHost = {
            user: ev.createdBy,
            name: 'Anfitrión del Coro',
            meetingSpot: 'Entrada principal · Punto de bienvenida',
            timeWindow: 'Primeros 20 minutos del evento',
            confirmed: true
          };
          await ev.save();
        }
        const songCount = await EventSong.countDocuments({ event: ev._id });
        if (songCount === 0) {
          await EventSong.insertMany([
            {
              event: ev._id,
              user: ev.createdBy,
              title: 'Ojalá Que Llueva Café (Versión Cuerdas)',
              artist: 'Juan Luis Guerra',
              votes: orgValues.slice(0, 3).map(u => u._id),
              votesCount: 3
            },
            {
              event: ev._id,
              user: orgValues[1]?._id || ev.createdBy,
              title: 'Por Amor (Arreglo Acústico)',
              artist: 'Rafael Solano',
              votes: orgValues.slice(0, 2).map(u => u._id),
              votesCount: 2
            }
          ]);
        }

        const afterCount = await EventAfter.countDocuments({ event: ev._id });
        if (afterCount === 0) {
          await EventAfter.create({
            event: ev._id,
            user: ev.createdBy,
            spotName: 'Patio Culinario & Tapas Zona Colonial',
            spotType: 'food',
            address: 'Calle Hostos esq. Emiliano Tejera, Ciudad Colonial',
            vibe: 'tranquilo_hablar',
            description: 'Nos vemos al terminar para picaderas artesanales, jugos naturales y seguir conversando.',
            attendeesGoing: orgValues.slice(0, 3).map(u => u._id)
          });
        }

        const plusOneCount = await EventPlusOne.countDocuments({ event: ev._id });
        if (plusOneCount === 0) {
          await EventPlusOne.create({
            event: ev._id,
            user: ev.createdBy,
            type: 'group_join',
            title: 'Armando coro para llegar temprano y tomar buen lugar',
            description: 'Si vienes por primera vez o vienes solo/a, escríbenos para esperarnos en la entrada principal 15 minutos antes.',
            isFree: true,
            status: 'open'
          });
        }
      }
    } catch (err) {
      logger.warn('seedEcosystemData warning: ' + (err.stack || err.message));
    }
  }

  /**
   * Auto-healing check: if there are fewer than minCount upcoming events, auto-seed
   */
  static async ensureMinimumEvents(minCount = 6) {
    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_DATA !== 'true') return { success: true, skipped: true };
    try {
      const count = await Event.countDocuments({
        status: 'published',
        date: { $gte: new Date() }
      });

      if (count < minCount) {
        logger.info(`Active events count (${count}) is below minimum (${minCount}). Running auto-seeder...`);
        await this.seedAllRDEvents(true);
      }
      await this.seedEcosystemData();
      return { success: true, count, autoSeeded: count < minCount };
    } catch (error) {
      logger.error('Error in ensureMinimumEvents:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = RDEventSeeder;
