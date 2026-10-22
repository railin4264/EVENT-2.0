/**
 * virtualEventHarvester.js
 *
 * Dedicated harvester and seeder for Global Virtual Events:
 * - Live Streams (YouTube Live, Twitch, Kick)
 * - Interactive Workshops & Masterclasses (Google Meet, Zoom)
 * - Official Webinars, Keynotes & Summits
 *
 * Virtual events are borderless, universal, and instantly joinable by users worldwide.
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { demoCatalogEnabled, DEMO_CATALOG_SKIP } = require('./demoCatalogGuard');

const GLOBAL_VIRTUAL_EVENTS = [
  // 1. Live Streams
  {
    title: '🔴 Boiler Room Worldwide: Live Electronic Sessions & DJ Sets',
    description: 'Transmisión mundial en vivo de música electrónica, underground techno y house directamente desde los clubes más icónicos de Londres, Berlín y Tokio. Conéctate al stream oficial con audio en alta fidelidad y chat en tiempo real.',
    category: 'music',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'youtube_live',
    virtualLink: 'https://www.youtube.com/watch?v=live_stream_boiler_room',
    virtualDetails: {
      isStream: true,
      isWorkshop: false,
      isWebinar: false,
      streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/live_stream?channel=BoilerRoom',
      recordingUrl: 'https://www.youtube.com/c/BoilerRoom',
      prerequisites: ['Auriculares o altavoces con buenos graves']
    },
    dateOffsetHours: 2, // Starts in 2 hours
    durationHours: 6,
    price: { amount: 0, currency: 'USD' },
    tags: ['stream', 'musica', 'electronic', 'boiler room', 'dj set', 'live'],
    images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 50000
  },
  {
    title: '🎮 Twitch Rivals: Torneo Latinoamericano de Creadores & Esports',
    description: 'La competencia más emocionante de creadores de contenido y pro-players en vivo. Equipos mixtos disputando la gran final continental con drops exclusivos en el chat y casteo en español.',
    category: 'gaming',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'twitch',
    virtualLink: 'https://www.twitch.tv/twitchrivals_es',
    virtualDetails: {
      isStream: true,
      isWorkshop: false,
      isWebinar: false,
      streamEmbedUrl: 'https://player.twitch.tv/?channel=twitchrivals_es&parent=localhost',
      recordingUrl: 'https://www.twitch.tv/twitchrivals_es/videos',
      prerequisites: ['Cuenta de Twitch para participar en las votaciones del chat']
    },
    dateOffsetHours: 4,
    durationHours: 5,
    price: { amount: 0, currency: 'USD' },
    tags: ['gaming', 'esports', 'twitch', 'stream', 'torneo'],
    images: [{ url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 100000
  },
  {
    title: '⚡ Live Coding & Autonomous AI: Creando Agentes con DeepSeek & Gemini',
    description: 'Sesión técnica en directo paso a paso: arquitectura de agentes autónomos, integración con MCP (Model Context Protocol), orquestación de prompts y despliegue en la nube en tiempo real.',
    category: 'tech',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'youtube_live',
    virtualLink: 'https://www.youtube.com/watch?v=live_stream_ai_agents',
    virtualDetails: {
      isStream: true,
      isWorkshop: false,
      isWebinar: false,
      streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/live_stream',
      prerequisites: ['Conocimientos básicos de JavaScript o Python', 'Ganas de aprender']
    },
    dateOffsetHours: 8,
    durationHours: 3,
    price: { amount: 0, currency: 'USD' },
    tags: ['tech', 'ia', 'live coding', 'deepseek', 'gemini', 'stream'],
    images: [{ url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 5000
  },
  {
    title: '🚀 Product Hunt Global Demo Day: Lanzamientos en Vivo 2026',
    description: 'Los creadores de las herramientas más innovadoras de Inteligencia Artificial, diseño y productividad presentan sus proyectos en vivo frente a inversores y la comunidad tecnológica internacional.',
    category: 'business',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'youtube_live',
    virtualLink: 'https://www.youtube.com/watch?v=live_product_hunt_demo_day',
    virtualDetails: {
      isStream: true,
      isWorkshop: false,
      isWebinar: true,
      streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/live_stream',
      prerequisites: ['Perfil en Product Hunt para votar en vivo']
    },
    dateOffsetHours: 12,
    durationHours: 4,
    price: { amount: 0, currency: 'USD' },
    tags: ['business', 'startups', 'product hunt', 'demo day', 'stream'],
    images: [{ url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 15000
  },

  // 2. Talleres Virtuales (Workshops & Masterclasses)
  {
    title: '🎨 Masterclass Virtual: Diseño de Interfaces UI/UX en Figma a Producción',
    description: 'Taller 100% práctico e interactivo donde diseñaremos un sistema de diseño responsivo completo, prototipado avanzado con variables y cómo preparar los activos listos para desarrollo sin fricción.',
    category: 'art',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'google_meet',
    virtualLink: 'https://meet.google.com/eventnow-uiux-masterclass',
    virtualDetails: {
      isStream: false,
      isWorkshop: true,
      isWebinar: false,
      meetingId: 'meet-uiux-2026',
      prerequisites: ['Cuenta gratuita de Figma', 'Navegador Chrome/Edge actualizado', 'Cámara y micrófono opcional']
    },
    dateOffsetHours: 24,
    durationHours: 3,
    price: { amount: 0, currency: 'USD' },
    tags: ['taller', 'ui', 'ux', 'figma', 'diseño', 'workshop'],
    images: [{ url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 250
  },
  {
    title: '💻 Bootcamp Intensivo: Fullstack Next.js 15, Tailwind & WebSockets en Vivo',
    description: 'Aprende a construir aplicaciones web en tiempo real de escala de producción con Server Actions, autenticación segura y mensajería instantánea. Código compartido en GitHub durante el taller.',
    category: 'tech',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'google_meet',
    virtualLink: 'https://meet.google.com/eventnow-nextjs-bootcamp',
    virtualDetails: {
      isStream: false,
      isWorkshop: true,
      isWebinar: false,
      meetingId: 'meet-nextjs-live',
      prerequisites: ['Node.js instalado v20+', 'Editor VS Code', 'Conocimientos de React']
    },
    dateOffsetHours: 36,
    durationHours: 4,
    price: { amount: 0, currency: 'USD' },
    tags: ['taller', 'nextjs', 'react', 'programacion', 'bootcamp', 'workshop'],
    images: [{ url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 300
  },
  {
    title: '🍸 Masterclass Online: Coctelería de Autor & Maridaje Tropical en Casa',
    description: 'Aprende a preparar cócteles profesionales desde la comodidad de tu cocina guiado por un mixólogo galardonado internacionalmente. Técnicas de maceración, hielo artesanal y balance cítrico.',
    category: 'food',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'zoom',
    virtualLink: 'https://zoom.us/j/98765432101',
    virtualDetails: {
      isStream: false,
      isWorkshop: true,
      isWebinar: false,
      meetingId: '987 6543 2101',
      passcode: 'COCTEL2026',
      prerequisites: ['Coctelera o termo con tapa', 'Hielo abundante', 'Ron o destilado de preferencia', 'Limones o hierbabuena']
    },
    dateOffsetHours: 48,
    durationHours: 2,
    price: { amount: 0, currency: 'USD' },
    tags: ['taller', 'cocteleria', 'mixologia', 'food', 'workshop', 'masterclass'],
    images: [{ url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 150
  },
  {
    title: '🧘 Sesión de Yoga Restaurativo & Mindfulness Global al Atardecer',
    description: 'Espacio de desconexión y estiramiento guiado para liberar la tensión acumulada de la semana frente a la pantalla. Apto para todos los niveles, desde principiantes hasta practicantes avanzados.',
    category: 'wellness',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'zoom',
    virtualLink: 'https://zoom.us/j/91234567890',
    virtualDetails: {
      isStream: false,
      isWorkshop: true,
      isWebinar: false,
      meetingId: '912 3456 7890',
      passcode: 'YOGA2026',
      prerequisites: ['Ropa cómoda', 'Esterilla de yoga o alfombra', 'Botella de agua']
    },
    dateOffsetHours: 18,
    durationHours: 1.5,
    price: { amount: 0, currency: 'USD' },
    tags: ['taller', 'yoga', 'wellness', 'salud', 'meditacion', 'mindfulness'],
    images: [{ url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 500
  },

  // 3. Webinars & Cumbres Oficiales
  {
    title: '🌐 Global Tech Summit 2026: Inteligencia Artificial, Agentes & El Futuro',
    description: 'La cumbre internacional de referencia sobre IA generativa, robótica y desarrollo de software. Keynotes principales impartidas por directores de investigación y fundadores de Silicon Valley, Madrid y Latinoamérica.',
    category: 'tech',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'zoom',
    virtualLink: 'https://zoom.us/webinar/register/WN_techsummit2026',
    virtualDetails: {
      isStream: false,
      isWorkshop: false,
      isWebinar: true,
      meetingId: '800 1234 5678',
      prerequisites: ['Registro previo gratuito para recibir el enlace seguro de acceso'],
      recordingUrl: 'https://globaltechsummit.io/replays'
    },
    dateOffsetHours: 60,
    durationHours: 7,
    price: { amount: 0, currency: 'USD' },
    tags: ['webinar', 'cumbre', 'tech', 'conferencia', 'ia', 'global'],
    images: [{ url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 20000
  },
  {
    title: '📈 Conferencia Internacional de Emprendimiento & Ronda de Inversión Semilla',
    description: 'Pitch Day con 12 startups seleccionadas ante un jurado de 20 firmas de Venture Capital de EE.UU., Europa y América Latina. Panel magistral sobre levantamiento de capital en etapas iniciales.',
    category: 'business',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'zoom',
    virtualLink: 'https://zoom.us/webinar/register/WN_pitchday2026',
    virtualDetails: {
      isStream: false,
      isWorkshop: false,
      isWebinar: true,
      meetingId: '888 7654 3210',
      prerequisites: ['Interés en el ecosistema emprendedor e inversión ángel']
    },
    dateOffsetHours: 72,
    durationHours: 5,
    price: { amount: 0, currency: 'USD' },
    tags: ['webinar', 'business', 'startups', 'pitch day', 'venture capital', 'inversion'],
    images: [{ url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 10000
  },
  {
    title: '🌿 Simposio Virtual sobre Ciudades Inteligentes & Transición Energética',
    description: 'Encuentro multilateral de urbanistas, ingenieros y líderes comunitarios explorando movilidad eléctrica, descarbonización y arquitectura bioclimática para metrópolis contemporáneas.',
    category: 'education',
    eventType: 'virtual',
    isVirtual: true,
    virtualPlatform: 'teams',
    virtualLink: 'https://teams.microsoft.com/l/meetup-join/smartcities2026',
    virtualDetails: {
      isStream: false,
      isWorkshop: false,
      isWebinar: true,
      meetingId: 'teams-smart-cities',
      prerequisites: ['Acceso a Microsoft Teams web o app']
    },
    dateOffsetHours: 96,
    durationHours: 4,
    price: { amount: 0, currency: 'USD' },
    tags: ['webinar', 'educacion', 'sostenibilidad', 'ciudades inteligentes', 'conferencia'],
    images: [{ url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' }],
    maxAttendees: 8000
  }
];

/**
 * Seeds and synchronizes global virtual events into the EventNow database.
 * Ensures idempotent execution by upserting based on title.
 *
 * @returns {Promise<{ created: number, updated: number, total: number }>}
 */
async function syncVirtualEvents() {
  if (!demoCatalogEnabled()) return { ...DEMO_CATALOG_SKIP };
  const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
  if (!adminUser) {
    console.warn('[VirtualHarvester] No admin or valid user found to author virtual events.');
    return { created: 0, updated: 0, total: 0 };
  }

  const now = new Date();
  let created = 0;
  let updated = 0;

  for (const def of GLOBAL_VIRTUAL_EVENTS) {
    const eventDate = new Date(now.getTime() + (def.dateOffsetHours || 2) * 3600 * 1000);
    const eventEndDate = new Date(eventDate.getTime() + (def.durationHours || 3) * 3600 * 1000);

    const eventPayload = {
      title: def.title,
      description: def.description,
      category: def.category,
      date: eventDate,
      endDate: eventEndDate,
      timeZone: 'UTC',
      eventType: def.eventType || 'virtual',
      isVirtual: true,
      virtualPlatform: def.virtualPlatform || 'custom',
      virtualLink: def.virtualLink,
      virtualDetails: def.virtualDetails || {},
      price: def.price || { amount: 0, currency: 'USD' },
      tags: (def.tags || ['virtual', 'online']).map(t => String(t).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')),
      images: def.images || [],
      maxAttendees: def.maxAttendees || 10000,
      isPrivate: false,
      status: 'published',
      location: {
        type: 'Point',
        coordinates: [0, 20], // Global / Online reference coordinates
        address: '🌐 Evento 100% Virtual · Acceso Global',
        venue: def.virtualPlatform === 'youtube_live' ? 'YouTube Live Stream'
             : def.virtualPlatform === 'twitch' ? 'Twitch Interactive Channel'
             : def.virtualPlatform === 'google_meet' ? 'Google Meet Room'
             : def.virtualPlatform === 'zoom' ? 'Zoom Live Stage'
             : def.virtualPlatform === 'teams' ? 'Microsoft Teams Room'
             : 'Sala Virtual Global',
        city: 'En Línea / Global',
        country: 'Mundial'
      },
      createdBy: adminUser._id
    };

    const existing = await Event.findOne({ title: def.title });
    if (existing) {
      Object.assign(existing, eventPayload);
      await existing.save();
      updated++;
    } else {
      await Event.create(eventPayload);
      created++;
    }
  }

  const total = await Event.countDocuments({ isVirtual: true });
  console.log(`[VirtualHarvester] Ingested virtual events: created=${created}, updated=${updated}, totalVirtual=${total}`);
  return { created, updated, total };
}

module.exports = {
  GLOBAL_VIRTUAL_EVENTS,
  syncVirtualEvents
};
