'use strict';

/**
 * actionSportsAndCraftsHarvester.js
 * ------------------------------------------------------------------
 * Automated Harvester for High-Adrenaline & Practical Community Events:
 * - 🏎️ Concesionarios, Monster Trucks, Drifting & Motor Expos
 * - 🌊 Jet Ski, Deportes Acuáticos & Adrenalina Marina
 * - 🏃 Running en Parques, Maratones 5K/10K & Clubes de Atletismo
 * - 🚴 Ciclismo Urbano, Bici-Rutas & Ciclovías
 * - 🛠️ Talleres de Oficios (Carpintería, Cerámica, Barismo, Reparación)
 * - 💻 Tecnología, Hackathons de IA & Streams Virtuales Globales
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { invalidateCache } = require('../../middleware/cache');
const { getCategoryFallbackImage } = require('../../utils/imageFallbacks');
const logger = require('../../utils/logger') || console;

const ACTION_CRAFTS_EVENTS = [
  // ==========================================
  // 🏎️ MONSTER TRUCKS, MOTOR & CONCESIONARIOS
  // ==========================================
  {
    sourceId: 'action:do-sd-monster-trucks-autodromo-las-americas',
    title: '🚛 Gran Show de Camiones Monster 4x4, Drifting & Freestyle Extremo',
    description: 'Espectáculo de adrenalina en el Autódromo Las Américas. Aplastamiento de autos con camiones gigantes Monster Truck, acrobacias en dos ruedas, exhibición de camionetas todoterreno modificadas y show de drifting.',
    category: 'sports',
    activityType: 'esports',
    tags: ['monstertruck', 'monster', 'autos', 'carreras', 'santodomingo', 'adrenalina', '4x4'],
    daysFromNow: 5,
    time: '17:00',
    durationHours: 4,
    venue: 'Autódromo Las Américas',
    address: 'Autopista Las Américas Km 16, Santo Domingo Este',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.7521, 18.4552],
    price: { amount: 500, currency: 'DOP' },
    externalUrl: 'https://autodromolasamericas.com',
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80'
  },
  {
    sourceId: 'action:do-sd-expo-concesionarios-autos-electricos',
    title: '🚗 Expo Concesionarios 2026: Autos Eléctricos, Superdeportivos & Test-Drive',
    description: 'La gran feria del automóvil en Santo Domingo. Concesionarios oficiales exhiben los modelos más recientes de vehículos eléctricos, híbridos y superdeportivos con pistas de prueba y opciones de financiamiento bancario.',
    category: 'business',
    activityType: 'feria de emprendedores',
    tags: ['concesionario', 'autos', 'vehiculoselectricos', 'testdrive', 'santodomingo', 'feria'],
    daysFromNow: 7,
    time: '10:00',
    durationHours: 8,
    venue: 'Centro de Convenciones Sans Soucí',
    address: 'Av. España, Puerto Sans Soucí, Santo Domingo Este',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.8789, 18.4682],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://sansouci.com.do',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80'
  },
  {
    sourceId: 'action:us-mia-monster-jam-hard-rock-stadium',
    title: '🔥 Monster Jam World Tour & Pit Party: Hard Rock Stadium',
    description: 'Los camiones monster más famosos del planeta (Grave Digger, Megalodon, Max-D) compiten en carreras de velocidad y piruetas aéreas de 12 metros de altura sobre colinas de tierra en Miami.',
    category: 'sports',
    activityType: 'esports',
    tags: ['monstertruck', 'monsterjam', 'miami', 'racing', 'trucks', 'hardrockstadium'],
    daysFromNow: 12,
    time: '19:00',
    durationHours: 3.5,
    venue: 'Hard Rock Stadium',
    address: '347 Don Shula Dr, Miami Gardens, FL',
    city: 'Miami',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-80.2389, 25.9580],
    price: { amount: 35, currency: 'USD' },
    externalUrl: 'https://hardrockstadium.com',
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80'
  },

  // ==========================================
  // 🌊 JET SKI & DEPORTES ACUÁTICOS
  // ==========================================
  {
    sourceId: 'action:do-boca-chica-torneo-jet-ski-velocidad',
    title: '🌊 Gran Torneo Nacional de Velocidad en Jet Ski & Slalom Acuático',
    description: 'Competencia abierta de motos acuáticas y Jet Ski en las aguas turquesas de Boca Chica. Categorías novatos, expertos y circuito de slalom con boyas flotantes y seguridad de salvavidas y Politur.',
    category: 'sports',
    activityType: 'surf',
    tags: ['jetski', 'motosacuaticas', 'agua', 'deportes', 'bocachica', 'velocidad', 'playa'],
    daysFromNow: 6,
    time: '10:30',
    durationHours: 5,
    venue: 'Playa de Boca Chica (Zona Los Caracoles)',
    address: 'Calle Duarte frente a la Bahía, Boca Chica',
    city: 'Boca Chica',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.6083, 18.4489],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://godominicanrepublic.com',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80'
  },
  {
    sourceId: 'action:us-mia-biscayne-bay-jetski-championship',
    title: '🚤 Miami Biscayne Bay Jet Ski Race & Water Sports Festival',
    description: 'Encuentro acuático en la bahía de Biscayne. Exhibiciones de flyboard, regata de motos acuáticas de alta cilindrada y clínicas gratuitas de seguridad marítima.',
    category: 'sports',
    activityType: 'surf',
    tags: ['jetski', 'watersports', 'miami', 'biscayne', 'ocean', 'florida'],
    daysFromNow: 8,
    time: '11:00',
    durationHours: 6,
    venue: 'Rickenbacker Marina / Key Biscayne',
    address: '3301 Rickenbacker Causeway, Key Biscayne, FL',
    city: 'Miami',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-80.1772, 25.7483],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://miamiandbeaches.com',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80'
  },

  // ==========================================
  // 🏃 RUNNING EN EL PARQUE & MARATONES 5K/10K
  // ==========================================
  {
    sourceId: 'action:do-sd-carrera-5k-10k-mirador-sur',
    title: '🏃 Carrera 5K & 10K Saludable del Parque Mirador Sur (Km 0)',
    description: 'Convocatoria matutina abierta para corredores, caminantes y familias en la Avenida de la Salud del Mirador Sur. Puntos de hidratación cada kilómetro, calentamiento guiado con música y medallas conmemorativas.',
    category: 'sports',
    activityType: 'running club',
    tags: ['running', '5k', '10k', 'carrera', 'miradorsur', 'santodomingo', 'salud'],
    daysFromNow: 3,
    time: '06:30',
    durationHours: 3,
    venue: 'Parque Mirador Sur (Área Km 0)',
    address: 'Av. de la Salud con Av. Jiménez Moya',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9467, 18.4485],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://santodomingocorre.com',
    imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80'
  },
  {
    sourceId: 'action:es-mad-retiro-morning-10k-running',
    title: '🏅 Retiro Morning 10K Running Club & Entrenamiento Funcional',
    description: 'Quedada popular de corredores en el Parque de El Retiro de Madrid. Grupos por ritmo (4:30, 5:00, 5:30 y 6:00 min/km), vuelta al estanque grande y estiramientos dirigidos por fisioterapeutas.',
    category: 'sports',
    activityType: 'running club',
    tags: ['running', 'retiro', 'madrid', '10k', 'deporte', 'espana', 'gratis'],
    daysFromNow: 4,
    time: '08:00',
    durationHours: 2.5,
    venue: 'Monumento a Alfonso XII (Parque de El Retiro)',
    address: 'Paseo de Colombia, Retiro',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.6828, 40.4180],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://madrid.es',
    imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80'
  },
  {
    sourceId: 'action:us-nyc-central-park-loop-5k',
    title: '🏃 Central Park Loop 5K Sunrise Community Run',
    description: 'Encuentro ciudadano al amanecer para recorrer los 5 kilómetros del Lower Loop de Central Park. Ritmo social inclusivo, apto para corredores de todos los niveles y trote con mascotas con correa.',
    category: 'sports',
    activityType: 'running club',
    tags: ['running', 'centralpark', 'nyc', '5k', 'fitness', 'newyork', 'free'],
    daysFromNow: 6,
    time: '07:00',
    durationHours: 2,
    venue: 'Central Park Sheep Meadow',
    address: 'Central Park West & 66th St, Manhattan, NY',
    city: 'New York',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-73.9744, 40.7711],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://centralparknyc.org',
    imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80'
  },

  // ==========================================
  // 🚴 CICLISMO URBANO & RUTAS EN BICICLETA
  // ==========================================
  {
    sourceId: 'action:do-sd-ruta-bici-coro-malecon-colonial',
    title: '🚴 Gran Bici-Ruta Comunitaria & Paseo Nocturno: Malecón & Zona Colonial',
    description: 'Paseo en bicicleta seguro y recreativo iluminado con luces LED. Recorrido costero desde el Obelisco Macho por el Malecón hasta la Plaza de España en la Zona Colonial. Abierto a bicicletas de ruta, mountain bike y fixies.',
    category: 'outdoors',
    activityType: 'ciclismo',
    tags: ['ciclismo', 'bicicleta', 'bici', 'malecon', 'santodomingo', 'comunidad', 'gratis'],
    daysFromNow: 5,
    time: '19:30',
    durationHours: 3,
    venue: 'Parque Cervantes (Av. George Washington)',
    address: 'Av. George Washington con Calle Cervantes, Gazcue',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.8995, 18.4632],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://godominicanrepublic.com',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80'
  },
  {
    sourceId: 'action:co-bog-ciclovia-septima-dominical',
    title: '🚴 Ciclovía Dominical de Bogotá: Recorrido Abierto Carrera Séptima',
    description: 'La ciclovía más emblemática del mundo abre más de 120 kilómetros de calles libres de automóviles para ciclistas, patinadores y peatones desde el centro histórico hasta Usaquén.',
    category: 'outdoors',
    activityType: 'ciclismo',
    tags: ['ciclovia', 'bogota', 'bicicleta', 'colombia', 'airelibre', 'gratis'],
    daysFromNow: 3,
    time: '07:30',
    durationHours: 6,
    venue: 'Carrera Séptima con Calle 26 (Parque de la Independencia)',
    address: 'Carrera 7 # 26-00, Santa Fe',
    city: 'Bogotá',
    country: 'Colombia',
    countryCode: 'CO',
    coordinates: [-74.0689, 4.6152],
    price: { amount: 0, currency: 'COP' },
    externalUrl: 'https://idrd.gov.co',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80'
  },

  // ==========================================
  // 🛠️ TALLERES DE OFICIOS & WORKSHOPS PRÁCTICOS
  // ==========================================
  {
    sourceId: 'action:do-sd-taller-carpinteria-creativa-madera',
    title: '🪵 Taller Práctico de Carpintería Creativa & Construcción de Muebles',
    description: 'Aprende el uso seguro de sierras, cepillos, lijadoras y técnicas de ensamble de madera maciza en un taller profesional en Gazcue. Cada participante fabrica y se lleva a casa una mesa auxiliar de roble.',
    category: 'workshop',
    activityType: 'carpintería',
    tags: ['workshop', 'taller', 'carpinteria', 'madera', 'oficio', 'santodomingo', 'hazlotumismo'],
    daysFromNow: 7,
    time: '15:00',
    durationHours: 4,
    venue: 'Espacio Creativo Taller Gazcue',
    address: 'Calle Santiago 158, Gazcue',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9052, 18.4688],
    price: { amount: 1200, currency: 'DOP' },
    externalUrl: 'https://tallercreativo.do',
    imageUrl: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80'
  },
  {
    sourceId: 'action:es-mad-taller-ceramica-torno-raku',
    title: '🏺 Masterclass de Cerámica en Torno & Esmaltado Japonés Raku',
    description: 'Taller práctico de alfarería en el Barrio de las Letras de Madrid. Modelado en torno eléctrico tradicional, aplicación de esmaltes de óxidos minerales y cocción rápida a fuego directo.',
    category: 'workshop',
    activityType: 'cerámica',
    tags: ['ceramica', 'taller', 'madrid', 'artesania', 'alfareria', 'letras'],
    daysFromNow: 9,
    time: '17:00',
    durationHours: 3.5,
    venue: 'Estudio de Cerámica Huertas',
    address: 'Calle de las Huertas 42, Barrio de las Letras',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.6989, 40.4132],
    price: { amount: 35, currency: 'EUR' },
    externalUrl: 'https://ceramica-madrid.es',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80'
  },
  {
    sourceId: 'action:do-sti-taller-barismo-cafe-especialidad',
    title: '☕ Taller de Barismo Profesional, Catación de Café Especial & Latte Art',
    description: 'En el corazón de Santiago de los Caballeros. Domina la molienda precisa, extracción de espresso perfecto en máquina comercial, vaporización de leche para latte art y cata sensorial de cafés de altura de Jarabacoa.',
    category: 'food',
    activityType: 'cocina local',
    tags: ['barista', 'cafe', 'taller', 'santiago', 'latteart', 'gastronomia'],
    daysFromNow: 8,
    time: '16:00',
    durationHours: 3.5,
    venue: 'Academia del Café Dominicano (Santiago)',
    address: 'Calle Del Sol esq. San Luis, Los Pepines',
    city: 'Santiago de los Caballeros',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-70.6970, 19.4517],
    price: { amount: 850, currency: 'DOP' },
    externalUrl: 'https://cafedominicano.do',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80'
  },

  // ==========================================
  // 💻 TECNOLOGÍA & EVENTOS VIRTUALES GLOBALES
  // ==========================================
  {
    sourceId: 'action:virtual-global-ai-hackathon-open-models',
    title: '🌐 Global Virtual AI Hackathon: Building with Open Models & Autonomous Agents',
    description: 'Hackathon internacional 100% virtual abierto a desarrolladores de todo el mundo. Desarrollo de aplicaciones de impacto con agentes de IA autónomos, mentorías en streaming por Twitch/Discord y premios en computación en la nube.',
    category: 'technology',
    activityType: 'hackathon',
    tags: ['hackathon', 'virtual', 'ai', 'programacion', 'desarrolladores', 'streaming'],
    daysFromNow: 4,
    time: '14:00',
    durationHours: 12,
    venue: 'Transmisión Global en Vivo (Twitch & Discord Stage)',
    address: 'Plataforma Virtual Interactiva EventNow',
    city: 'Global Virtual Stage',
    country: 'En Línea',
    countryCode: 'DO',
    coordinates: [-69.9312, 18.4861],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://twitch.tv',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
    isVirtual: true,
    eventType: 'virtual',
    virtualPlatform: 'twitch',
    virtualLink: 'https://twitch.tv/eventnow_live',
    virtualDetails: {
      isStream: true,
      isWorkshop: true,
      streamEmbedUrl: 'https://player.twitch.tv/?channel=eventnow_live&parent=localhost'
    }
  },
  {
    sourceId: 'action:virtual-cloud-architecture-masterclass',
    title: '☁️ Masterclass Virtual: Arquitectura Cloud de Alta Disponibilidad & Docker',
    description: 'Webinar técnico interactivo para ingenieros de software y DevOps. Estrategias de escalabilidad horizontal en Kubernetes, optimización de latencia en bases de datos distribuidas y CI/CD con preguntas en vivo por chat.',
    category: 'technology',
    activityType: 'charla abierta',
    tags: ['devops', 'cloud', 'docker', 'webinar', 'virtual', 'tecnologia', 'gratis'],
    daysFromNow: 6,
    time: '18:00',
    durationHours: 2.5,
    venue: 'Sala Virtual Zoom & YouTube Live',
    address: 'Transmisión Online Simultánea',
    city: 'Global Virtual Stage',
    country: 'En Línea',
    countryCode: 'DO',
    coordinates: [-69.9312, 18.4861],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://youtube.com',
    imageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&q=80',
    isVirtual: true,
    eventType: 'virtual',
    virtualPlatform: 'youtube_live',
    virtualLink: 'https://youtube.com/live/eventnow_cloud',
    virtualDetails: {
      isStream: true,
      isWebinar: true,
      streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/live_stream'
    }
  }
];

/**
 * Seeds and maintains action sports, motor, running, crafts & virtual events.
 */
async function syncActionSportsAndCrafts({ dryRun = false } = {}) {
  try {
    let curator = await User.findOne({ username: 'eventnow_oficial' }) || await User.findOne({ role: 'admin' }) || await User.findOne();
    if (!curator) {
      logger.warn?.('[ActionSportsCrafts] No curator found to seed events.');
      return { success: false, reason: 'no_curator' };
    }

    let created = 0;
    let updated = 0;

    for (const item of ACTION_CRAFTS_EVENTS) {
      const now = new Date();
      const startDate = new Date(now.getTime() + item.daysFromNow * 86400000);
      const [h, m] = (item.time || '10:00').split(':').map(Number);
      startDate.setHours(h || 10, m || 0, 0, 0);

      const endDate = new Date(startDate.getTime() + (item.durationHours || 3) * 3600000);

      const lat = item.coordinates[1];
      const lng = item.coordinates[0];
      const h3Index = computeH3Hierarchy(lat, lng);

      if (dryRun) continue;

      const fallbackImg = getCategoryFallbackImage({
        category: item.category,
        activityType: item.activityType,
        tags: item.tags,
        title: item.title,
        isVirtual: item.isVirtual
      });

      const eventData = {
        title: item.title,
        description: item.description,
        category: item.category,
        activityType: item.activityType,
        tags: item.tags,
        date: startDate,
        startDate,
        endDate,
        time: item.time,
        price: item.price,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
          address: item.address,
          venue: item.venue,
          city: item.city,
          country: item.country,
          countryCode: item.countryCode
        },
        status: 'published',
        createdBy: curator._id,
        organizer: curator._id,
        source: 'planetary_catalog',
        sourceId: item.sourceId,
        externalUrl: item.externalUrl,
        images: [{ url: item.imageUrl || fallbackImg, caption: item.title }],
        h3: h3Index,
        isSoloFriendly: true,
        isVirtual: Boolean(item.isVirtual),
        eventType: item.eventType || (item.isVirtual ? 'virtual' : 'in_person'),
        virtualPlatform: item.virtualPlatform || 'custom',
        virtualLink: item.virtualLink,
        virtualDetails: item.virtualDetails,
        imported: true,
        importedAt: new Date()
      };

      const existing = await Event.findOne({ sourceId: item.sourceId });
      if (existing) {
        await Event.updateOne({ _id: existing._id }, { $set: eventData });
        updated++;
      } else {
        await Event.create(eventData);
        created++;
      }
    }

    try { invalidateCache('events:*'); } catch {}
    logger.info?.(`[ActionSportsCrafts] Synced successfully: created=${created}, updated=${updated}, total=${ACTION_CRAFTS_EVENTS.length}`);
    return { success: true, created, updated, total: ACTION_CRAFTS_EVENTS.length };
  } catch (err) {
    logger.error?.('[ActionSportsCrafts] Error syncing action sports and crafts events:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { syncActionSportsAndCrafts, ACTION_CRAFTS_EVENTS };
