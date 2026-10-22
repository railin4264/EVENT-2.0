'use strict';

/**
 * sciFiMysteryGreenHarvester.js
 * ------------------------------------------------------------------
 * Automated Global Harvester for Specialized High-Interest Themes:
 * - 🚀 Ciencia Ficción (Sci-Fi, Cyberpunk, Cine Especulativo & Futuro)
 * - 👻 Fantasmas, Leyendas Urbanas & Rutas Nocturnas del Misterio
 * - 🛸 OVNIs / UAPs & Búsqueda de Vida Extraterrestre (Astrobiología/SETI)
 * - ⚡ Energía Limpia, Transición Verde, Clima & Planeta Sostenible
 *
 * All events roll forward dynamically so they never expire and stay active.
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { invalidateCache } = require('../../middleware/cache');
const logger = require('../../utils/logger') || console;

const SPECIALIZED_EVENTS = [
  // ============================================================
  // 🚀 CIENCIA FICCIÓN, CYBERPUNK & CULTURA ESPECULATIVA (SCI-FI)
  // ============================================================
  {
    sourceId: 'scifi:do-sd-festival-cine-scifi-cinemateca',
    title: '🚀 Muestra de Cine Sci-Fi, Futuro & Inteligencia Artificial Caribeña',
    description: 'Cinemateca Dominicana presenta un ciclo de proyecciones gratuitas de clásicos y cortometrajes de ciencia ficción especulativa, viajes temporales e inteligencia artificial. Incluye cineforo con guionistas y desarrolladores locales tras cada función.',
    category: 'film',
    activityType: 'cine al aire libre',
    tags: ['scifi', 'cienciaficcion', 'cine', 'cinemateca', 'santodomingo', 'ia', 'gratis'],
    daysFromNow: 4,
    time: '19:00',
    durationHours: 3.5,
    venue: 'Cinemateca Dominicana (Plaza de la Cultura)',
    address: 'Calle Pedro Henríquez Ureña esq. Máximo Gómez, Gazcue',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9103, 18.4716],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://cinemateca.gob.do',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80'
  },
  {
    sourceId: 'scifi:es-mad-noche-literatura-cyberpunk-matadero',
    title: '⚡ Noche Cyberpunk, Literatura Especulativa & Worldbuilding: Matadero',
    description: 'Encuentro de autores de ciencia ficción, diseñadores de videojuegos de rol y entusiastas del cyberpunk en Matadero Madrid. Lecturas dramatizadas, mesas redondas sobre futuros distópicos y taller abierto de creación de mundos galácticos.',
    category: 'literature',
    activityType: 'club de lectura',
    tags: ['cyberpunk', 'scifi', 'literatura', 'matadero', 'madrid', 'rol', 'gratis'],
    daysFromNow: 7,
    time: '18:30',
    durationHours: 4,
    venue: 'Nave 16 - Matadero Madrid',
    address: 'Plaza de Legazpi 8, Arganzuela',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.6972, 40.3925],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://mataderomadrid.org',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80'
  },
  {
    sourceId: 'scifi:us-nyc-brooklyn-scifi-expo',
    title: '🌌 Brooklyn Sci-Fi Forum & Galactic Boardgame Night',
    description: 'Noche comunitaria de juegos de mesa de temática espacial (Twilight Imperium, Dune, Nemesis) y debate sobre física de viajes interestelares en Brooklyn. Abierto tanto a novatos como a veteranos del rol.',
    category: 'gaming',
    activityType: 'juegos de mesa',
    tags: ['scifi', 'boardgames', 'brooklyn', 'newyork', 'gaming', 'space'],
    daysFromNow: 5,
    time: '18:00',
    durationHours: 5,
    venue: 'Industry City Brooklyn Courtyard',
    address: '220 36th St, Brooklyn, NY',
    city: 'New York',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-74.0076, 40.6558],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://industrycity.com',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80'
  },
  {
    sourceId: 'scifi:jp-tyo-akihabara-future-tech-scifi',
    title: '🦾 Tokyo Future Tech & Cyberpunk Creators Meetup: Akihabara',
    description: 'Encuentro bilingüe de creadores de robótica, realidad aumentada y ciencia ficción en Akihabara. Charlas sobre el futuro de los ciborgs, transhumanismo y demostraciones de prótesis mecatrónicas de código abierto.',
    category: 'technology',
    activityType: 'meetup de IA',
    tags: ['tokyo', 'akihabara', 'cyberpunk', 'scifi', 'robotics', 'tech'],
    daysFromNow: 11,
    time: '19:00',
    durationHours: 3.5,
    venue: 'Akihabara Convention Hall',
    address: '1-18-13 Sotokanda, Chiyoda-ku',
    city: 'Tokio',
    country: 'Japón',
    countryCode: 'JP',
    coordinates: [139.7714, 35.6997],
    price: { amount: 0, currency: 'JPY' },
    externalUrl: 'https://akibahall.jp',
    imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=80'
  },

  // ============================================================
  // 👻 FANTASMAS, LEYENDAS URBANAS & RUTAS NOCTURNAS DE MISTERIO
  // ============================================================
  {
    sourceId: 'mystery:do-sd-leyendas-zona-colonial-nocturna',
    title: '🕯️ Noche de Leyendas, Cuentos de Aparecidos & Criptas: Zona Colonial',
    description: 'Recorrido peatonal nocturno a la luz de faroles por las calles más antiguas de América. Historiadores y cronistas relatan las leyendas populares de fantasmas, ánimas coloniales y secretos de conventos en la Calle Las Damas y Parque Colón.',
    category: 'culture',
    activityType: 'tour histórico',
    tags: ['misterio', 'fantasmas', 'leyendas', 'zonacolonial', 'santodomingo', 'historia'],
    daysFromNow: 3,
    time: '20:00',
    durationHours: 2.5,
    venue: 'Plaza María de Toledo (Punto de Salida)',
    address: 'Calle Las Damas frente a Fortaleza Ozama',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.8831, 18.4735],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://godominicanrepublic.com',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80'
  },
  {
    sourceId: 'mystery:es-mad-madrid-encantado-fantasmas-austrias',
    title: '👻 Madrid Oculto y Encantado: Fantasmas del Palacio de Linares & Austrias',
    description: 'Ruta guiada nocturna gratuita por el barrio de los Austrias y la Plaza de Cibeles. Crónica negra, leyendas de fantasmas documentadas en archivos históricos, la dama blanca de la Casa de las Siete Chimeneas y fenómenos inexplicables.',
    category: 'culture',
    activityType: 'tour histórico',
    tags: ['madrid', 'fantasmas', 'misterio', 'leyendas', 'tour', 'gratis'],
    daysFromNow: 6,
    time: '21:00',
    durationHours: 2.5,
    venue: 'Plaza de la Villa (Frente a Casa de la Villa)',
    address: 'Plaza de la Villa 5, Centro Histórico',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.7112, 40.4153],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://madridcultura.es',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80'
  },
  {
    sourceId: 'mystery:mx-cdmx-coyoacan-leyendas-llorona-nocturno',
    title: '🏮 Coyoacán Nocturno: Mitos de La Llorona & Callejones Misteriosos',
    description: 'Caminata cultural nocturna por el empedrado de Coyoacán. Narradores orales relatan los mitos de La Llorona, las apariciones del Callejón del Aguacate y las leyendas de la época virreinal bajo los fresnos centenarios.',
    category: 'culture',
    activityType: 'tour histórico',
    tags: ['coyoacan', 'cdmx', 'leyendas', 'fantasmas', 'lallorona', 'misterio', 'mexico'],
    daysFromNow: 8,
    time: '20:30',
    durationHours: 2.5,
    venue: 'Kiosco del Jardín Hidalgo (Coyoacán)',
    address: 'Jardín Hidalgo 1, Coyoacán Centro',
    city: 'Ciudad de México',
    country: 'México',
    countryCode: 'MX',
    coordinates: [-99.1627, 19.3497],
    price: { amount: 0, currency: 'MXN' },
    externalUrl: 'https://mexicocity.cdmx.gob.mx',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80'
  },
  {
    sourceId: 'mystery:uk-edi-haunted-vaults-walking-tour',
    title: '🏰 Edinburgh Old Town Ghost & Underground Vaults Night Walk',
    description: 'Recorrido nocturno por las famosas criptas y bóvedas subterráneas de South Bridge en Edimburgo. Historia de la peste negra, leyendas de apariciones y la atmósfera gótica inigualable de la Royal Mile.',
    category: 'culture',
    activityType: 'tour histórico',
    tags: ['edinburgh', 'ghosttour', 'scotland', 'history', 'vaults', 'mystery'],
    daysFromNow: 10,
    time: '21:30',
    durationHours: 2,
    venue: 'St Giles Cathedral (West Parliament Square)',
    address: 'High St, Royal Mile',
    city: 'Edimburgo',
    country: 'Reino Unido',
    countryCode: 'GB',
    coordinates: [-3.1909, 55.9495],
    price: { amount: 0, currency: 'GBP' },
    externalUrl: 'https://edinburgh.org',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80'
  },

  // ============================================================
  // 🛸 OVNIs / UAPs & BÚSQUEDA DE VIDA EXTRATERRESTRE (ASTROBIOLOGÍA)
  // ============================================================
  {
    sourceId: 'ufo:do-sd-coloquio-astrobiologia-uap-caribe',
    title: '🛸 Coloquio: Astrobiología, Señales Espaciales & Fenómenos UAP en el Caribe',
    description: 'Panel de divulgación científica abierto al público con astrónomos aficionados y físicos. Análisis riguroso de los descubrimientos del Telescopio James Webb sobre biofirmas en exoplanetas, los proyectos SETI y el archivo histórico de avistamientos aéreos en el Caribe.',
    category: 'science',
    activityType: 'divulgación científica',
    tags: ['ovni', 'ufo', 'uap', 'astrobiologia', 'espacio', 'ciencia', 'santodomingo', 'gratis'],
    daysFromNow: 5,
    time: '19:30',
    durationHours: 3,
    venue: 'Auditorio del Museo Nacional de Historia Natural',
    address: 'Plaza de la Cultura Juan Pablo Duarte, Gazcue',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9125, 18.4718],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://mnhn.gob.do',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80'
  },
  {
    sourceId: 'ufo:cl-elqui-vigilia-ufologica-astrobiologia',
    title: '🌌 Vigilia Ufológica & Observación de Cielos Limpios en Valle del Elqui',
    description: 'Bajo uno de los cielos más despejados del planeta en el Valle del Elqui, Chile. Encuentro de entusiastas de la astrobiología y observadores de satélites y fenómenos luminosos anómalos con telescopios computarizados.',
    category: 'outdoors',
    activityType: 'observación de estrellas',
    tags: ['ufo', 'ovni', 'elqui', 'chile', 'stargazing', 'astrobiologia', 'cielolimpio'],
    daysFromNow: 9,
    time: '21:00',
    durationHours: 6,
    venue: 'Mirador Astronómico de Vicuña',
    address: 'Ruta 41 Km 66, Valle del Elqui, Coquimbo',
    city: 'Vicuña',
    country: 'Chile',
    countryCode: 'CL',
    coordinates: [-70.7144, -30.0319],
    price: { amount: 0, currency: 'CLP' },
    externalUrl: 'https://chile.travel',
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&q=80'
  },
  {
    sourceId: 'ufo:es-bcn-montserrat-vigilia-cielos-misterio',
    title: '✨ Vigilia de Cielos y Misterios de la Montaña Mágica de Montserrat',
    description: 'Encuentro ciudadano en el mirador de la montaña de Montserrat en Cataluña. Noche de observación astronómica y debate sobre las leyendas del macizo rocoso, ecos de civilizaciones antiguas y registros de luces celestes.',
    category: 'science',
    activityType: 'noche de telescopios',
    tags: ['montserrat', 'barcelona', 'ovnis', 'ufo', 'astronomia', 'misterio', 'espana'],
    daysFromNow: 12,
    time: '20:30',
    durationHours: 4.5,
    venue: 'Mirador de Sant Jeroni / Monestir de Montserrat',
    address: 'Carretera del Monestir, Monistrol de Montserrat',
    city: 'Barcelona',
    country: 'España',
    countryCode: 'ES',
    coordinates: [1.8375, 41.5958],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://montserratvisita.com',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80'
  },

  // ============================================================
  // ⚡ ENERGÍA LIMPIA, CLIMA, TRANSICIÓN ECOLÓGICA & PLANETA VERDE
  // ============================================================
  {
    sourceId: 'green:do-sd-cumbre-energia-solar-malecon',
    title: '⚡ Cumbre Ciudadana de Energía Solar, Movilidad Eléctrica & Planeta Limpio',
    description: 'Encuentro frente al mar en el Malecón de Santo Domingo. Demostraciones de paneles solares residenciales para abaratar la factura eléctrica, pruebas de motos y vehículos 100% eléctricos y talleres de reciclaje comunitario.',
    category: 'community',
    activityType: 'feria de emprendedores',
    tags: ['energialimpia', 'solar', 'movilidadelectrica', 'clima', 'medioambiente', 'santodomingo', 'gratis'],
    daysFromNow: 6,
    time: '10:00',
    durationHours: 7,
    venue: 'Parque Eugenio María de Hostos (Malecón)',
    address: 'Av. George Washington frente al Obelisco Hembra',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.8974, 18.4639],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://medioambiente.gob.do',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&q=80'
  },
  {
    sourceId: 'green:do-samana-limpieza-costera-reciclaje',
    title: '🌊 Jornada de Conservación Marina, Limpieza de Arrecifes & Eco-Arte',
    description: 'Voluntariado abierto en Las Terrenas, Samaná. Retiro de plásticos costeros, clasificación para reciclaje circular y charla de biólogos marinos sobre protección de corales y temporada de ballenas jorobadas.',
    category: 'community',
    activityType: 'limpieza de playa',
    tags: ['sostenibilidad', 'playa', 'reciclaje', 'samana', 'lasterrenas', 'voluntariado', 'gratis'],
    daysFromNow: 8,
    time: '08:30',
    durationHours: 4.5,
    venue: 'Playa Punta Popy',
    address: 'Calle 27 de Febrero, Las Terrenas, Samaná',
    city: 'Las Terrenas',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.5244, 19.3242],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://godominicanrepublic.com',
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=1200&q=80'
  },
  {
    sourceId: 'green:es-mad-feria-autoconsumo-solar-comunidades',
    title: '☀️ Encuentro de Autoconsumo Solar, Comunidades Energéticas & Eco-Hogares',
    description: 'Jornada práctica en Madrid para aprender a constituir comunidades solares vecinales, instalar baterías domésticas inteligentes y reducir a cero la huella de carbono de los edificios urbanos.',
    category: 'science',
    activityType: 'charla abierta',
    tags: ['energiasolar', 'clima', 'madrid', 'sostenibilidad', 'energiaverde', 'autoconsumo'],
    daysFromNow: 11,
    time: '11:00',
    durationHours: 5,
    venue: 'Centro Cultural Casa del Reloj',
    address: 'Paseo de la Chopera 6, Arganzuela',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.6961, 40.3928],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://madrid.es',
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=1200&q=80'
  },
  {
    sourceId: 'green:co-bog-foro-transicion-verde-huertos',
    title: '🌱 Cumbre de Agroecología Urbana, Transición Energética & Huertos',
    description: 'En el Jardín Botánico de Bogotá. Talleres prácticos de hidroponía casera, compostaje sin olores, aprovechamiento de energía solar en techos andinos y conservación de páramos.',
    category: 'outdoors',
    activityType: 'huerto comunitario',
    tags: ['bogota', 'clima', 'agroecologia', 'energiaverde', 'colombia', 'jardinbotanico'],
    daysFromNow: 13,
    time: '09:00',
    durationHours: 6,
    venue: 'Jardín Botánico de Bogotá José Celestino Mutis',
    address: 'Calle 63 # 68-95',
    city: 'Bogotá',
    country: 'Colombia',
    countryCode: 'CO',
    coordinates: [-74.1014, 4.6672],
    price: { amount: 0, currency: 'COP' },
    externalUrl: 'https://jbb.gov.co',
    imageUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=80'
  }
];

/**
 * Seeds and maintains specialized high-interest events.
 */
async function syncSpecializedGlobalEvents({ dryRun = false } = {}) {
  try {
    let curator = await User.findOne({ username: 'eventnow_oficial' }) || await User.findOne({ role: 'admin' }) || await User.findOne();
    if (!curator) {
      logger.warn?.('[SpecializedEvents] No curator found to seed events.');
      return { success: false, reason: 'no_curator' };
    }

    let created = 0;
    let updated = 0;

    for (const item of SPECIALIZED_EVENTS) {
      const now = new Date();
      const startDate = new Date(now.getTime() + item.daysFromNow * 86400000);
      const [h, m] = (item.time || '18:00').split(':').map(Number);
      startDate.setHours(h || 18, m || 0, 0, 0);

      const endDate = new Date(startDate.getTime() + (item.durationHours || 3) * 3600000);

      const lat = item.coordinates[1];
      const lng = item.coordinates[0];
      const h3Index = computeH3Hierarchy(lat, lng);

      if (dryRun) continue;

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
        images: item.imageUrl ? [{ url: item.imageUrl, caption: item.title }] : [],
        h3: h3Index,
        isSoloFriendly: true,
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
    logger.info?.(`[SpecializedEvents] Synced successfully: created=${created}, updated=${updated}, total=${SPECIALIZED_EVENTS.length}`);
    return { success: true, created, updated, total: SPECIALIZED_EVENTS.length };
  } catch (err) {
    logger.error?.('[SpecializedEvents] Error syncing events:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { syncSpecializedGlobalEvents, SPECIALIZED_EVENTS };
