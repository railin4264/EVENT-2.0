const Event = require('../../models/Event');
const User = require('../../models/User');
const logger = require('../../utils/logger') || console;

/**
 * Sanitizes tag strings to strictly match Event schema regex:
 * /^[a-zA-Z0-9\u00C0-\u017F_-]+$/
 */
function sanitizeTag(tag) {
  if (!tag) return 'evento';
  const cleaned = String(tag)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics for clean tags
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return cleaned || 'evento';
}

/**
 * Development demo catalog. These entries are not fetched or verified listings.
 * Covers: Deportes, Museos & Cultura, Actividades Fijas Semanales,
 * Marcas/Promociones, Viajes & Tours, and Global Hubs.
 */
const CATALOG_ITEMS = [
  // ==========================================
  // 1. DEPORTES (LIDOM, Maratones, Pádel)
  // ==========================================
  {
    title: 'Clásico Dominicano: Tigres del Licey vs. Águilas Cibaeñas',
    description: 'La máxima rivalidad de la pelota invernal dominicana (LIDOM) se vive en el Estadio Quisqueya. Noche de fuegos artificiales, música en vivo de orquestas en las gradas y el mejor ambiente del béisbol caribeño. Puertas abren a las 5:00 PM.',
    category: 'sports',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 19 * 3600 * 1000), // En 4 días a las 7:00 PM
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 23 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9272, 18.4839],
      address: 'Avenida Tiradentes, Ensanche La Fe',
      venue: 'Estadio Quisqueya Juan Marichal',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 650, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1200&q=80' }],
    maxAttendees: 14500,
    tags: ['beisbol', 'lidom', 'licey', 'aguilas', 'deporte', 'pelota'],
    isOfficial: true,
    activityType: 'sports_match',
    source: 'official_curation',
    sourceId: 'lidom-licey-aguilas-2026'
  },
  {
    title: 'Medio Maratón Santo Domingo 21K & 10K',
    description: 'La carrera más esperada del año en el Malecón de Santo Domingo. Recorrido panorámico frente al Mar Caribe con puntos de hidratación cada 2 km, animación de tambores en vivo y medalla finisher para todos los inscritos.',
    category: 'sports',
    date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000 + 6 * 3600 * 1000), // En 11 días a las 6:00 AM
    endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000 + 11 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8974, 18.4616],
      address: 'Avenida George Washington (Frente a Güibia)',
      venue: 'Malecón de Santo Domingo',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 1200, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80' }],
    maxAttendees: 3000,
    tags: ['running', 'maraton', '21k', 'salud', 'deportes', 'malecon'],
    isOfficial: true,
    activityType: 'race',
    source: 'official_curation',
    sourceId: 'maraton-sd-21k-2026'
  },

  // ==========================================
  // 2. MUSEOS & ALTA CULTURA
  // ==========================================
  {
    title: 'Noche Larga de Museos: Arte y Tradición Dominicana',
    description: 'Apertura extraordinaria y gratuita de todos los museos de la Plaza de la Cultura hasta la medianoche. Recorridos guiados por curadores, presentaciones de danza contemporánea en los jardines y espectáculos de luces mapping sobre la fachada del Museo de Arte Moderno.',
    category: 'culture',
    date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 18 * 3600 * 1000), // En 6 días a las 6:00 PM
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 24 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9103, 18.4725],
      address: 'Avenida Máximo Gómez, Plaza de la Cultura',
      venue: 'Museo de Arte Moderno (MAM)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80' }],
    maxAttendees: 5000,
    tags: ['cultura', 'museo', 'arte', 'gratis', 'familia', 'plaza-de-la-cultura'],
    isOfficial: true,
    activityType: 'cultural_exhibition',
    source: 'official_curation',
    sourceId: 'noche-larga-museos-2026'
  },
  {
    title: 'Temporada Sinfónica Nacional: Grandes Obras Maestras',
    description: 'La Orquesta Sinfónica Nacional, dirigida por el maestro José Antonio Molina, presenta una velada inolvidable con piezas de Tchaikovsky y compositores dominicanos clásicos. Traje formal o elegante sport.',
    category: 'music',
    date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 20 * 3600 * 1000 + 30 * 60 * 1000), // En 8 días 8:30 PM
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 23 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9115, 18.4731],
      address: 'Avenida Máximo Gómez esquina César Nicolás Penson',
      venue: 'Sala Principal, Teatro Nacional Eduardo Brito',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 1500, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80' }],
    maxAttendees: 1580,
    tags: ['sinfonica', 'teatro-nacional', 'musica-clasica', 'arte', 'cultura'],
    isOfficial: true,
    activityType: 'classical_concert',
    source: 'official_curation',
    sourceId: 'temporada-sinfonica-2026'
  },

  // ==========================================
  // 3. ACTIVIDADES FIJAS SEMANALES (HÁBITOS)
  // ==========================================
  {
    title: 'Work & Run Mirador Sur (Kilómetro 0)',
    description: 'Comunidad fija semanal de emprendedores, creativos y runners. Nos encontramos todos los jueves a las 4:00 PM en el Km 0 para trotar o caminar 5K a ritmo suave, seguido de networking informal y jugos naturales. ¡Ven solo o con tu equipo!',
    category: 'sports',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 16 * 3600 * 1000),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 18 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9467, 18.4485],
      address: 'Avenida Anacaona con Jiménez Moya (Km 0)',
      venue: 'Parque Mirador Sur (Km 0)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&q=80' }],
    maxAttendees: 200,
    tags: ['actividad-fija', 'mirador-sur', 'running', 'networking', 'gratis', 'jueves'],
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayName: 'Jueves',
      timeText: '4:00 PM'
    },
    isSoloFriendly: true,
    soloWelcomeNote: '¡Bienvenido! Nos agrupamos junto al mapa de salud del Km 0. Te presentamos al coro de inmediato.',
    isOfficial: true,
    activityType: 'weekly_habit',
    source: 'official_curation',
    sourceId: 'work-run-mirador-sur'
  },
  {
    title: 'Noche de Karaoke & Stand Up Comedy en Piantini',
    description: 'Todos los miércoles la vibra se prende con micrófono abierto de comedia y ronda de karaoke con banda en vivo. Tragos 2x1 hasta las 9:30 PM. Ambiente perfecto para botar el estrés de mitad de semana.',
    category: 'entertainment',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 20 * 3600 * 1000),
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 24 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9328, 18.4719],
      address: 'Calle Federico Geraldino esq. Gustavo Mejía Ricart',
      venue: 'La Cantina Club Piantini',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 300, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80' }],
    maxAttendees: 150,
    tags: ['actividad-fija', 'karaoke', 'stand-up', 'comedia', 'miercoles', 'piantini'],
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayName: 'Miércoles',
      timeText: '8:00 PM'
    },
    isOfficial: true,
    activityType: 'weekly_habit',
    source: 'official_curation',
    sourceId: 'karaoke-standup-piantini'
  },
  {
    title: 'Son y Bonyé en las Ruinas de San Francisco',
    description: 'La tradición cultural más emblemática de la Ciudad Colonial. Cada domingo por la tarde, la legendaria banda Grupo Bonyé deleita a cientos de dominicanos y turistas con son tradicional, salsa y merengue clásico al aire libre.',
    category: 'music',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 17 * 3600 * 1000),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 22 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8858, 18.4764],
      address: 'Calle Hostos con Calle Tejera',
      venue: 'Ruinas del Monasterio de San Francisco',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200&q=80' }],
    maxAttendees: 800,
    tags: ['actividad-fija', 'bonye', 'son', 'zona-colonial', 'baile', 'gratis', 'domingo'],
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayName: 'Domingo',
      timeText: '5:00 PM'
    },
    isOfficial: true,
    activityType: 'weekly_habit',
    source: 'official_curation',
    sourceId: 'bonye-ruinas-colonial'
  },

  // ==========================================
  // 4. MARCAS, PROMOCIONES & RETAIL ACTIVATIONS
  // ==========================================
  {
    title: 'Día Sin ITBIS del Bravo: Gran Jornada de Ahorro',
    description: 'Evento especial nacional de Supermercados Bravo. Descuento del 18% equivalente al ITBIS en miles de productos seleccionados, carnes premium, lácteos y productos importados en todas las sucursales de Santo Domingo y Santiago.',
    category: 'community',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 22 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9419, 18.4682],
      address: 'Avenida Winston Churchill con Calle José Brea Peña',
      venue: 'Supermercados Bravo (Churchill & Todas las Sucursales)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&q=80' }],
    maxAttendees: 10000,
    tags: ['promocion', 'bravo', 'sin-itbis', 'oferta', 'compras', 'supermercado'],
    isCommercialDeal: true,
    commercialBrand: 'Supermercados Bravo',
    commercialOffer: 'Día Sin ITBIS (18% de ahorro directo) en productos seleccionados',
    isOfficial: true,
    activityType: 'brand_activation',
    source: 'official_curation',
    sourceId: 'dia-sin-itbis-bravo-2026'
  },
  {
    title: 'Venta Amarilla La Sirena: 50% de Descuento en Hogar y Tecnología',
    description: 'El evento comercial icónico de Grupo Ramos. Tres días de ofertas masivas de hasta un 50% de descuento en televisores, electrodomésticos, moda y artículos para el hogar con tarjetas de fidelidad Siremás.',
    category: 'community',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 21 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9415, 18.4715],
      address: 'Avenida Winston Churchill esquina Gustavo Mejía Ricart',
      venue: 'Tiendas La Sirena (Churchill & Nivel Nacional)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80' }],
    maxAttendees: 15000,
    tags: ['promocion', 'la-sirena', 'descuento-50', 'oferta', 'hogar', 'tecnologia'],
    isCommercialDeal: true,
    commercialBrand: 'La Sirena',
    commercialOffer: 'Hasta 50% de descuento en electrodomésticos y hogar',
    isOfficial: true,
    activityType: 'brand_activation',
    source: 'official_curation',
    sourceId: 'venta-amarilla-la-sirena-2026'
  },
  {
    title: 'Tech & Gaming Expo Ágora Mall 2026',
    description: 'Exhibición y torneos en vivo de eSports, simuladores de carreras de Fórmula 1, zonas de realidad virtual y descuentos especiales en marcas de tecnología en el atrio central de Ágora Mall.',
    category: 'technology',
    date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 10 * 3600 * 1000),
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 20 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9383, 18.4832],
      address: 'Avenida John F. Kennedy con Avenida Abraham Lincoln',
      venue: 'Ágora Mall (Nivel 1 - Atrio Central)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80' }],
    maxAttendees: 4000,
    tags: ['tecnologia', 'gaming', 'esports', 'agora-mall', 'gratis', 'familia'],
    isCommercialDeal: true,
    commercialBrand: 'Ágora Mall',
    commercialOffer: 'Entrada gratuita a torneos de videojuegos y zonas VR',
    isOfficial: true,
    activityType: 'brand_activation',
    source: 'official_curation',
    sourceId: 'tech-gaming-agora-2026'
  },

  // ==========================================
  // 5. VIAJES, TOURS & ESCAPES RD
  // ==========================================
  {
    title: 'Tour Excursión Samaná: Cayo Levantado y Salto del Limón',
    description: 'Escape de fin de semana al paraíso tropical de Samaná. Incluye transporte de lujo en autobús climatizado, paseo en lancha rápida por la bahía, caballo y guía hacia la cascada del Salto del Limón y almuerzo buffet en Cayo Levantado.',
    category: 'outdoors',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 3600 * 1000),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 20 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9149, 18.4828],
      address: 'Punto de Salida: Plaza Sambil, Av. John F. Kennedy',
      venue: 'Sambil Santo Domingo (Salida hacia Samaná)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 3900, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80' }],
    maxAttendees: 45,
    tags: ['tour', 'viaje', 'samana', 'playa', 'cayo-levantado', 'excursion'],
    isTourOrTrip: true,
    tourDetails: {
      departurePoint: 'Plaza Sambil Santo Domingo (Parqueo Kennedy 6:00 AM)',
      includes: [
        'Transporte ida y vuelta en autobús VIP climatizado',
        'Lancha rápida privada por la Bahía de Samaná',
        'Visita guiada a la cascada Salto del Limón',
        'Almuerzo buffet típico dominicano en Cayo Levantado',
        'Chalecos salvavidas y seguro de viaje'
      ]
    },
    isOfficial: true,
    activityType: 'weekend_tour',
    source: 'official_curation',
    sourceId: 'tour-samana-limon-2026'
  },
  {
    title: 'Expedición Jarabacoa Extrema: Rafting y Cascadas',
    description: 'Adrenalina pura en la ciudad de la eterna primavera. Descenso de rápidos clase III en el río Yaque del Norte con instructores certificados internacionalmente, almuerzo criollo campesino y fogata de integración al atardecer.',
    category: 'outdoors',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 3600 * 1000),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 19 * 3600 * 1000),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.6417, 19.1219],
      address: 'Carretera Jarabacoa - Manabao',
      venue: 'Rancho Baiguate / Río Yaque del Norte',
      city: 'Jarabacoa',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 3200, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=1200&q=80' }],
    maxAttendees: 30,
    tags: ['tour', 'jarabacoa', 'rafting', 'aventura', 'montana', 'rio'],
    isTourOrTrip: true,
    tourDetails: {
      departurePoint: 'Salidas coordinadas desde Santo Domingo y Santiago',
      includes: [
        'Equipo completo de rafting (casco, chaleco, remo)',
        'Guías certificados de aguas blancas',
        'Almuerzo criollo y refrigerios',
        'Fotos y videos GoPro de la expedición'
      ]
    },
    isOfficial: true,
    activityType: 'adventure_tour',
    source: 'official_curation',
    sourceId: 'tour-jarabacoa-rafting-2026'
  },

  // ==========================================
  // 6. GLOBAL & INTERNACIONAL HUBS
  // ==========================================
  {
    title: 'Miami Beach Latin Beats & Art Fest',
    description: 'The premier fusion of Caribbean music, Latin art installations, and culinary experiences along Ocean Drive. Featuring world-renowned DJs and visual artists.',
    category: 'music',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 18 * 3600 * 1000),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 24 * 3600 * 1000),
    timeZone: 'America/New_York',
    location: {
      type: 'Point',
      coordinates: [-80.1300, 25.7907],
      address: '1901 Convention Center Dr',
      venue: 'Miami Beach Convention Center',
      city: 'Miami',
      country: 'Estados Unidos',
      countryCode: 'US'
    },
    price: { amount: 45, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80' }],
    maxAttendees: 5000,
    tags: ['miami', 'festival', 'latin-beats', 'art', 'music'],
    isOfficial: true,
    activityType: 'music_festival',
    source: 'global_partner',
    sourceId: 'miami-latin-beats-2026'
  },
  {
    title: 'New York Skyline Jazz & Wine Night',
    description: 'An exclusive evening of smooth jazz under the Manhattan stars. Exceptional international wines, gourmet tapas, and breathtaking panoramic skyline views of the East River.',
    category: 'music',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 19 * 3600 * 1000),
    endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 23 * 3600 * 1000),
    timeZone: 'America/New_York',
    location: {
      type: 'Point',
      coordinates: [-74.0028, 40.7071],
      address: '89 South St',
      venue: 'Pier 17 Rooftop',
      city: 'New York',
      country: 'Estados Unidos',
      countryCode: 'US'
    },
    price: { amount: 65, currency: 'USD' },
    images: [{ url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80' }],
    maxAttendees: 1200,
    tags: ['new-york', 'jazz', 'skyline', 'pier-17', 'wine'],
    isOfficial: true,
    activityType: 'jazz_concert',
    source: 'global_partner',
    sourceId: 'nyc-skyline-jazz-2026'
  },
  {
    title: 'Noche de Flamenco & Fusión Madrid',
    description: 'El tablao contemporáneo más vibrante de la capital española. Maestros del cante jondo y la guitarra flamenca se fusionan con percusión moderna en el corazón de Madrid.',
    category: 'culture',
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 20 * 3600 * 1000),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 23 * 3600 * 1000),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [-3.7038, 40.4168],
      address: 'Avenida Felipe II',
      venue: 'WiZink Center (Sala de Cámara)',
      city: 'Madrid',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 35, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80' }],
    maxAttendees: 900,
    tags: ['madrid', 'flamenco', 'wizink-center', 'espana', 'cultura'],
    isOfficial: true,
    activityType: 'cultural_show',
    source: 'global_partner',
    sourceId: 'madrid-flamenco-fusion-2026'
  }
];

/**
 * Executes the complete ingestion and seeding process
 */
async function harvestAllEvents() {
  // This catalog contains examples, not remotely verified event listings.
  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_DATA !== 'true') {
    return { success: true, skipped: true, reason: 'Demo catalog disabled' };
  }
  try {
    // 1. Get or confirm the Official Admin User
    const admin = await User.findOne({ email: 'admin@eventnow.do' });
    if (!admin) {
      throw new Error('Demo catalog requires an existing curator; it never creates administrator accounts.');
    }

    logger.info(`Starting event harvest under official curator: ${admin.username} (${admin._id})`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of CATALOG_ITEMS) {
      const sanitizedTags = (item.tags || []).map(sanitizeTag);

      const existing = await Event.findOne({
        source: 'demo_catalog', sourceId: item.sourceId
      });

      const eventData = {
        ...item,
        tags: sanitizedTags,
        createdBy: admin._id,
        organizer: 'EventNow Oficial',
        source: 'demo_catalog',
        title: `[Demo] ${item.title}`,
        status: 'draft',
        isOfficial: false
      };

      if (existing) {
        await Event.findByIdAndUpdate(existing._id, eventData);
        updatedCount++;
      } else {
        await Event.create(eventData);
        createdCount++;
      }
    }

    logger.info(`Harvest finished: ${createdCount} created, ${updatedCount} updated.`);
    return { success: true, createdCount, updatedCount, totalProcessed: CATALOG_ITEMS.length };
  } catch (err) {
    logger.error('Error during event harvest:', err);
    throw err;
  }
}

module.exports = {
  harvestAllEvents,
  CATALOG_ITEMS
};
