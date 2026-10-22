'use strict';

/**
 * astronomyEventsHarvester.js
 * ------------------------------------------------------------------
 * Automated Celestial & Natural Events Harvester for EventNow 2.0.
 * Ingests and maintains free astronomical events:
 * - Meteor Showers (Perseids, Geminids, Orionids)
 * - Supermoons, Planetary Oppositions (Saturn, Jupiter)
 * - Community Telescope Nights in prime urban & mountain sky viewpoints
 *
 * Category: 'science' & 'outdoors'. Price: 100% Free / $0.
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { invalidateCache } = require('../../middleware/cache');
const logger = require('../../utils/logger') || console;
const { demoCatalogEnabled, DEMO_CATALOG_SKIP } = require('./demoCatalogGuard');

const ASTRONOMY_EVENTS = [
  // ==========================================
  // REPÚBLICA DOMINICANA (DO)
  // ==========================================
  {
    sourceId: 'astro:do-sd-lluvia-meteoros-mirador-sur',
    title: '🌠 Gran Noche de Meteoros & Observación con Telescopios: Mirador Sur',
    description: 'Encuentro ciudadano gratuito bajo las estrellas en el Parque Mirador Sur (Km 0). Convocatoria comunitaria con telescopios de gran apertura para observar el pico de la lluvia de estrellas, cráteres lunares y satélites en órbita. Trae tu esterilla o manta.',
    category: 'science',
    activityType: 'noche de telescopios',
    tags: ['astronomia', 'estrellas', 'meteoros', 'miradorsur', 'santodomingo', 'gratis'],
    daysFromNow: 3,
    time: '20:30',
    durationHours: 4,
    venue: 'Parque Mirador Sur (Área Km 0)',
    address: 'Av. Anacaona con Av. Jiménez Moya, Mirador Sur',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9467, 18.4485],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://nasa.gov',
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&q=80'
  },
  {
    sourceId: 'astro:do-jar-noche-astronomica-montana',
    title: '🌌 Campamento Stargazing en Jarabacoa: Vía Láctea & Cielo Profundo',
    description: 'Noche de astrofotografía y observación de cielo profundo en las alturas de Jarabacoa, libre de contaminación lumínica urbana. Observación de la Vía Láctea, nebulosas de verano y cúmulos globulares con astrónomos aficionados dominicanos.',
    category: 'outdoors',
    activityType: 'observación de estrellas',
    tags: ['jarabacoa', 'stargazing', 'vialactea', 'montaña', 'astronomia', 'ecoturismo'],
    daysFromNow: 8,
    time: '19:30',
    durationHours: 6,
    venue: 'Mirador de la Montaña Jarabacoa',
    address: 'Carretera Manabao Km 7, Cordillera Central',
    city: 'Jarabacoa',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-70.6583, 19.1128],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://godominicanrepublic.com',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80'
  },

  // ==========================================
  // ESPAÑA (ES)
  // ==========================================
  {
    sourceId: 'astro:es-mad-oposicion-saturno-debod',
    title: '🪐 Noche de los Anillos de Saturno: Observación Abierta en Templo de Debod',
    description: 'Encuentro astronómico popular junto al Templo de Debod en Madrid. Astrónomos voluntarios instalan baterías de telescopios refractores para que el público pueda contemplar en directo los anillos de Saturno y sus cuatro lunas mayores.',
    category: 'science',
    activityType: 'noche de telescopios',
    tags: ['madrid', 'saturno', 'debod', 'astronomia', 'telescopios', 'espana', 'gratis'],
    daysFromNow: 5,
    time: '21:00',
    durationHours: 3.5,
    venue: 'Mirador del Templo de Debod',
    address: 'Calle de Ferraz 1, Moncloa-Aravaca',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.7178, 40.4240],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://planetario.es',
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200&q=80'
  },

  // ==========================================
  // ESTADOS UNIDOS (US)
  // ==========================================
  {
    sourceId: 'astro:us-nyc-central-park-stargazing',
    title: '✨ Central Park Great Lawn Astronomy Night: Moon & Deep Sky',
    description: 'Convocatoria abierta de la Amateur Astronomers Association of New York en el gran césped de Central Park. Docenas de telescopios potentes apuntando a los mares lunares, Júpiter y estrellas dobles en pleno corazón de Manhattan.',
    category: 'science',
    activityType: 'noche de telescopios',
    tags: ['newyork', 'centralpark', 'astronomy', 'stargazing', 'nyc', 'free'],
    daysFromNow: 6,
    time: '20:00',
    durationHours: 3,
    venue: 'Central Park Great Lawn',
    address: 'Mid-Park from 79th to 85th Streets, Manhattan',
    city: 'New York',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-73.9654, 40.7812],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://aaa.org',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80'
  },

  // ==========================================
  // COLOMBIA (CO)
  // ==========================================
  {
    sourceId: 'astro:co-bog-monserrate-superluna',
    title: '🌕 Noche de Superluna & Mirador Estelar en el Cerro de Monserrate',
    description: 'A 3.152 metros sobre el nivel del mar con una vista panorámica sin igual de la sabana de Bogotá. Observación de la Superluna Llena con charlas divulgativas del Planetario de Bogotá y música acústica de fondo.',
    category: 'science',
    activityType: 'observación de estrellas',
    tags: ['bogota', 'monserrate', 'superluna', 'planetario', 'colombia', 'mirador'],
    daysFromNow: 7,
    time: '18:30',
    durationHours: 4,
    venue: 'Mirador del Cerro de Monserrate',
    address: 'Paseo de Bolívar, Santa Fe',
    city: 'Bogotá',
    country: 'Colombia',
    countryCode: 'CO',
    coordinates: [-74.0556, 4.6056],
    price: { amount: 0, currency: 'COP' },
    externalUrl: 'https://planetariodebogota.gov.co',
    imageUrl: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?w=1200&q=80'
  },

  // ==========================================
  // MÉXICO (MX)
  // ==========================================
  {
    sourceId: 'astro:mx-cdmx-chapultepec-noche-astros',
    title: '🔭 Noche de Estrellas en el Bosque de Chapultepec: Planetas & Nebulosas',
    description: 'Encuentro ciudadano de divulgación científica en la explanada de la Segunda Sección del Bosque de Chapultepec. Talleres de cohetería para niños, conferencias con astrofísicos y observación astronómica con telescopios.',
    category: 'science',
    activityType: 'noche de telescopios',
    tags: ['cdmx', 'chapultepec', 'nochedeestrellas', 'mexico', 'ciencia', 'familia', 'gratis'],
    daysFromNow: 9,
    time: '18:00',
    durationHours: 5,
    venue: 'Segunda Sección del Bosque de Chapultepec',
    address: 'Av. de los Compositores s/n, Miguel Hidalgo',
    city: 'Ciudad de México',
    country: 'México',
    countryCode: 'MX',
    coordinates: [-99.2017, 19.4144],
    price: { amount: 0, currency: 'MXN' },
    externalUrl: 'https://chapultepec.cdmx.gob.mx',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80'
  }
];

/**
 * Seeds and maintains celestial & astronomical events.
 */
async function syncAstronomyEvents({ dryRun = false } = {}) {
  if (!demoCatalogEnabled()) return { ...DEMO_CATALOG_SKIP };
  try {
    let curator = await User.findOne({ username: 'eventnow_oficial' }) || await User.findOne({ role: 'admin' }) || await User.findOne();
    if (!curator) {
      logger.warn?.('[AstronomyEvents] No curator found to seed astronomy events.');
      return { success: false, reason: 'no_curator' };
    }

    let created = 0;
    let updated = 0;

    for (const item of ASTRONOMY_EVENTS) {
      const now = new Date();
      const startDate = new Date(now.getTime() + item.daysFromNow * 86400000);
      const [h, m] = item.time.split(':').map(Number);
      startDate.setHours(h, m, 0, 0);

      const endDate = new Date(startDate.getTime() + (item.durationHours || 3) * 3600000);
      const lat = item.coordinates[1];
      const lng = item.coordinates[0];

      let h3Index = {};
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        try { h3Index = computeH3Hierarchy(lat, lng); } catch {}
      }

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
        source: 'astronomy_open_science',
        sourceId: item.sourceId,
        externalUrl: item.externalUrl,
        images: item.imageUrl ? [{ url: item.imageUrl, caption: item.title }] : [],
        h3: h3Index,
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
    logger.info?.(`[AstronomyEvents] Synced successfully: created=${created}, updated=${updated}, total=${ASTRONOMY_EVENTS.length}`);
    return { success: true, created, updated, total: ASTRONOMY_EVENTS.length };
  } catch (err) {
    logger.error?.('[AstronomyEvents] Error syncing astronomy events:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { syncAstronomyEvents, ASTRONOMY_EVENTS };
