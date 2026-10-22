'use strict';

/**
 * civicPoliticalAgendaHarvester.js
 * ------------------------------------------------------------------
 * Automated Civic & Political Agenda Harvester for EventNow 2.0.
 * Ingests and maintains democratic, civic, and governmental events:
 * - Debates (presidential, mayoral, congress)
 * - Public Hearings & Citizen Assemblies (Congreso Nacional, Cabildo Abierto)
 * - Town Halls, Climate Summits & United Nations Global Fora
 *
 * Categorized under 'politics' (Política & Civismo 🏛️) with activityTypes:
 * 'debate político', 'foro cívico ciudadano', 'asamblea comunitaria', 'cabildo abierto'.
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { invalidateCache } = require('../../middleware/cache');
const logger = require('../../utils/logger') || console;
const { demoCatalogEnabled, DEMO_CATALOG_SKIP } = require('./demoCatalogGuard');

const CIVIC_POLITICAL_EVENTS = [
  // ==========================================
  // REPÚBLICA DOMINICANA (DO)
  // ==========================================
  {
    sourceId: 'pol:anje-gran-debate-presidencial',
    title: '🏛️ Gran Debate Presidencial Nacional ANJE: Planes de Gobierno & Economía',
    description: 'El debate político más trascendental de la República Dominicana organizado por la Asociación Nacional de Jóvenes Empresarios (ANJE). Los candidatos presidenciales debaten cara a cara sus propuestas sobre economía, empleo, educación, salud y transparencia institucional en cadena nacional.',
    category: 'politics',
    activityType: 'debate político',
    tags: ['anje', 'debate', 'presidencial', 'politica', 'democracia', 'santodomingo', 'civismo'],
    daysFromNow: 5,
    time: '20:00',
    durationHours: 2.5,
    venue: 'Auditorio Casa San Pablo',
    address: 'Av. Rómulo Betancourt con Av. Núñez de Cáceres, Bella Vista',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9572, 18.4518],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://anje.org',
    imageUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&q=80'
  },
  {
    sourceId: 'pol:congreso-vistas-publicas-ley-agua',
    title: '📜 Vistas Públicas en el Congreso Nacional: Proyecto de Ley General de Agua y Medio Ambiente',
    description: 'Audiencia pública ciudadana en el Salón de la Asamblea Nacional. Ciudadanos, juntas comunitarias, ecologistas y juristas exponen sus observaciones y propuestas frente a la Comisión Bicameral del Senado y la Cámara de Diputados.',
    category: 'politics',
    activityType: 'asamblea comunitaria',
    tags: ['congreso', 'vistaspublicas', 'leydeagua', 'medioambiente', 'ciudadania', 'santodomingo'],
    daysFromNow: 8,
    time: '09:30',
    durationHours: 5,
    venue: 'Congreso Nacional de la República Dominicana',
    address: 'Av. Enrique Jiménez Moya, Centro de los Héroes (La Feria)',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9238, 18.4429],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://senado.gob.do',
    imageUrl: 'https://images.unsplash.com/photo-1575517111478-7f6afd0973db?w=1200&q=80'
  },
  {
    sourceId: 'pol:adn-cabildo-abierto-presupuesto-participativo',
    title: '🗣️ Cabildo Abierto del Distrito Nacional: Presupuesto Participativo Municipal',
    description: 'Asamblea de participación ciudadana directa convocada por la Alcaldía del Distrito Nacional (ADN). Vecinos y líderes comunitarios de las tres circunscripciones votan las obras prioritarias de parques, drenaje y alumbrado de sus sectores.',
    category: 'politics',
    activityType: 'cabildo abierto',
    tags: ['alcaldia', 'adn', 'cabildoabierto', 'presupuestoparticipativo', 'vecinos', 'santodomingo'],
    daysFromNow: 6,
    time: '17:00',
    durationHours: 3,
    venue: 'Palacio Consistorial de Santo Domingo',
    address: 'Calle El Conde esq. Calle Arzobispo Meriño, Zona Colonial',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.8841, 18.4731],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://adn.gob.do',
    imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80'
  },
  {
    sourceId: 'pol:santiago-foro-liderazgo-cibao',
    title: '🤝 Foro de Concertación Cívica y Desarrollo Regional del Cibao',
    description: 'Encuentro de líderes sociales, empresarios y autoridades municipales en el Centro León de Santiago. Mesas de trabajo abiertas sobre competitividad agrícola, agua potable y seguridad ciudadana.',
    category: 'politics',
    activityType: 'foro cívico ciudadano',
    tags: ['santiago', 'cibao', 'forocivico', 'centroleon', 'desarrollo', 'ciudadania'],
    daysFromNow: 12,
    time: '15:00',
    durationHours: 4,
    venue: 'Auditorio del Centro León',
    address: 'Av. 27 de Febrero 146, Villa Progreso',
    city: 'Santiago de los Caballeros',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-70.6695, 19.4589],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://centroleon.org.do',
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80'
  },

  // ==========================================
  // ESTADOS UNIDOS / INTERNACIONAL (US / UN)
  // ==========================================
  {
    sourceId: 'pol:un-youth-climate-action-summit',
    title: '🌐 UN Youth & Climate Action Forum: Sede de las Naciones Unidas (NYC)',
    description: 'Cumbre de acción cívica juvenil en el marco de la Asamblea General de la ONU. Representantes de más de 120 naciones debaten políticas públicas para la transición energética justa y justicia climática global.',
    category: 'politics',
    activityType: 'foro cívico ciudadano',
    tags: ['onu', 'un', 'nuevayork', 'cambioclimatico', 'politica', 'juventud'],
    daysFromNow: 14,
    time: '09:00',
    durationHours: 7,
    venue: 'United Nations Headquarters (ECOSOC Chamber)',
    address: '405 E 42nd St, Manhattan',
    city: 'New York',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-73.9680, 40.7499],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://un.org',
    imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80'
  },

  // ==========================================
  // ESPAÑA (ES)
  // ==========================================
  {
    sourceId: 'pol:madrid-asamblea-dialogo-ciudadano',
    title: '🗳️ Foro de Diálogo Ciudadano & Presupuestos Abiertos: Matadero Madrid',
    description: 'Asamblea abierta de vecinos y colectivos sociales de los 21 distritos de Madrid en la Nave de Terneras de Matadero. Votación de propuestas ciudadanas de movilidad sostenible, vivienda y zonas verdes.',
    category: 'politics',
    activityType: 'asamblea comunitaria',
    tags: ['madrid', 'matadero', 'asambleaciudadana', 'participacion', 'democracia', 'espana'],
    daysFromNow: 7,
    time: '18:30',
    durationHours: 3,
    venue: 'Nave de Terneras - Matadero Madrid',
    address: 'Plaza de Legazpi 8, Arganzuela',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.6975, 40.3917],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://decide.madrid.es',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80'
  },

  // ==========================================
  // MÉXICO (MX)
  // ==========================================
  {
    sourceId: 'pol:cdmx-foro-democracia-participativa',
    title: '🇲🇽 Encuentro Nacional de Participación Ciudadana & Parlamento Abierto: CDMX',
    description: 'Foro nacional con colectivos ciudadanos, académicos y legisladores en el Palacio de Minería en el Centro Histórico de la Ciudad de México. Paneles sobre presupuesto participativo y transparencia gubernamental.',
    category: 'politics',
    activityType: 'foro cívico ciudadano',
    tags: ['cdmx', 'mexico', 'palaciodemineria', 'democracia', 'parlamentoabierto'],
    daysFromNow: 9,
    time: '11:00',
    durationHours: 4.5,
    venue: 'Palacio de Minería',
    address: 'Calle de Tacuba 5, Centro Histórico',
    city: 'Ciudad de México',
    country: 'México',
    countryCode: 'MX',
    coordinates: [-99.1395, 19.4357],
    price: { amount: 0, currency: 'MXN' },
    externalUrl: 'https://cdmx.gob.mx',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80'
  },

  // ==========================================
  // COLOMBIA (CO)
  // ==========================================
  {
    sourceId: 'pol:bogota-dialogos-ciudadanos-paz',
    title: '🕊️ Diálogos de Concertación Social & Derechos Humanos: Centro de Memoria Bogotá',
    description: 'Encuentro ciudadano en el auditorio del Centro de Memoria, Paz y Reconciliación. Mesas de diálogo con víctimas, líderes comunitarios y defensores de derechos humanos sobre convivencia y reconciliación social.',
    category: 'politics',
    activityType: 'foro cívico ciudadano',
    tags: ['bogota', 'colombia', 'paz', 'dialogos', 'derechoshumanos', 'civismo'],
    daysFromNow: 11,
    time: '14:00',
    durationHours: 4,
    venue: 'Centro de Memoria, Paz y Reconciliación',
    address: 'Carrera 19B # 24 - 86, Teusaquillo',
    city: 'Bogotá',
    country: 'Colombia',
    countryCode: 'CO',
    coordinates: [-74.0759, 4.6198],
    price: { amount: 0, currency: 'COP' },
    externalUrl: 'https://bogota.gov.co',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80'
  }
];

/**
 * Seeds and maintains civic & political agendas.
 */
async function syncCivicPoliticalAgendas({ dryRun = false } = {}) {
  if (!demoCatalogEnabled()) return { ...DEMO_CATALOG_SKIP };
  try {
    let curator = await User.findOne({ username: 'eventnow_oficial' }) || await User.findOne({ role: 'admin' }) || await User.findOne();
    if (!curator) {
      logger.warn?.('[CivicPolitical] No curator found to seed civic events.');
      return { success: false, reason: 'no_curator' };
    }

    let created = 0;
    let updated = 0;

    for (const item of CIVIC_POLITICAL_EVENTS) {
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
        source: 'civic_political_agenda',
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
    logger.info?.(`[CivicPolitical] Synced successfully: created=${created}, updated=${updated}, total=${CIVIC_POLITICAL_EVENTS.length}`);
    return { success: true, created, updated, total: CIVIC_POLITICAL_EVENTS.length };
  } catch (err) {
    logger.error?.('[CivicPolitical] Error syncing civic political agendas:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { syncCivicPoliticalAgendas, CIVIC_POLITICAL_EVENTS };
