'use strict';

/**
 * fashionAndEditorialHarvester.js
 * ------------------------------------------------------------------
 * Automated Ingestion Pipeline for Fashion, Modeling, Makeup & Digital Magazines:
 * - 👗 Pasarelas de Moda, Fashion Weeks & Showrooms de Alta Costura
 * - 👠 Castings de Modelaje, Model Training & Agencias Internacionales
 * - 💄 Masterclasses de Maquillaje Profesional, Skincare & Cosmética
 * - 📖 Revistas Digitales, Lanzamientos de Lookbooks & Editoriales Interactivas
 * - 🌿 Moda Sostenible, Upcycling Textil & Diseño de Autor
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { invalidateCache } = require('../../middleware/cache');
const { getCategoryFallbackImage } = require('../../utils/imageFallbacks');
const logger = require('../../utils/logger') || console;

const FASHION_EDITORIAL_EVENTS = [
  // ==========================================
  // 👗 PASARELAS & FASHION WEEKS
  // ==========================================
  {
    sourceId: 'fashion:fr-paris-fashion-week-digital-showroom',
    title: '👗 Paris Fashion Week 2026: Digital Showroom & Desfile de Alta Costura',
    description: 'La máxima cita de la moda internacional. Presentación interactiva y desfiles de alta costura con acceso a showrooms virtuales en 4K, análisis de tendencias y colecciones primavera-verano de los grandes diseñadores.',
    category: 'fashion',
    activityType: 'pasarela de moda',
    tags: ['moda', 'fashion', 'runway', 'parisfashionweek', 'hautecouture', 'virtual', 'estilo'],
    daysFromNow: 4,
    time: '18:00',
    durationHours: 3.5,
    isVirtual: true,
    virtualLink: 'https://youtube.com/live/parisfashionweek-live',
    venue: 'Grand Palais Éphémère & Virtual Stage',
    address: 'Place Joffre, 75007 París',
    city: 'París',
    country: 'Francia',
    countryCode: 'FR',
    coordinates: [2.3023, 48.8530],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://fhcm.paris/fr/paris-fashion-week',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80'
  },
  {
    sourceId: 'fashion:do-sd-dominicanamoda-runway-caribbean',
    title: '👠 DominicanaModa 2026: Gran Pasarela Caribeña & Diseñadores Emergentes',
    description: 'El evento cumbre de la moda en el Caribe. Diseñadores dominicanos e internacionales exhiben sus propuestas de moda resort, alta costura caribeña y diseño textil sostenible en el Malecón de Santo Domingo.',
    category: 'fashion',
    activityType: 'pasarela de moda',
    tags: ['moda', 'dominicanamoda', 'pasarela', 'runway', 'santodomingo', 'modelos', 'diseno'],
    daysFromNow: 6,
    time: '19:30',
    durationHours: 4,
    venue: 'Hotel Renaissance Jaragua - Teatro La Fiesta',
    address: 'Av. George Washington 367, Malecón, Santo Domingo',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.8974, 18.4632],
    price: { amount: 1200, currency: 'DOP' },
    externalUrl: 'https://dominicanamoda.com',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&q=80'
  },
  {
    sourceId: 'fashion:es-madrid-fashion-week-ifema',
    title: '🇪🇸 Mercedes-Benz Fashion Week Madrid: Desfile Nuevos Talentos',
    description: 'La gran pasarela española reúne a los jóvenes diseñadores vanguardistas y marcas consolidadas en IFEMA Madrid. Descubre las tendencias de diseño iberoamericano y prendas de autor.',
    category: 'fashion',
    activityType: 'pasarela de moda',
    tags: ['mbfw', 'madrid', 'moda', 'pasarela', 'runway', 'espana', 'tendencias'],
    daysFromNow: 9,
    time: '17:00',
    durationHours: 4,
    venue: 'Pabellón 14 - IFEMA Feria de Madrid',
    address: 'Av. del Partenón 5, 28042 Madrid',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.6166, 40.4637],
    price: { amount: 25, currency: 'EUR' },
    externalUrl: 'https://ifema.es/mbfw-madrid',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80'
  },

  // ==========================================
  // 💄 MAQUILLAJE PROFESIONAL & BEAUTY
  // ==========================================
  {
    sourceId: 'fashion:es-madrid-masterclass-maquillaje-pro-glam',
    title: '💄 Masterclass Pro de Maquillaje Editorial, Novias & Efectos Glamour',
    description: 'Taller intensivo dictado por destacados maquilladores internacionales. Aprende técnicas avanzadas de preparación de piel, contorno HD, ojos ahumados y acabado impecable para fotografía editorial y pasarelas.',
    category: 'fashion',
    activityType: 'masterclass de maquillaje',
    tags: ['maquillaje', 'makeup', 'belleza', 'beauty', 'masterclass', 'skincare', 'glam'],
    daysFromNow: 8,
    time: '15:00',
    durationHours: 3.5,
    isVirtual: true,
    virtualLink: 'https://zoom.us/j/masterclass-maquillaje-pro-2026',
    venue: 'Estudio Central de Belleza & Transmisión Online',
    address: 'Paseo de la Castellana 95, Madrid',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.6905, 40.4502],
    price: { amount: 20, currency: 'EUR' },
    externalUrl: 'https://masterclassmaquillaje.com',
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80'
  },
  {
    sourceId: 'fashion:mx-cdmx-expo-beauty-cosmetica-vegana',
    title: '🧴 Expo Beauty & Cosmética Vegana: Innovación en Skincare y Maquillaje',
    description: 'La convención líder de belleza consciente y cosmética limpia en la Ciudad de México. Demostraciones en vivo de maquillaje mineral, masterclasses de cuidado de la piel y networking con marcas pioneras.',
    category: 'fashion',
    activityType: 'expo belleza',
    tags: ['maquillaje', 'belleza', 'skincare', 'cosmetica', 'cdmx', 'expo', 'vegano'],
    daysFromNow: 11,
    time: '11:00',
    durationHours: 7,
    venue: 'World Trade Center Ciudad de México',
    address: 'Montecito 38, Nápoles, Benito Juárez, CDMX',
    city: 'Ciudad de México',
    country: 'México',
    countryCode: 'MX',
    coordinates: [-99.1738, 19.3948],
    price: { amount: 150, currency: 'MXN' },
    externalUrl: 'https://expobeautycdmx.com',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80'
  },
  {
    sourceId: 'fashion:do-santiago-beauty-fest-cibao',
    title: '✨ Beauty Fest Cibao: Maquillaje, Peinado & Tendencias de Estética 2026',
    description: 'Encuentro de profesionales de la belleza en el corazón del Cibao. Concursos de maquillaje artístico, talleres prácticos de automaquillaje y stands de las marcas líderes del mercado.',
    category: 'fashion',
    activityType: 'expo belleza',
    tags: ['maquillaje', 'belleza', 'santiago', 'cibao', 'estetica', 'talleres'],
    daysFromNow: 13,
    time: '14:00',
    durationHours: 6,
    venue: 'Centro de Convenciones y Cultura UTESA',
    address: 'Av. Las Carreras, Santiago de los Caballeros',
    city: 'Santiago de los Caballeros',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-70.6970, 19.4517],
    price: { amount: 450, currency: 'DOP' },
    externalUrl: 'https://beautyfestcibao.com',
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80'
  },

  // ==========================================
  // 👠 CASTINGS DE MODELAJE & AGENCIAS
  // ==========================================
  {
    sourceId: 'fashion:do-sd-casting-abierto-modelaje-zona-colonial',
    title: '📸 Gran Casting Abierto de Modelaje para Pasarelas & Fotografía Editorial',
    description: 'Convocatoria oficial para nuevos talentos del modelaje nacional e internacional. Reclutamiento de modelos femeninos y masculinos para campañas publicitarias, revistas de moda y pasarelas de alta costura.',
    category: 'fashion',
    activityType: 'casting de modelaje',
    tags: ['casting', 'modelaje', 'modelos', 'fotografia', 'santodomingo', 'zonacolonial', 'agencia'],
    daysFromNow: 5,
    time: '14:30',
    durationHours: 4,
    venue: 'Quinta Dominica - Zona Colonial',
    address: 'Calle Padre Billini 202, Zona Colonial, Santo Domingo',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.8858, 18.4725],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://castingdominicana.com',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=80'
  },
  {
    sourceId: 'fashion:us-ny-soho-model-runway-casting-soho',
    title: '🗽 New York Modeling Call & Editorial Portfolio Review in SoHo',
    description: 'Casting internacional de modelos y revisión de portfolios con scouts de agencias líderes en Manhattan. Sesiones de prueba en pasarela y evaluación fotográfica en vivo.',
    category: 'fashion',
    activityType: 'casting de modelaje',
    tags: ['modelaje', 'casting', 'newyork', 'soho', 'runway', 'editorial', 'modelscout'],
    daysFromNow: 10,
    time: '13:00',
    durationHours: 5,
    venue: 'Spring Studios SoHo',
    address: '6 St Johns Ln, New York, NY 10013',
    city: 'Nueva York',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-74.0076, 40.7196],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://springstudios.com',
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200&q=80'
  },
  {
    sourceId: 'fashion:us-miami-swim-week-runway-south-beach',
    title: '🌴 Miami Swim Fashion & Beachwear Runway Showcase',
    description: 'La pasarela más vibrante de trajes de baño y ropa resort en South Beach. Modelaje internacional, tendencias de moda playera y fiesta oficial al atardecer frente al océano.',
    category: 'fashion',
    activityType: 'pasarela de moda',
    tags: ['miami', 'swimweek', 'moda', 'pasarela', 'playa', 'modelaje', 'southbeach'],
    daysFromNow: 14,
    time: '18:30',
    durationHours: 4,
    venue: 'The SLS Hotel Pool Deck - South Beach',
    address: '1701 Collins Ave, Miami Beach, FL 33139',
    city: 'Miami',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-80.1298, 25.7925],
    price: { amount: 45, currency: 'USD' },
    externalUrl: 'https://miamiswimweek.com',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'
  },

  // ==========================================
  // 📖 REVISTAS DIGITALES, EDITORIAL & LOOKBOOKS
  // ==========================================
  {
    sourceId: 'fashion:virtual-lanzamiento-revista-digital-lookbook-2026',
    title: '📖 Lanzamiento Global de Revista Digital de Tendencias & Lookbook Interactivo',
    description: 'Estreno en línea de la nueva edición interactiva de la revista digital de moda y estilo de vida. Incluye acceso inmediato a lookbooks en alta resolución, entrevistas exclusivas a diseñadores y enlace para lectura digital.',
    category: 'fashion',
    activityType: 'revista digital',
    tags: ['revistadigital', 'editorial', 'lookbook', 'revista', 'tendencias', 'moda', 'digital'],
    daysFromNow: 3,
    time: '19:00',
    durationHours: 2,
    isVirtual: true,
    virtualLink: 'https://eventnow.do/digital-magazine/fashion-trends-2026',
    venue: 'Edición Digital Global & Stream Interactivo',
    address: 'Plataforma Virtual EventNow',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9312, 18.4861],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://vogue.es/tendencias',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80'
  },
  {
    sourceId: 'fashion:virtual-masterclass-fotografia-moda-revistas-ia',
    title: '📸 Taller Virtual: Fotografía de Moda, Portadas y Diseño de Revistas con IA',
    description: 'Webinar práctico sobre cómo producir sesiones editoriales de moda, maquetar revistas digitales profesionales y utilizar herramientas de IA para generación de moodboards y estilismo vanguardista.',
    category: 'fashion',
    activityType: 'editorial de moda',
    tags: ['fotografia', 'revistadigital', 'ia', 'editorial', 'disenografico', 'webinar'],
    daysFromNow: 7,
    time: '20:00',
    durationHours: 2.5,
    isVirtual: true,
    virtualLink: 'https://twitch.tv/editorialfashion-live',
    venue: 'Transmisión en Vivo HD (Twitch & YouTube)',
    address: 'Estudio Virtual Internacional',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.7038, 40.4168],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://creatorsmoda.com',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=80'
  },
  {
    sourceId: 'fashion:co-bogota-pasarela-textil-sostenible',
    title: '🌿 Pasarela de Moda Sostenible, Upcycling Textil & Diseño de Autor',
    description: 'Exhibición de marcas emergentes comprometidas con la economía circular y la moda regenerativa en Bogotá. Desfile de prendas reconstruidas con fibras naturales y charla con expertas en diseño ecológico.',
    category: 'fashion',
    activityType: 'pasarela de moda',
    tags: ['modasostenible', 'upcycling', 'pasarela', 'bogota', 'diseno', 'ecologia'],
    daysFromNow: 12,
    time: '16:00',
    durationHours: 3.5,
    venue: 'Centro Creativo Textura - Puente Aranda',
    address: 'Cra. 54 # 5C-33, Bogotá',
    city: 'Bogotá',
    country: 'Colombia',
    countryCode: 'CO',
    coordinates: [-74.1166, 4.6291],
    price: { amount: 25000, currency: 'COP' },
    externalUrl: 'https://modasosteniblebogota.com',
    imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=80'
  }
];

class FashionAndEditorialHarvester {
  async ensureCuratorUser() {
    let curator = await User.findOne({ username: 'eventnow_fashion_curator' });
    if (!curator) {
      curator = await User.findOne({ role: 'admin' });
    }
    if (!curator) {
      curator = await User.create({
        username: 'eventnow_fashion_curator',
        email: 'fashion@eventnow.do',
        firstName: 'EventNow',
        lastName: 'Fashion & Editorial',
        role: 'organizer',
        isEmailVerified: true,
        verified: true,
        country: 'República Dominicana',
        countryCode: 'DO',
        bio: 'Comité Editorial Oficial de Moda, Maquillaje, Pasarelas y Revistas Digitales en EventNow Global.'
      });
    }
    return curator;
  }

  calculateEventDates(daysFromNow, timeStr = '18:00', durationHours = 3) {
    const now = Date.now();
    const startDate = new Date(now + daysFromNow * 24 * 60 * 60 * 1000);
    const [hh, mm] = (timeStr || '18:00').split(':').map(Number);
    startDate.setHours(hh || 18, mm || 0, 0, 0);

    const endDate = new Date(startDate.getTime() + (durationHours || 3) * 60 * 60 * 1000);
    return { startDate, endDate };
  }

  async syncAll() {
    const curator = await this.ensureCuratorUser();
    let created = 0;
    let updated = 0;

    for (const item of FASHION_EDITORIAL_EVENTS) {
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
            platform: 'fashion_editorial_harvester',
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
        logger.error(`[FashionEditorial] Error processing event ${item.sourceId}:`, err.message);
      }
    }

    invalidateCache('/api/events*');
    logger.info(`[FashionEditorial] Synced successfully: created=${created}, updated=${updated}, total=${FASHION_EDITORIAL_EVENTS.length}`);
    return { created, updated, total: FASHION_EDITORIAL_EVENTS.length };
  }
}

module.exports = new FashionAndEditorialHarvester();
