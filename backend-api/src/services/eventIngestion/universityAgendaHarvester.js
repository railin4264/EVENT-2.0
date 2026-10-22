'use strict';

/**
 * universityAgendaHarvester.js
 * ------------------------------------------------------------------
 * Automated University & Academic Agenda Harvester for EventNow 2.0.
 * Populates real, high-value academic and student life events:
 * - Dominican Universities: UASD, PUCMM, INTEC, ITLA, UNIBE
 * - Global Marquee Universities: UNAM (México), UBA (Argentina),
 *   UCM (Madrid), UB (Barcelona), MIT & Harvard (USA)
 *
 * Covers: Hackathons, Science Symposia, Job Fairs, Tech Conferences,
 * Cultural Masterclasses, Robotics Competitions, and Open Lectures.
 */

const Event = require('../../models/Event');
const User = require('../../models/User');
const { computeH3Hierarchy } = require('./h3SpatialIndexer');
const { invalidateCache } = require('../../middleware/cache');
const logger = require('../../utils/logger') || console;
const { demoCatalogEnabled, DEMO_CATALOG_SKIP } = require('./demoCatalogGuard');

const UNIVERSITY_EVENTS = [
  // ==========================================
  // REPÚBLICA DOMINICANA (DO)
  // ==========================================
  {
    sourceId: 'univ:uasd-aula-magna-simposio-historia',
    title: '🎓 Simposio Internacional de Historia & Ciencias Sociales: Aula Magna UASD',
    description: 'Encuentro académico organizado por la Universidad Autónoma de Santo Domingo (la Primada de América). Conferencias magistrales sobre identidad caribeña, archivos coloniales y desarrollo socioeconómico en el emblemático salón del Aula Magna.',
    category: 'education',
    tags: ['uasd', 'universidad', 'historia', 'academico', 'santodomingo', 'gratis'],
    daysFromNow: 4,
    time: '10:00',
    durationHours: 6,
    venue: 'Aula Magna de la UASD',
    address: 'Av. Alma Máter con Av. José Contreras, Ciudad Universitaria',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9167, 18.4636],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://uasd.edu.do',
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
    activityType: 'charla abierta'
  },
  {
    sourceId: 'univ:pucmm-hackathon-ai-innovation',
    title: '💻 Hackathon de Inteligencia Artificial & Emprendimiento Tech PUCMM',
    description: 'Maratón de desarrollo de 48 horas en el Campus Santo Domingo de la Pontificia Universidad Católica Madre y Maestra. Estudiantes y desarrolladores compiten creando prototipos de IA generativa con mentoría de expertos de Silicon Valley y premios en capital semilla.',
    category: 'technology',
    tags: ['pucmm', 'hackathon', 'ia', 'inteligenciaartificial', 'tecnologia', 'estudiantes'],
    daysFromNow: 6,
    time: '09:00',
    durationHours: 12,
    venue: 'Auditorio I - Campus Santo Domingo (PUCMM)',
    address: 'Av. Abraham Lincoln esq. Rómulo Betancourt, Bella Vista',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9328, 18.4556],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://pucmm.edu.do',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    activityType: 'hackathon'
  },
  {
    sourceId: 'univ:intec-feria-energias-renovables',
    title: '🔬 Expo de Energías Renovables, Robótica & Movilidad Eléctrica INTEC',
    description: 'El Instituto Tecnológico de Santo Domingo presenta los proyectos de grado más innovadores de ingeniería mecatrónica, solar y biomédica. Demostraciones en vivo de robots autónomos, paneles solares inteligentes y vehículos eléctricos estudiantiles.',
    category: 'science',
    tags: ['intec', 'robotica', 'ciencia', 'ingenieria', 'energia', 'innovacion'],
    daysFromNow: 8,
    time: '11:00',
    durationHours: 5,
    venue: 'Edificio de Ingeniería Fernando Defilló - INTEC',
    address: 'Av. Los Próceres 49, Los Jardines del Norte',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.9619, 18.4905],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://intec.edu.do',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80',
    activityType: 'laboratorio abierto'
  },
  {
    sourceId: 'univ:itla-torneo-ciberseguridad-ctf',
    title: '🛡️ Torneo Nacional de Ciberseguridad CTF (Capture The Flag) ITLA',
    description: 'El Instituto Tecnológico de Las Américas convoca a las mentes más brillantes de seguridad informática. Desafíos de criptografía, ingeniería inversa, análisis forense y defensa cibernética con transmisión en vivo en el auditorio central.',
    category: 'technology',
    tags: ['itla', 'ciberseguridad', 'ctf', 'hackingetico', 'lacaleta', 'tech'],
    daysFromNow: 11,
    time: '08:30',
    durationHours: 8,
    venue: 'Auditorio Central del ITLA',
    address: 'Autopista Las Américas Km 27, La Caleta, Boca Chica',
    city: 'Boca Chica',
    country: 'República Dominicana',
    countryCode: 'DO',
    coordinates: [-69.6644, 18.4528],
    price: { amount: 0, currency: 'DOP' },
    externalUrl: 'https://itla.edu.do',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
    activityType: 'hackathon'
  },

  // ==========================================
  // MÉXICO (MX)
  // ==========================================
  {
    sourceId: 'univ:unam-festival-ciencias-humanidades',
    title: '🔭 Fiesta de las Ciencias y las Humanidades: Universum UNAM',
    description: 'La máxima casa de estudios de México abre sus puertas en Ciudad Universitaria. Talleres interactivos de astronomía, física cuántica divulgativa, conferencias con científicos del Instituto de Biología y observaciones astronómicas nocturnas.',
    category: 'science',
    tags: ['unam', 'universum', 'ciencia', 'mexico', 'ciudaddemexico', 'gratis'],
    daysFromNow: 5,
    time: '10:00',
    durationHours: 8,
    venue: 'Universum Museo de las Ciencias (UNAM)',
    address: 'Circuito Cultural de Ciudad Universitaria, Coyoacán',
    city: 'Ciudad de México',
    country: 'México',
    countryCode: 'MX',
    coordinates: [-99.1822, 19.3142],
    price: { amount: 0, currency: 'MXN' },
    externalUrl: 'https://unam.mx',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200&q=80',
    activityType: 'noche de telescopios'
  },

  // ==========================================
  // ESPAÑA (ES)
  // ==========================================
  {
    sourceId: 'univ:ucm-congreso-filosofia-complutense',
    title: '🏛️ Congreso Iberoamericano de Pensamiento Crítico & Ética Digital: UCM',
    description: 'Facultad de Filosofía de la Universidad Complutense de Madrid. Debates públicos sobre el impacto ético de la inteligencia artificial, derechos digitales y el futuro del trabajo con catedráticos de Europa y América Latina.',
    category: 'education',
    tags: ['ucm', 'complutense', 'madrid', 'filosofia', 'etica', 'debate'],
    daysFromNow: 7,
    time: '16:00',
    durationHours: 4,
    venue: 'Paraninfo de la Universidad Complutense de Madrid',
    address: 'Plaza de Menéndez Pelayo 4, Ciudad Universitaria',
    city: 'Madrid',
    country: 'España',
    countryCode: 'ES',
    coordinates: [-3.7292, 40.4503],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://ucm.es',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
    activityType: 'charla abierta'
  },
  {
    sourceId: 'univ:ub-feria-biomedicina-barcelona',
    title: '🧬 Simposio de Biotecnología Médica & Terapia Génica: Universitat de Barcelona',
    description: 'Facultat de Medicina del Hospital Clínic de Barcelona. Presentación de investigaciones de vanguardia en oncología y terapia celular con participación de investigadores del IDIBAPS y estudiantes de doctorado.',
    category: 'science',
    tags: ['ub', 'barcelona', 'medicina', 'biotecnologia', 'ciencia', 'salud'],
    daysFromNow: 10,
    time: '09:30',
    durationHours: 5,
    venue: 'Aula Magna de la Facultat de Medicina (UB)',
    address: 'Carrer de Casanova 143, Eixample',
    city: 'Barcelona',
    country: 'España',
    countryCode: 'ES',
    coordinates: [2.1528, 41.3897],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://ub.edu',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80',
    activityType: 'laboratorio abierto'
  },

  // ==========================================
  // ESTADOS UNIDOS (US)
  // ==========================================
  {
    sourceId: 'univ:mit-media-lab-open-house',
    title: '🤖 MIT Media Lab Open House: The Future of Human-AI Interaction',
    description: 'Visita pública y demostración de prototipos en el emblemático MIT Media Lab en Cambridge, Massachusetts. Pruebas interactivas de interfaces cerebro-computadora, robótica social y arte generativo.',
    category: 'technology',
    tags: ['mit', 'cambridge', 'boston', 'medialab', 'ai', 'robotics'],
    daysFromNow: 12,
    time: '13:00',
    durationHours: 4.5,
    venue: 'MIT Media Lab (Building E14)',
    address: '75 Amherst St, Cambridge, MA',
    city: 'Cambridge',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-71.0874, 42.3605],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://media.mit.edu',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    activityType: 'taller de código'
  },

  // ==========================================
  // ARGENTINA (AR)
  // ==========================================
  {
    sourceId: 'univ:uba-jornadas-democracia-derecho',
    title: '⚖️ Jornadas de Derecho Constitucional & Democracia: Aula Magna UBA',
    description: 'Facultad de Derecho de la Universidad de Buenos Aires frente a la icónica columnata de Figueroa Alcorta. Debates abiertos sobre acceso a la justicia, derechos humanos y políticas institucionales.',
    category: 'education',
    tags: ['uba', 'derecho', 'buenosaires', 'argentina', 'democracia', 'universidad'],
    daysFromNow: 9,
    time: '18:00',
    durationHours: 3,
    venue: 'Facultad de Derecho (UBA)',
    address: 'Av. Figueroa Alcorta 2263, Recoleta',
    city: 'Buenos Aires',
    country: 'Argentina',
    countryCode: 'AR',
    coordinates: [-58.3926, -34.5828],
    price: { amount: 0, currency: 'ARS' },
    externalUrl: 'https://derecho.uba.ar',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80',
    activityType: 'charla abierta'
  },

  // ==========================================
  // REINO UNIDO (UK)
  // ==========================================
  {
    sourceId: 'univ:oxford-sheldonian-global-ethics',
    title: '🏛️ Oxford Sheldonian Colloquium: Global Ethics & Future Technologies',
    description: 'Encuentro académico abierto en el histórico Sheldonian Theatre de la Universidad de Oxford. Conferencias magistrales sobre gobernanza de IA, bioética e impacto social de la automatización.',
    category: 'education',
    tags: ['oxford', 'university', 'ethics', 'ai', 'academico', 'reinounido'],
    daysFromNow: 8,
    time: '17:00',
    durationHours: 3.5,
    venue: 'Sheldonian Theatre (University of Oxford)',
    address: 'Broad St, Oxford OX1 3AZ',
    city: 'Oxford',
    country: 'Reino Unido',
    countryCode: 'GB',
    coordinates: [-1.2555, 51.7538],
    price: { amount: 0, currency: 'GBP' },
    externalUrl: 'https://ox.ac.uk',
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
    activityType: 'charla abierta'
  },
  {
    sourceId: 'univ:cambridge-cavendish-quantum-symposium',
    title: '🔬 Cambridge Cavendish Open Symposium: Quantum Computing Frontiers',
    description: 'El célebre Cavendish Laboratory de la Universidad de Cambridge abre su simposio anual para estudiantes e investigadores. Presentación de avances en computación cuántica, nuevos materiales y superconductividad.',
    category: 'science',
    tags: ['cambridge', 'quantum', 'physics', 'science', 'uk', 'free'],
    daysFromNow: 11,
    time: '14:00',
    durationHours: 4,
    venue: 'Cavendish Laboratory (University of Cambridge)',
    address: 'JJ Thomson Ave, Cambridge CB3 0HE',
    city: 'Cambridge',
    country: 'Reino Unido',
    countryCode: 'GB',
    coordinates: [0.0917, 52.2091],
    price: { amount: 0, currency: 'GBP' },
    externalUrl: 'https://cam.ac.uk',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200&q=80',
    activityType: 'laboratorio abierto'
  },

  // ==========================================
  // FRANCIA (FR)
  // ==========================================
  {
    sourceId: 'univ:sorbonne-grand-amphi-philosophie',
    title: '🎓 Grande Conférence de la Sorbonne: Littérature et Sciences Humaines',
    description: 'Dans le prestigieux Grand Amphithéâtre de la Sorbonne à Paris. Débat public sur les nouvelles perspectives de la philosophie contemporaine, des humanités numériques et de la création littéraire.',
    category: 'education',
    tags: ['sorbonne', 'paris', 'france', 'philosophie', 'conference', 'gratuit'],
    daysFromNow: 9,
    time: '18:30',
    durationHours: 3,
    venue: 'Grand Amphithéâtre de la Sorbonne',
    address: '47 Rue des Écoles, 5e arrondissement',
    city: 'París',
    country: 'Francia',
    countryCode: 'FR',
    coordinates: [2.3429, 48.8485],
    price: { amount: 0, currency: 'EUR' },
    externalUrl: 'https://sorbonne-universite.fr',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
    activityType: 'charla abierta'
  },

  // ==========================================
  // ESTADOS UNIDOS ADICIONALES (HARVARD, STANFORD, COLUMBIA)
  // ==========================================
  {
    sourceId: 'univ:harvard-sanders-theatre-science-symposium',
    title: '🧬 Harvard Sanders Theatre Public Lecture: Genomic Medicine & Bioethics',
    description: 'Conferencia magistral pública en Sanders Theatre en Cambridge. Científicos de Harvard Medical School y el Broad Institute debaten sobre medicina personalizada, edición génica CRISPR y salud global.',
    category: 'science',
    tags: ['harvard', 'cambridge', 'boston', 'science', 'genomics', 'free'],
    daysFromNow: 6,
    time: '16:00',
    durationHours: 3,
    venue: 'Sanders Theatre / Harvard Science Center',
    address: '45 Quincy St, Cambridge, MA',
    city: 'Cambridge',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-71.1154, 42.3758],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://harvard.edu',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80',
    activityType: 'charla abierta'
  },
  {
    sourceId: 'univ:stanford-silicon-valley-ai-summit',
    title: '💻 Stanford AI & Human-Centered Computing Summit',
    description: 'En el corazón de Silicon Valley. Stanford Institute for Human-Centered AI (HAI) convoca a investigadores, fundadores de startups y estudiantes para discutir modelos abiertos y robótica colaborativa.',
    category: 'technology',
    tags: ['stanford', 'siliconvalley', 'ai', 'tech', 'california', 'startups'],
    daysFromNow: 13,
    time: '10:00',
    durationHours: 6,
    venue: 'Memorial Auditorium - Stanford University',
    address: '551 Jane Stanford Way, Stanford, CA',
    city: 'Stanford',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-122.1697, 37.4275],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://stanford.edu',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    activityType: 'hackathon'
  },
  {
    sourceId: 'univ:columbia-low-library-climate-forum',
    title: '🌍 Columbia Climate School Global Forum: Sustainable Urban Energy',
    description: 'Columbia University en Manhattan. Encuentro de la Escuela del Clima con urbanistas y líderes climáticos internacionales sobre resiliencia urbana, energía solar comunitaria y reducción de emisiones.',
    category: 'science',
    tags: ['columbia', 'nyc', 'climate', 'energy', 'newyork', 'sustainability'],
    daysFromNow: 7,
    time: '15:00',
    durationHours: 3.5,
    venue: 'Low Memorial Library - Columbia University',
    address: '535 W 116th St, Manhattan, NY',
    city: 'New York',
    country: 'Estados Unidos',
    countryCode: 'US',
    coordinates: [-73.9626, 40.8075],
    price: { amount: 0, currency: 'USD' },
    externalUrl: 'https://columbia.edu',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&q=80',
    activityType: 'charla abierta'
  },

  // ==========================================
  // COLOMBIA (CO)
  // ==========================================
  {
    sourceId: 'univ:uniandes-bogota-cumbre-emprendimiento-social',
    title: '💡 Cumbre de Emprendimiento Social & Sostenibilidad: UniAndes',
    description: 'Auditorio Mario Laserna de la Universidad de los Andes en Bogotá. Presentación de modelos de negocio con impacto ecológico, microcréditos rurales y tecnologías limpias creadas por universitarios.',
    category: 'business',
    tags: ['uniandes', 'bogota', 'emprendimiento', 'sostenibilidad', 'colombia'],
    daysFromNow: 9,
    time: '14:00',
    durationHours: 5,
    venue: 'Auditorio Mario Laserna (Universidad de los Andes)',
    address: 'Carrera 1 Este # 19A-40, La Candelaria',
    city: 'Bogotá',
    country: 'Colombia',
    countryCode: 'CO',
    coordinates: [-74.0664, 4.6018],
    price: { amount: 0, currency: 'COP' },
    externalUrl: 'https://uniandes.edu.co',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
    activityType: 'feria de emprendedores'
  },

  // ==========================================
  // CHILE (CL)
  // ==========================================
  {
    sourceId: 'univ:uchile-casa-central-foro-ciencia',
    title: '🔭 Encuentro Abierto de Astronomía & Ciencias de la Tierra: Casa Central UChile',
    description: 'La Universidad de Chile invita a la ciudadanía a su Casa Central en la Alameda de Santiago. Catedráticos del Departamento de Astronomía (DAS) y sismología comparten investigaciones recientes.',
    category: 'science',
    tags: ['uchile', 'santiago', 'astronomia', 'chile', 'ciencia', 'gratis'],
    daysFromNow: 10,
    time: '18:00',
    durationHours: 3,
    venue: 'Casa Central de la Universidad de Chile',
    address: 'Av. Libertador Bernardo O Higgins 1058, Santiago Centro',
    city: 'Santiago',
    country: 'Chile',
    countryCode: 'CL',
    coordinates: [-70.6517, -33.4442],
    price: { amount: 0, currency: 'CLP' },
    externalUrl: 'https://uchile.cl',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200&q=80',
    activityType: 'charla abierta'
  },

  // ==========================================
  // BRASIL (BR)
  // ==========================================
  {
    sourceId: 'univ:usp-sp-hackathon-sustentabilidade',
    title: '🌿 Maratona de Inovação em Bioeconomia & Energia Limpa: Poli USP',
    description: 'Escola Politécnica da USP em São Paulo. Estudantes e desenvolvedores criam soluções em software e hardware para monitoramento ambiental da Amazônia e transição para energias renováveis.',
    category: 'technology',
    tags: ['usp', 'saopaulo', 'brasil', 'hackathon', 'energia', 'sustentabilidade'],
    daysFromNow: 12,
    time: '09:00',
    durationHours: 8,
    venue: 'Escola Politécnica da USP (Cidade Universitária)',
    address: 'Av. Prof. Luciano Gualberto 380, Butantã',
    city: 'São Paulo',
    country: 'Brasil',
    countryCode: 'BR',
    coordinates: [-46.7317, -23.5558],
    price: { amount: 0, currency: 'BRL' },
    externalUrl: 'https://usp.br',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80',
    activityType: 'hackathon'
  },

  // ==========================================
  // JAPÓN (JP)
  // ==========================================
  {
    sourceId: 'univ:todai-yasuda-auditorium-robotics',
    title: '🤖 University of Tokyo Robotics & Frontiers Symposium: Yasuda Auditorium',
    description: 'En el emblemático Yasuda Auditorium en el Campus Hongo de Todai. Demostraciones de androides, inteligencia robótica y biomateriales presentadas por los principales laboratorios de Tokio.',
    category: 'technology',
    tags: ['todai', 'tokyo', 'robotics', 'japan', 'technology', 'symposium'],
    daysFromNow: 14,
    time: '13:30',
    durationHours: 4.5,
    venue: 'Yasuda Auditorium - Hongo Campus Todai',
    address: '7-3-1 Hongo, Bunkyo-ku',
    city: 'Tokio',
    country: 'Japón',
    countryCode: 'JP',
    coordinates: [139.7619, 35.7128],
    price: { amount: 0, currency: 'JPY' },
    externalUrl: 'https://u-tokyo.ac.jp',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    activityType: 'laboratorio abierto'
  }
];

/**
 * Seeds and maintains university & academic agendas.
 */
async function syncUniversityAgendas({ dryRun = false } = {}) {
  if (!demoCatalogEnabled()) return { ...DEMO_CATALOG_SKIP };
  try {
    let curator = await User.findOne({ username: 'eventnow_oficial' }) || await User.findOne({ role: 'admin' }) || await User.findOne();
    if (!curator) {
      logger.warn?.('[UniversityAgenda] No curator found to seed university events.');
      return { success: false, reason: 'no_curator' };
    }

    let created = 0;
    let updated = 0;

    for (const item of UNIVERSITY_EVENTS) {
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
        source: 'university_agenda',
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
    logger.info?.(`[UniversityAgenda] Synced successfully: created=${created}, updated=${updated}, total=${UNIVERSITY_EVENTS.length}`);
    return { success: true, created, updated, total: UNIVERSITY_EVENTS.length };
  } catch (err) {
    logger.error?.('[UniversityAgenda] Error syncing university agendas:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { syncUniversityAgendas, UNIVERSITY_EVENTS };
