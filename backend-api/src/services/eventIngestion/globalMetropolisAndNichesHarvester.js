'use strict';

/**
 * globalMetropolisAndNichesHarvester.js
 * ------------------------------------------------------------------
 * Automated Planetary Harvester expanding EventNow to previously uncovered
 * world metropolises and high-interest cultural niches:
 * - 🇨🇦 Canadá (Toronto, Montreal)
 * - 🇩🇪 Alemania (Berlín, Múnich, Fráncfort)
 * - 🇮🇹 Italia (Milán, Roma)
 * - 🇰🇷 Corea del Sur (Seúl, Busán)
 * - 🇦🇺 Australia (Sídney, Melbourne)
 * - 🇦🇪 EAU / Dubái & 🇪🇬 Egipto / El Cairo
 * - 🇮🇳 India (Bangalore, Mumbai)
 * - 🇿🇦 Sudáfrica (Ciudad del Cabo)
 * - 🇵🇷 Puerto Rico, 🇨🇷 Costa Rica, 🇵🇦 Panamá, 🇨🇺 Cuba
 * - 🇩🇰 Dinamarca, 🇳🇴 Noruega, 🇫🇮 Finlandia
 * - 🎮 Esports Globales & 🐾 Festivales de Mascotas & Bienestar Animal
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { invalidateCache } = require('../../middleware/cache');
const { getCategoryFallbackImage } = require('../../utils/imageFallbacks');
const logger = require('../../utils/logger') || console;
const { demoCatalogEnabled, DEMO_CATALOG_SKIP } = require('./demoCatalogGuard');

const METROPOLIS_AND_NICHES_EVENTS = [
  // ==========================================
  // 🇨🇦 CANADÁ (Toronto & Montreal)
  // ==========================================
  {
    sourceId: 'global:ca-toronto-tiff-film-festival-2026',
    title: '🇨🇦 Toronto International Film Festival (TIFF) & Red Carpet Premieres',
    description: 'Uno de los festivales cinematográficos más influyentes del planeta. Estrenos mundiales de cine independiente y de autor, alfombra roja con directores internacionales y paneles en el TIFF Bell Lightbox.',
    category: 'film',
    activityType: 'cine al aire libre',
    tags: ['cine', 'tiff', 'toronto', 'canada', 'estrenos', 'filmfestival'],
    daysFromNow: 8,
    time: '18:30',
    durationHours: 4,
    venue: 'TIFF Bell Lightbox',
    address: '350 King St W, Toronto, ON M5V 3X5',
    city: 'Toronto',
    country: 'Canadá',
    countryCode: 'CA',
    coordinates: [-79.3900, 43.6465],
    price: { amount: 35, currency: 'CAD' },
    externalUrl: 'https://tiff.net',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80'
  },
  {
    sourceId: 'global:ca-montreal-international-jazz-festival',
    title: '🎷 Festival International de Jazz de Montréal & Nuit Blanche',
    description: 'El festival de jazz más grande del mundo en el Quartier des Spectacles de Montreal. Conciertos al aire libre gratuitos, jams nocturnas y artistas de los cinco continentes.',
    category: 'music',
    activityType: 'jam session',
    tags: ['jazz', 'musica', 'montreal', 'canada', 'concierto', 'nuitblanche'],
    daysFromNow: 12,
    time: '19:00',
    durationHours: 5,
    venue: 'Place des Festivals - Quartier des Spectacles',
    address: 'Jeanne-Mance St, Montreal, QC H2X 1Y4',
    city: 'Montreal',
    country: 'Canadá',
    countryCode: 'CA',
    coordinates: [-73.5673, 45.5074],
    price: { amount: 0, currency: 'CAD' },
    externalUrl: 'https://montrealjazzfest.com',
    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80'
  },

  // ==========================================
  // 🇩🇪 ALEMANIA (Berlín, Múnich, Fráncfort)
  // ==========================================
  {
    sourceId: 'global:de-berlin-electronic-music-techno-summit',
    title: '🇩🇪 Berlin Electronic Sound & Club Culture Open Air Festival',
    description: 'La capital mundial de la música electrónica celebra la cultura de club. Sets en vivo con los pioneros del techno berlinés, instalaciones de arte lumínico y debates sobre la preservación de espacios creativos urbanos.',
    category: 'music',
    activityType: 'concierto acústico',
    tags: ['berlin', 'techno', 'electronica', 'clubculture', 'alemania', 'openair'],
    daysFromNow: 6,
    time: '20:00',
    durationHours: 6,
    venue: 'Tempelhof Field & Hangars',
    address: 'Tempelhofer Damm, 12101 Berlín',
    city: 'Berlín',
    country: 'Alemania',
    countryCode: 'DE',
    coordinates: [13.4024, 52.4827],
    price: { amount: 22, currency: 'EUR' },
    externalUrl: 'https://visitberlin.de/en/event-calendar-berlin',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80'
  },
  {
    sourceId: 'global:de-munich-bavarian-craft-beer-food-fest',
    title: '🍺 Bavarian Craft Beer, Gastronomy & Folk Traditions Festival',
    description: 'Encuentro gastronómico tradicional en Múnich. Degustación de cervezas artesanales de abadía, pretzels gigantes, salchichas bávaras y orquestas de viento en la emblemática Theresienwiese.',
    category: 'food',
    activityType: 'cocina local',
    tags: ['munich', 'cerveza', 'gastronomia', 'baviera', 'alemania', 'festival'],
    daysFromNow: 10,
    time: '12:00',
    durationHours: 8,
    venue: 'Theresienwiese Open Arena',
    address: 'Bavariaring, 80336 Múnich',
    city: 'Múnich',
    country: 'Alemania',
    countryCode: 'DE',
    coordinates: [11.5498, 48.1317],
    price: { amount: 15, currency: 'EUR' },
    externalUrl: 'https://muenchen.de/events',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80'
  },
  {
    sourceId: 'global:de-frankfurt-international-book-fair',
    title: '📚 Frankfurter Buchmesse 2026: Feria Internacional del Libro y Novela Gráfica',
    description: 'La feria del libro más relevante del mundo editorial. Firmas de autores laureados, conferencias magistrales sobre literatura contemporánea, pabellones de novela gráfica y traducción literaria.',
    category: 'education',
    activityType: 'club de lectura',
    tags: ['libros', 'literatura', 'frankfurt', 'alemania', 'editorial', 'feriadellibro'],
    daysFromNow: 14,
    time: '10:00',
    durationHours: 7,
    venue: 'Messe Frankfurt Exhibition Grounds',
    address: 'Ludwig-Erhard-Anlage 1, 60327 Fráncfort',
    city: 'Fráncfort',
    country: 'Alemania',
    countryCode: 'DE',
    coordinates: [8.6477, 50.1130],
    price: { amount: 20, currency: 'EUR' },
    externalUrl: 'https://buchmesse.de/en',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&q=80'
  },

  // ==========================================
  // 🇮🇹 ITALIA (Milán & Roma)
  // ==========================================
  {
    sourceId: 'global:it-milan-design-week-salone-mobile',
    title: '🇮🇹 Milano Design Week & Salone del Mobile: Vanguardia y Mobiliario',
    description: 'El epicentro del diseño global. Exposiciones de arquitectura de interiores, instalaciones inmersivas en el Brera Design District y mobiliario de autor de los estudios más reconocidos de Europa.',
    category: 'art',
    activityType: 'galería abierta',
    tags: ['diseno', 'milan', 'italia', 'arquitectura', 'muebles', 'salonedelmobile'],
    daysFromNow: 7,
    time: '11:00',
    durationHours: 7,
    venue: 'Brera Design District & Fiera Milano',
    address: 'Via Brera 28, 20121 Milán',
    city: 'Milán',
    country: 'Italia',
    countryCode: 'IT',
    coordinates: [9.1878, 45.4719],
    price: { amount: 25, currency: 'EUR' },
    externalUrl: 'https://salonemilano.it',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80'
  },
  {
    sourceId: 'global:it-roma-notte-romana-arte-classico-cinema',
    title: '🏛️ Notte Romana: Arte Histórico, Música Clásica y Cine en los Foros Imperiales',
    description: 'Una velada mágica en el corazón de la Ciudad Eterna. Recorridos nocturnos iluminados entre ruinas milenarias, concierto de cuarteto de cuerdas y proyección de cine italiano clásico al aire libre.',
    category: 'culture',
    activityType: 'tour histórico',
    tags: ['roma', 'italia', 'historia', 'arte', 'cine', 'cultura', 'fororomano'],
    daysFromNow: 9,
    time: '20:30',
    durationHours: 3.5,
    venue: 'Via dei Fori Imperiali - Colosseo',
    address: 'Via dei Fori Imperiali, 00184 Roma',
    city: 'Roma',
    country: 'Italia',
    countryCode: 'IT',
    coordinates: [12.4922, 41.8902],
    price: { amount: 15, currency: 'EUR' },
    externalUrl: 'https://turismoroma.it',
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80'
  },

  // ==========================================
  // 🇰🇷 COREA DEL SUR (Seúl & Busán)
  // ==========================================
  {
    sourceId: 'global:kr-seoul-kpop-robotics-ddp-showcase',
    title: '🇰🇷 Seoul K-Pop Live Showcase, Webtoons & Next-Gen Robotics',
    description: 'El fenómeno de la ola Hallyu en Dongdaemun Design Plaza. Presentaciones de baile K-Pop en vivo, zona de artistas de webtoon digital y exhibición de robótica humanoide interactiva.',
    category: 'entertainment',
    activityType: 'teatro',
    tags: ['kpop', 'seoul', 'corea', 'tecnologia', 'robotica', 'hallyu', 'baile'],
    daysFromNow: 5,
    time: '18:00',
    durationHours: 4,
    venue: 'Dongdaemun Design Plaza (DDP)',
    address: '281 Eulji-ro, Jung-gu, Seúl',
    city: 'Seúl',
    country: 'Corea del Sur',
    countryCode: 'KR',
    coordinates: [127.0094, 37.5665],
    price: { amount: 35000, currency: 'KRW' },
    externalUrl: 'https://ddp.or.kr',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80'
  },
  {
    sourceId: 'global:kr-busan-international-film-festival',
    title: '🌊 Busan International Film Festival & Haeundae Beach Open Cinema',
    description: 'El mayor certamen de cine de Asia. Pantalla gigante en la arena de la playa Haeundae, proyección de cine oriental e internacional con brisa marina y encuentros con directores.',
    category: 'film',
    activityType: 'cine al aire libre',
    tags: ['cine', 'busan', 'corea', 'playa', 'filmfestival', 'haeundae'],
    daysFromNow: 11,
    time: '19:30',
    durationHours: 3.5,
    venue: 'Busan Cinema Center & Haeundae Beach',
    address: '120 Suyeonggangbyeon-daero, Haeundae-gu, Busán',
    city: 'Busán',
    country: 'Corea del Sur',
    countryCode: 'KR',
    coordinates: [129.1283, 35.1711],
    price: { amount: 12000, currency: 'KRW' },
    externalUrl: 'https://biff.kr',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80'
  },

  // ==========================================
  // 🇦🇺 AUSTRALIA (Sídney & Melbourne)
  // ==========================================
  {
    sourceId: 'global:au-sydney-vivid-light-music-ideas-festival',
    title: '🇦🇺 Vivid Sydney 2026: Festival Mundial de Luces, Música y Ópera',
    description: 'La bahía de Sídney se transforma en un lienzo de luz caleidoscópica. Proyecciones 3D sobre las velas de la Sydney Opera House, conciertos de música independiente y senderos lumínicos interactivos.',
    category: 'art',
    activityType: 'muralismo',
    tags: ['sydney', 'australia', 'luces', 'vividsydney', 'arte', 'musica', 'opera'],
    daysFromNow: 8,
    time: '18:00',
    durationHours: 5,
    venue: 'Sydney Opera House & Circular Quay',
    address: 'Bennelong Point, Sydney NSW 2000',
    city: 'Sídney',
    country: 'Australia',
    countryCode: 'AU',
    coordinates: [151.2153, -33.8568],
    price: { amount: 0, currency: 'AUD' },
    externalUrl: 'https://vividsydney.com',
    imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80'
  },
  {
    sourceId: 'global:au-melbourne-specialty-coffee-expo',
    title: '☕ Melbourne Specialty Coffee Expo & World Barista Championship',
    description: 'La capital mundial del café de especialidad abre sus puertas. Catas guiadas de granos etíopes y latinoamericanos, batallas de latte art en vivo y talleres de filtrados manuales.',
    category: 'food',
    activityType: 'cata de ron',
    tags: ['cafe', 'melbourne', 'australia', 'barista', 'coffee', 'gastronomia'],
    daysFromNow: 12,
    time: '10:00',
    durationHours: 6,
    venue: 'Royal Exhibition Building',
    address: '9 Nicholson St, Carlton VIC 3053',
    city: 'Melbourne',
    country: 'Australia',
    countryCode: 'AU',
    coordinates: [144.9717, -37.8047],
    price: { amount: 28, currency: 'AUD' },
    externalUrl: 'https://internationalcoffeeexpo.com',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80'
  },

  // ==========================================
  // 🇦🇪 EAU (Dubái) & 🇪🇬 EGIPTO (El Cairo)
  // ==========================================
  {
    sourceId: 'global:ae-dubai-gitex-ai-supercomputing-summit',
    title: '🇦🇪 GITEX Global Dubai: Cumbre Mundial de Inteligencia Artificial & Web3',
    description: 'El mayor evento de tecnología y startups de Oriente Medio. Convocatoria de más de 100 países exhibiendo drones autónomos, modelos de lenguaje de última generación y finanzas descentralizadas.',
    category: 'technology',
    activityType: 'hackathon',
    tags: ['dubai', 'gitex', 'ia', 'tecnologia', 'web3', 'emiratos', 'innovacion'],
    daysFromNow: 6,
    time: '10:00',
    durationHours: 7.5,
    venue: 'Dubai World Trade Centre (DWTC)',
    address: 'Sheikh Zayed Rd, Trade Centre, Dubái',
    city: 'Dubái',
    country: 'Emiratos Árabes Unidos',
    countryCode: 'AE',
    coordinates: [55.2872, 25.2255],
    price: { amount: 150, currency: 'AED' },
    externalUrl: 'https://gitex.com',
    imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80'
  },
  {
    sourceId: 'global:eg-cairo-gran-museo-egipcio-piramides-giza',
    title: '🇪🇬 Noche de Tutankamón & Festival Arqueológico en el Gran Museo Egipcio (GEM)',
    description: 'Una experiencia cultural sin precedentes frente a las Pirámides de Giza. Visita nocturna guiada a la colección completa de Tutankamón, mapping holográfico y música tradicional sobre arena dorada.',
    category: 'culture',
    activityType: 'tour histórico',
    tags: ['egipto', 'cairo', 'piramides', 'arqueologia', 'cultura', 'museo'],
    daysFromNow: 11,
    time: '19:00',
    durationHours: 4,
    venue: 'Grand Egyptian Museum (GEM)',
    address: 'Alexandria Desert Rd, Kafr Nassar, Al Giza, El Cairo',
    city: 'El Cairo',
    country: 'Egipto',
    countryCode: 'EG',
    coordinates: [31.1199, 29.9944],
    price: { amount: 450, currency: 'EGP' },
    externalUrl: 'https://visit-gem.com',
    imageUrl: 'https://images.unsplash.com/photo-1503177112294-72c5979dbe37?w=1200&q=80'
  },

  // ==========================================
  // 🇮🇳 INDIA (Bangalore & Mumbai)
  // ==========================================
  {
    sourceId: 'global:in-bangalore-silicon-plateau-ai-developers-conclave',
    title: '🇮🇳 Bengaluru Silicon Plateau: Cumbre Global de Ingenieros de IA y Código Abierto',
    description: 'El corazón tecnológico de la India reúne a desarrolladores de software de todo el mundo. Hackathons en vivo, paneles de arquitectura en la nube y networking en el polo de innovación de Karnataka.',
    category: 'technology',
    activityType: 'meetup de IA',
    tags: ['india', 'bangalore', 'tecnologia', 'ia', 'codigo', 'developers'],
    daysFromNow: 7,
    time: '09:30',
    durationHours: 8,
    venue: 'Bangalore International Exhibition Centre (BIEC)',
    address: '10th Mile, Tumkur Rd, Madavara, Bangalore',
    city: 'Bangalore',
    country: 'India',
    countryCode: 'IN',
    coordinates: [77.4764, 13.0617],
    price: { amount: 1500, currency: 'INR' },
    externalUrl: 'https://biec.in',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
  },
  {
    sourceId: 'global:in-mumbai-bollywood-dance-marine-drive-carnival',
    title: '💃 Mumbai Bollywood Rhythms & Street Food Carnival en Marine Drive',
    description: 'La magia de Bollywood junto al mar Arábigo. Clases maestras de coreografía de cine indio, conciertos de sitar y tabla, y degustación de pani puri, vada pav y chai especiado.',
    category: 'dance',
    activityType: 'salsa al aire libre',
    tags: ['mumbai', 'india', 'bollywood', 'danza', 'comida', 'cultura', 'marinedrive'],
    daysFromNow: 13,
    time: '17:30',
    durationHours: 4.5,
    venue: 'National Centre for the Performing Arts (NCPA) Promenade',
    address: 'Nariman Point, Marine Drive, Mumbai',
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    coordinates: [72.8205, 18.9256],
    price: { amount: 500, currency: 'INR' },
    externalUrl: 'https://ncpamumbai.com',
    imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80'
  },

  // ==========================================
  // 🇿🇦 SUDÁFRICA (Ciudad del Cabo)
  // ==========================================
  {
    sourceId: 'global:za-cape-town-international-jazz-festival',
    title: '🇿🇦 Cape Town International Jazz Festival & Table Mountain Sessions',
    description: 'El evento musical de referencia en el continente africano. Dos días de jazz afro-caribeño, funk y soul frente a la icónica Table Mountain con gastronomía del cabo.',
    category: 'music',
    activityType: 'concierto acústico',
    tags: ['capetown', 'sudafrica', 'jazz', 'musica', 'tablemountain', 'africa'],
    daysFromNow: 10,
    time: '18:00',
    durationHours: 6,
    venue: 'Cape Town International Convention Centre (CTICC)',
    address: '1 Lower Long St, Cape Town, 8001',
    city: 'Ciudad del Cabo',
    country: 'Sudáfrica',
    countryCode: 'ZA',
    coordinates: [18.4286, -33.9175],
    price: { amount: 650, currency: 'ZAR' },
    externalUrl: 'https://capetownjazzfest.com',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80'
  },

  // ==========================================
  // 🇵🇷 PUERTO RICO & 🇨🇷 COSTA RICA & 🇵🇦 PANAMÁ & 🇨🇺 CUBA
  // ==========================================
  {
    sourceId: 'global:pr-san-juan-fiestas-calle-san-sebastian-salsa',
    title: '🇵🇷 Fiestas de la Calle San Sebastián: Festival de Salsa Brava y Artesanías',
    description: 'La gran fiesta puertorriqueña en el Viejo San Juan. Cabezudos, orquestas de salsa en vivo en la Plaza del Quinto Centenario, rumba callejera y venta de artesanías boricuas.',
    category: 'dance',
    activityType: 'salsa al aire libre',
    tags: ['puertorico', 'sanjuan', 'salsa', 'sanse', 'baile', 'artesanias', 'caribe'],
    daysFromNow: 5,
    time: '16:00',
    durationHours: 7,
    venue: 'Plaza del Quinto Centenario - Viejo San Juan',
    address: 'Calle San Sebastián, San Juan, PR 00901',
    city: 'San Juan',
    country: 'Puerto Rico',
    countryCode: 'PR',
    coordinates: [-66.1189, 18.4682],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://discoverpuertorico.com',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80'
  },
  {
    sourceId: 'global:cr-la-fortuna-rainforest-volcan-arenal-eco-summit',
    title: '🇨🇷 Costa Rica Rainforest, Volcanes & Ecoturismo de Aventura Pura Vida',
    description: 'Jornada de senderismo sostenible en el Parque Nacional Volcán Arenal. Aguas termales naturales, avistamiento de aves tropicales y talleres de conservación ambiental comunitaria.',
    category: 'outdoors',
    activityType: 'senderismo',
    tags: ['costarica', 'puravida', 'arenal', 'volcan', 'ecoturismo', 'naturaleza'],
    daysFromNow: 9,
    time: '08:30',
    durationHours: 7,
    venue: 'Parque Nacional Volcán Arenal & Senderos de Lava',
    address: 'La Fortuna de San Carlos, Alajuela, Costa Rica',
    city: 'La Fortuna',
    country: 'Costa Rica',
    countryCode: 'CR',
    coordinates: [-84.6974, 10.4633],
    price: { amount: 9500, currency: 'CRC' },
    externalUrl: 'https://sinac.go.cr',
    imageUrl: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200&q=80'
  },
  {
    sourceId: 'global:pa-panama-canal-amador-feria-maritima',
    title: '🇵🇦 Panama Jazz Festival & Gran Concierto al Aire Libre en Amador',
    description: 'Música magistral junto a la entrada del Canal de Panamá. Clínicas de improvisación, conciertos de jazz latino y feria de comidas típicas en el Centro de Convenciones de Amador.',
    category: 'music',
    activityType: 'jam session',
    tags: ['panama', 'canal', 'jazz', 'amador', 'musica', 'caribe'],
    daysFromNow: 11,
    time: '17:00',
    durationHours: 5,
    venue: 'Centro de Convenciones de Amador (Panama Convention Center)',
    address: 'Calle Amador, Ciudad de Panamá',
    city: 'Ciudad de Panamá',
    country: 'Panamá',
    countryCode: 'PA',
    coordinates: [-79.5446, 8.9248],
    price: { amount: 20, currency: 'USD' },
    externalUrl: 'https://panamajazzfest.com',
    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80'
  },
  {
    sourceId: 'global:cu-la-habana-jazz-plaza-malecon-son',
    title: '🇨🇺 Festival Internacional Jazz Plaza & Noches de Son en La Habana',
    description: 'La tradición musical cubana en todo su esplendor. Descargas de latin jazz con maestros de la percusión en el Teatro Nacional y sesiones de son cubano a orillas del Malecón habanero.',
    category: 'music',
    activityType: 'concierto acústico',
    tags: ['cuba', 'lahabana', 'jazzplaza', 'soncubano', 'musica', 'malecon'],
    daysFromNow: 14,
    time: '20:00',
    durationHours: 4,
    venue: 'Teatro Nacional de Cuba - Sala Avellaneda',
    address: 'Plaza de la Revolución, La Habana',
    city: 'La Habana',
    country: 'Cuba',
    countryCode: 'CU',
    coordinates: [-82.3854, 23.1251],
    price: { amount: 15, currency: 'USD' },
    externalUrl: 'https://cuba.travel',
    imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80'
  },

  // ==========================================
  // 🇩🇰 DINAMARCA & 🇳🇴 NORUEGA & 🇫🇮 FINLANDIA
  // ==========================================
  {
    sourceId: 'global:dk-copenhagen-new-nordic-food-festival',
    title: '🇩🇰 Copenhagen Food & New Nordic Cuisine Harvest Festival',
    description: 'La meca gastronómica de Escandinavia. Talleres de fermentación nórdica, cocina estacional con productos de granja orgánica y degustaciones en el mercado de Torvehallerne.',
    category: 'food',
    activityType: 'mercado orgánico',
    tags: ['copenhague', 'dinamarca', 'gastronomia', 'nordic', 'food', 'michelin'],
    daysFromNow: 9,
    time: '12:00',
    durationHours: 6,
    venue: 'Torvehallerne KBH Market Square',
    address: 'Frederiksborggade 21, 1360 Copenhague',
    city: 'Copenhague',
    country: 'Dinamarca',
    countryCode: 'DK',
    coordinates: [12.5694, 55.6836],
    price: { amount: 120, currency: 'DKK' },
    externalUrl: 'https://cphfoodfest.dk',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80'
  },
  {
    sourceId: 'global:no-tromso-northern-lights-aurora-music',
    title: '🌌 Tromsø Northern Lights & Arctic Solstice Music Gathering',
    description: 'Bajo el cielo ártico iluminado por la aurora boreal. Conciertos de ambient acústico, avistamiento nocturno de auroras y relatos de la cultura tradicional Sami alrededor de fogatas.',
    category: 'science',
    activityType: 'observación astronómica',
    tags: ['tromso', 'noruega', 'auroraboreal', 'astronomia', 'nordic', 'solsticio'],
    daysFromNow: 6,
    time: '21:00',
    durationHours: 4,
    venue: 'Tromsø Kulturhus & Fjellheisen Cable Viewpoint',
    address: 'Sollivegen 12, 9020 Tromsdalen, Tromsø',
    city: 'Tromsø',
    country: 'Noruega',
    countryCode: 'NO',
    coordinates: [18.9868, 69.6468],
    price: { amount: 250, currency: 'NOK' },
    externalUrl: 'https://visittromso.no',
    imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1200&q=80'
  },
  {
    sourceId: 'global:fi-helsinki-slush-deeptech-ai-summit',
    title: '🇫🇮 Slush Helsinki: La Cumbre Mundial de Startups, DeepTech y Fundadores',
    description: 'El encuentro de emprendimiento más electrizante de Europa. Creadores de inteligencia artificial, robótica y computación cuántica se dan cita en el Centro de Convenciones Messukeskus.',
    category: 'technology',
    activityType: 'meetup de IA',
    tags: ['slush', 'helsinki', 'finlandia', 'startups', 'deeptech', 'ia', 'tech'],
    daysFromNow: 15,
    time: '09:00',
    durationHours: 9,
    venue: 'Messukeskus Helsinki Expo and Convention Centre',
    address: 'Messuaukio 1, 00520 Helsinki',
    city: 'Helsinki',
    country: 'Finlandia',
    countryCode: 'FI',
    coordinates: [24.9354, 60.2037],
    price: { amount: 350, currency: 'EUR' },
    externalUrl: 'https://slush.org',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
  },

  // ==========================================
  // 🎮 ESPORTS & 🐾 MASCOTAS Y BIENESTAR
  // ==========================================
  {
    sourceId: 'global:virtual-world-esports-grand-championship-arena',
    title: '🎮 World Esports Champions League: Finales Globales de League of Legends & CS2',
    description: 'La gran final de deportes electrónicos transmitida en 4K a todo el mundo. Comentaristas profesionales en vivo, sorteos interactivos para la comunidad y torneos comunitarios 1v1 en el chat.',
    category: 'gaming',
    activityType: 'torneo de ajedrez',
    tags: ['esports', 'gaming', 'lol', 'cs2', 'twitch', 'videojuegos', 'torneo', 'virtual'],
    daysFromNow: 4,
    time: '17:00',
    durationHours: 6,
    isVirtual: true,
    virtualLink: 'https://twitch.tv/worldesports-championship',
    venue: 'Global Esports Virtual Arena (Twitch & YouTube)',
    address: 'Plataforma Virtual EventNow',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9312, 18.4861],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://esportsarena.com',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80'
  },
  {
    sourceId: 'global:do-sd-world-pet-expo-agility-bienestar-canino',
    title: '🐾 Gran Festival de Mascotas, Circuito de Agility Canino & Adopción',
    description: 'El día dedicado a nuestros mejores amigos en el Parque Mirador Sur. Pista de obstáculos y agility para perros de todas las razas, chequeos veterinarios gratuitos, nutrición natural y feria de adopción responsable.',
    category: 'outdoors',
    activityType: 'picnic',
    tags: ['mascotas', 'perros', 'agility', 'adopcion', 'santodomingo', 'miradorsur', 'familia'],
    daysFromNow: 6,
    time: '15:30',
    durationHours: 4.5,
    venue: 'Parque Mirador Sur - Zona de Mascotas',
    address: 'Av. Anacaona, Mirador Sur, Santo Domingo',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9535, 18.4485],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://petfestivalcaribe.com',
    imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&q=80'
  }
];

class GlobalMetropolisAndNichesHarvester {
  async ensureCuratorUser() {
    let curator = await User.findOne({ username: 'eventnow_world_scout' });
    if (!curator) {
      curator = await User.findOne({ role: 'admin' });
    }
    if (!curator) {
      curator = await User.create({
        username: 'eventnow_world_scout',
        email: 'worldscout@eventnow.do',
        firstName: 'EventNow',
        lastName: 'Global Scout',
        role: 'organizer',
        isEmailVerified: true,
        verified: true,
        country: 'República Dominicana',
        countryCode: 'DO',
        bio: 'Radar Mundial de Exploración Cultural, Metrópolis Globales y Eventos Comunitarios de EventNow.'
      });
    }
    return curator;
  }

  calculateEventDates(daysFromNow, timeStr = '18:00', durationHours = 4) {
    const now = Date.now();
    const startDate = new Date(now + daysFromNow * 24 * 60 * 60 * 1000);
    const [hh, mm] = (timeStr || '18:00').split(':').map(Number);
    startDate.setHours(hh || 18, mm || 0, 0, 0);

    const endDate = new Date(startDate.getTime() + (durationHours || 4) * 60 * 60 * 1000);
    return { startDate, endDate };
  }

  async syncAll() {
    if (!demoCatalogEnabled()) return { ...DEMO_CATALOG_SKIP };
    const curator = await this.ensureCuratorUser();
    let created = 0;
    let updated = 0;

    for (const item of METROPOLIS_AND_NICHES_EVENTS) {
      try {
        const { startDate, endDate } = this.calculateEventDates(item.daysFromNow, item.time, item.durationHours);
        const spatial = computeH3Hierarchy(item.coordinates[1], item.coordinates[0]);

        const verifiedImageUrl = item.imageUrl || getCategoryFallbackImage({
          category: item.category,
          activityType: item.activityType,
          tags: item.tags,
          title: item.title,
          isVirtual: item.isVirtual
        });

        const docData = {
          title: item.title,
          description: item.description,
          category: item.category,
          activityType: item.activityType,
          tags: item.tags,
          date: startDate,
          endDate: endDate,
          status: 'published',
          isPublished: true,
          isPublic: true,
          isPrivate: false,
          isVirtual: Boolean(item.isVirtual),
          virtualLink: item.virtualLink || undefined,
          externalTicketUrl: item.externalUrl,
          imageUrl: verifiedImageUrl,
          coverImage: verifiedImageUrl,
          images: [{ url: verifiedImageUrl, alt: item.title }],
          location: {
            type: 'Point',
            coordinates: item.coordinates,
            venue: item.venue,
            address: item.address,
            city: item.city,
            country: item.country,
            countryCode: item.countryCode
          },
          price: item.price || { amount: 0, currency: item.countryCode === 'DO' ? 'DOP' : 'USD' },
          spatial: {
            h3_res7: spatial.h3_res7,
            h3_res8: spatial.h3_res8,
            h3_res9: spatial.h3_res9
          },
          publicSource: {
            platform: 'global_metropolis_harvester',
            originalId: item.sourceId,
            url: item.externalUrl,
            lastIngestedAt: new Date()
          },
          curatorVerified: true,
          editorialApproved: true,
          verified: true,
          createdBy: curator._id,
          organizer: curator._id
        };

        const existing = await Event.findOne({ 'publicSource.originalId': item.sourceId });
        if (existing) {
          await Event.updateOne({ _id: existing._id }, { $set: docData });
          updated++;
        } else {
          await Event.create(docData);
          created++;
        }
      } catch (err) {
        logger.error(`[GlobalMetropolis] Error processing event ${item.sourceId}:`, err.message);
      }
    }

    invalidateCache('/api/events*');
    logger.info(`[GlobalMetropolis] Synced successfully: created=${created}, updated=${updated}, total=${METROPOLIS_AND_NICHES_EVENTS.length}`);
    return { created, updated, total: METROPOLIS_AND_NICHES_EVENTS.length };
  }
}

module.exports = new GlobalMetropolisAndNichesHarvester();
