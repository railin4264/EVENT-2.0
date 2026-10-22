const mongoose = require('mongoose');

// Helper to calculate future date relative to now
const daysFromNow = (days, hour = 18, minute = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const MASTER_EVENTS = [
  // ─────────────────────────────────────────────────────────────
  // 1. ACTIVIDADES EDUCATIVAS, CURSOS, TALLERES & CONFERENCIAS
  // ─────────────────────────────────────────────────────────────
  {
    title: 'Masterclass: Inteligencia Artificial para Negocios y Creadores en RD',
    description: 'Aprende a integrar herramientas de IA generativa (ChatGPT, Claude, Midjourney) para automatizar ventas, redacción de propuestas y creación de contenido en el mercado dominicano. Incluye acceso a plantillas y networking con founders.',
    category: 'education',
    activityType: 'Taller / Masterclass',
    date: daysFromNow(4, 18, 30),
    endDate: daysFromNow(4, 21, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9312, 18.4861],
      address: 'Av. Winston Churchill esq. Gustavo Mejía Ricart, Piantini',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Santo Domingo Tech Hub (Torre Acrópolis)'
    },
    price: { amount: 2500, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['inteligencia-artificial', 'tech', 'taller', 'emprendimiento', 'santo-domingo'],
    images: [{ url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80', isCover: true }],
    maxAttendees: 60,
    status: 'published',
    isOfficial: true,
    isFeatured: true,
    isSoloFriendly: true,
    soloWelcomeNote: 'Mesa de networking para profesionales y freelancers que asisten individualmente.'
  },
  {
    title: 'Taller de Finanzas Personales: Del Serrucho al Ahorro e Inversión',
    description: 'Estrategias claras para organizar tu flujo de caja, eliminar deudas en pesos dominicanos y empezar a invertir en fondos de inversión (AFI) y certificados del Banco Central de la República Dominicana. No requiere conocimientos financieros previos.',
    category: 'business',
    activityType: 'Taller Financiero',
    date: daysFromNow(6, 10, 0),
    endDate: daysFromNow(6, 13, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9372, 18.4682],
      address: 'Av. Abraham Lincoln esq. Rómulo Betancourt, Bella Vista',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Auditorio Centro PyME PUCMM'
    },
    price: { amount: 1200, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['finanzas', 'inversion', 'taller', 'educacion-financiera', 'rd'],
    images: [{ url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80', isCover: true }],
    maxAttendees: 80,
    status: 'published',
    isOfficial: true
  },
  {
    title: 'Cata Guiada & Taller de Barismo de Café de Especialidad Dominicano',
    description: 'Descubre los perfiles sensoriales del café cultivado en Polo (Barahona), Jarabacoa y Los Cacaos. Aprenderás técnicas de extracción manual (V60, Chemex y Aeropress) guiado por baristas campeones nacionales. Incluye degustación de 4 variedades y maridaje de chocolate criollo.',
    category: 'food',
    activityType: 'Cata y Taller',
    date: daysFromNow(5, 16, 0),
    endDate: daysFromNow(5, 18, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8856, 18.4748],
      address: 'Calle Arzobispo Nouel 154, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Café Maguana & Espacio Cultural'
    },
    price: { amount: 1800, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['cafe-dominicano', 'barismo', 'cata', 'zona-colonial', 'gastronomia'],
    images: [{ url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80', isCover: true }],
    maxAttendees: 25,
    status: 'published',
    isSoloFriendly: true
  },
  {
    title: 'Conferencia: Inversión Inmobiliaria Turística & Airbnb en República Dominicana',
    description: 'Encuentro con expertos en derecho inmobiliario, promotores y administradores de propiedades turísticas. Analizaremos rentabilidades netas, zonas con mayor plusvalía (Punta Cana, Las Terrenas, Jarabacoa) y régimen CONFOTUR.',
    category: 'business',
    activityType: 'Conferencia',
    date: daysFromNow(10, 17, 0),
    endDate: daysFromNow(10, 20, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-68.3684, 18.5601],
      address: 'Boulevard Turístico del Este, Downtown Punta Cana',
      city: 'Punta Cana',
      country: 'República Dominicana',
      venue: 'Salón de Convenciones Downtown Punta Cana'
    },
    price: { amount: 3500, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['bienes-raices', 'inversion', 'punta-cana', 'airbnb', 'conferencia'],
    images: [{ url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80', isCover: true }],
    maxAttendees: 120,
    status: 'published'
  },
  {
    title: 'Taller Práctico de Fotografía Urbana y Manejo de Luz Natural',
    description: 'Recorrido fotográfico guiado por las calles empedradas de la Zona Colonial y el Malecón. Aprende composición, captura de retrato callejero y cómo sacarle el máximo partido a tu cámara o smartphone en la hora dorada caribeña.',
    category: 'art',
    activityType: 'Taller al Aire Libre',
    date: daysFromNow(3, 16, 30),
    endDate: daysFromNow(3, 19, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8829, 18.4725],
      address: 'Parque Colón, Calle El Conde, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Punto de Encuentro: Estatua de Colón'
    },
    price: { amount: 950, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['fotografia', 'zona-colonial', 'taller', 'arte', 'santo-domingo'],
    images: [{ url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&q=80', isCover: true }],
    maxAttendees: 20,
    status: 'published',
    isSoloFriendly: true
  },

  // ─────────────────────────────────────────────────────────────
  // 2. EVENTOS DEPORTIVOS (LIDOM, PÁDEL, RUNNING, BASKET 3X3)
  // ─────────────────────────────────────────────────────────────
  {
    title: 'Béisbol Invernal LIDOM: Tigres del Licey vs Leones del Escogido',
    description: '¡El Clásico de la Capital! Tigres del Licey se miden contra los Leones del Escogido en una noche de pura pasión beisbolera. Disfruta de la banda de música en las gradas, plátano power, comida criolla y el mejor ambiente deportivo del Caribe.',
    category: 'sports',
    activityType: 'Béisbol Profesional LIDOM',
    date: daysFromNow(2, 19, 30),
    endDate: daysFromNow(2, 23, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9238, 18.4878],
      address: 'Av. Tiradentes esq. San Cristóbal, Ensanche La Fe',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Estadio Quisqueya Juan Marichal'
    },
    price: { amount: 650, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['lidom', 'beisbol', 'licey', 'escogido', 'estadio-quisqueya', 'deportes'],
    images: [{ url: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1200&q=80', isCover: true }],
    maxAttendees: 500,
    status: 'published',
    isOfficial: true,
    isFeatured: true,
    isSoloFriendly: true,
    soloWelcomeNote: 'Gradas del coro: nos juntamos en la entrada del Palco Bajo para entrar en grupo y cantar los coros.'
  },
  {
    title: 'LIDOM Cibao: Águilas Cibaeñas vs Gigantes del Cibao',
    description: 'La batalla del Cibao en el Estadio Cibao de Santiago. Las Águilas Cibaeñas reciben a los Gigantes del Cibao con el rugido de la fanaticada aguilucha en las graderías. Toda la comida típica, música de güira y tambora en vivo.',
    category: 'sports',
    activityType: 'Béisbol Profesional LIDOM',
    date: daysFromNow(4, 19, 0),
    endDate: daysFromNow(4, 22, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.7069, 19.4674],
      address: 'Av. Imbert, Ensanche Bolívar',
      city: 'Santiago de los Caballeros',
      country: 'República Dominicana',
      venue: 'Estadio Cibao'
    },
    price: { amount: 500, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['aguilas-cibaeas', 'gigantes-del-cibao', 'lidom', 'santiago', 'beisbol'],
    images: [{ url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&q=80', isCover: true }],
    maxAttendees: 350,
    status: 'published'
  },
  {
    title: 'Santo Domingo Pádel Open 2026: Torneo Amateur por Categorías',
    description: 'Torneo abierto de pádel para categorías 3ra, 4ta, 5ta y Mixto. Partidos continuos en canchas techadas con grama sintética profesional, hidratación premium, zona lounge para espectadores y fiesta de clausura con DJ en vivo.',
    category: 'sports',
    activityType: 'Torneo de Pádel',
    date: daysFromNow(8, 9, 0),
    endDate: daysFromNow(8, 20, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9365, 18.4735],
      address: 'Calle Manuel de Jesús Troncoso, Piantini',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Santo Domingo Pádel Club'
    },
    price: { amount: 2000, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['padel', 'torneo', 'piantini', 'santo-domingo', 'deportes'],
    images: [{ url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80', isCover: true }],
    maxAttendees: 64,
    status: 'published'
  },
  {
    title: 'Torneo Callejero de Baloncesto 3x3 del Malecón',
    description: 'Competencia urbana de baloncesto 3 contra 3 con vista al Mar Caribe. Música de hip hop y dembow en vivo, animación de MC, premios para los primeros tres lugares y concurso de tiros de tres puntos. Entrada libre para el público.',
    category: 'sports',
    activityType: 'Baloncesto Urbano',
    date: daysFromNow(5, 16, 0),
    endDate: daysFromNow(5, 21, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9042, 18.4611],
      address: 'Av. George Washington (Frente a Parque Eugenio María de Hostos)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Canchas Abiertas del Malecón'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['basket-3x3', 'baloncesto', 'malecon', 'santo-domingo', 'urbano'],
    images: [{ url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80', isCover: true }],
    maxAttendees: 200,
    status: 'published'
  },
  {
    title: '5K Running al Amanecer en el Mirador Sur',
    description: 'Corre o camina 5 kilómetros por la ruta ecológica del Parque Mirador Sur mientras amanece. Incluye cronometraje por chip electrónico, medalla de participación para los finishers, hidratación en ruta y sesión de estiramiento guiada.',
    category: 'sports',
    activityType: 'Carrera 5K',
    date: daysFromNow(7, 6, 0),
    endDate: daysFromNow(7, 8, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9458, 18.4412],
      address: 'Av. Anacaona (Kilómetro Cero del Parque)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Parque Mirador Sur - Km 0'
    },
    price: { amount: 800, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['running', '5k', 'mirador-sur', 'salud', 'fitness', 'deportes'],
    images: [{ url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80', isCover: true }],
    maxAttendees: 300,
    status: 'published'
  },

  // ─────────────────────────────────────────────────────────────
  // 3. ARTE, MUSEOS & CULTURA DOMINICANA
  // ─────────────────────────────────────────────────────────────
  {
    title: 'Noche Larga de Museos: Ciudad Colonial (Entrada Libre)',
    description: 'Celebramos la riqueza histórica y cultural de la primera ciudad de América. Acceso nocturno gratuito al Alcázar de Colón, Museo de las Casas Reales, Fortaleza Ozama y Museo de la Resistencia. Incluye presentaciones teatrales de época y música en las plazas.',
    category: 'art',
    activityType: 'Noche de Museos',
    date: daysFromNow(3, 18, 0),
    endDate: daysFromNow(3, 23, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8829, 18.4771],
      address: 'Plaza España, Calle La Atarazana, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Alcázar de Colón & Plaza España'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['museos', 'alcazar-de-colon', 'zona-colonial', 'arte', 'cultura', 'gratis'],
    images: [{ url: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=1200&q=80', isCover: true }],
    maxAttendees: 600,
    status: 'published',
    isOfficial: true,
    isFeatured: true
  },
  {
    title: 'Exposición Bienal Nacional de Artes Visuales',
    description: 'La muestra artística más importante del país en el Museo de Arte Moderno. Pintura contemporánea, instalaciones interactivas, esculturas y fotografía de destacados maestros y artistas emergentes dominicanos. Visitas guiadas por curadores cada hora.',
    category: 'art',
    activityType: 'Exposición de Museo',
    date: daysFromNow(5, 10, 0),
    endDate: daysFromNow(5, 18, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9102, 18.4725],
      address: 'Plaza de la Cultura Juan Pablo Duarte, Av. Pedro Henríquez Ureña',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Museo de Arte Moderno (MAM)'
    },
    price: { amount: 150, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['arte-moderno', 'bienal', 'museo', 'plaza-de-la-cultura', 'artes-visuales'],
    images: [{ url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&q=80', isCover: true }],
    maxAttendees: 200,
    status: 'published'
  },
  {
    title: 'Noche Bohemia: Jazz & Poesía en Casa de Teatro',
    description: 'El legendario patio de Casa de Teatro se viste de luces cálidas para una noche de jazz caribeño en vivo, recitación poética y tertulia cultural. Un refugio bohemio en el corazón de la Ciudad Colonial fundado por Freddy Ginebra.',
    category: 'music',
    activityType: 'Concierto Bohemio',
    date: daysFromNow(4, 20, 0),
    endDate: daysFromNow(4, 23, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8837, 18.4728],
      address: 'Calle Arzobispo Meriño 110, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Casa de Teatro (Patio Central)'
    },
    price: { amount: 500, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['jazz', 'bohemia', 'casa-de-teatro', 'zona-colonial', 'poesia'],
    images: [{ url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80', isCover: true }],
    maxAttendees: 100,
    status: 'published',
    isSoloFriendly: true
  },
  {
    title: 'Recorrido Nocturno: Cultura del Tabaco y Raíces Caribeñas en Centro León',
    description: 'Visita guiada nocturna al Centro León en Santiago. Aprende sobre el proceso artesanal de elaboración del cigarro dominicano, las raíces taínas y africanas de nuestra identidad y las colecciones pictóricas de don Eduardo León Jimenes.',
    category: 'art',
    activityType: 'Visita de Museo Guiada',
    date: daysFromNow(9, 18, 30),
    endDate: daysFromNow(9, 21, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.6729, 19.4518],
      address: 'Av. 27 de Febrero 146, Villa Progreso',
      city: 'Santiago de los Caballeros',
      country: 'República Dominicana',
      venue: 'Centro León'
    },
    price: { amount: 300, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['centro-leon', 'santiago', 'museo', 'tabaco', 'arte-dominicano'],
    images: [{ url: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&q=80', isCover: true }],
    maxAttendees: 80,
    status: 'published'
  },

  // ─────────────────────────────────────────────────────────────
  // 4. ACTIVIDADES FIJAS Y RECURRENTES (TODAS LAS SEMANAS)
  // ─────────────────────────────────────────────────────────────
  {
    title: 'Fiesta de los Domingos con Grupo Bonyé (En Vivo)',
    description: 'La tradición por excelencia de los domingos en Santo Domingo. Cientos de personas se reúnen al aire libre en las majestuosas ruinas franciscanas para bailar son, salsa, merengue tradicional y jazz latino interpretados por Grupo Bonyé. Trae tu silla o baila en el adoquín.',
    category: 'music',
    activityType: 'Baile Tradicional al Aire Libre',
    date: daysFromNow(4, 17, 0),
    endDate: daysFromNow(4, 21, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8847, 18.4776],
      address: 'Calle Hostos esq. Emiliano Tejera, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Ruinas de San Francisco'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['bonye', 'ruinas-san-francisco', 'salsa', 'son', 'merengue', 'zona-colonial', 'fijo-semanal'],
    images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80', isCover: true }],
    maxAttendees: 800,
    status: 'published',
    isOfficial: true,
    isFeatured: true,
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayOfWeek: 'Sunday',
      timeText: 'Todos los domingos a las 5:00 PM'
    },
    isSoloFriendly: true,
    soloWelcomeNote: 'Coro de bienvenida frente a la glorieta: aquí todo el mundo saca a bailar a todo el mundo con respeto y sabor.'
  },
  {
    title: 'Work in the Park & Sunset: Networking al Aire Libre',
    description: 'Todos los jueves por la tarde cambiamos la oficina por la brisa del Parque Mirador Sur. Trae tu laptop o libreta, comparte ideas con otros profesionales remotos y cerramos la jornada con una caminata al atardecer y bebidas frías.',
    category: 'community',
    activityType: 'Encuentro Semanal Fijo',
    date: daysFromNow(1, 16, 30),
    endDate: daysFromNow(1, 19, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9458, 18.4412],
      address: 'Av. Anacaona (Frente a Torre Caney)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Parque Mirador Sur (Área de Gazebos)'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['work-in-the-park', 'mirador-sur', 'networking', 'coworking', 'fijo-semanal'],
    images: [{ url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80', isCover: true }],
    maxAttendees: 50,
    status: 'published',
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayOfWeek: 'Thursday',
      timeText: 'Todos los jueves a las 4:30 PM'
    },
    isSoloFriendly: true
  },
  {
    title: 'Biciruta Familiar de los Domingos: Malecón Libre de Autos',
    description: 'El Malecón de Santo Domingo se convierte en una vía peatonal y ciclista exclusiva todos los domingos por la mañana. Alquila tu bicicleta en el punto de partida o trae la tuya para patinar, trotar o pedalear con la brisa marina.',
    category: 'sports',
    activityType: 'Ciclismo Urbano',
    date: daysFromNow(4, 8, 0),
    endDate: daysFromNow(4, 12, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9042, 18.4611],
      address: 'Av. George Washington (Desde Av. Máximo Gómez hasta Calle Huáscar Tejeda)',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Malecón Peatonal de Santo Domingo'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['biciruta', 'ciclismo', 'malecon', 'santo-domingo', 'familia', 'fijo-semanal'],
    images: [{ url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&q=80', isCover: true }],
    maxAttendees: 400,
    status: 'published',
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayOfWeek: 'Sunday',
      timeText: 'Todos los domingos de 8:00 AM a 12:00 PM'
    }
  },
  {
    title: 'Ajedrez en la Plaza del Parque Duarte',
    description: 'Encuentro abierto de ajedrez rápido y clásico en las mesas del Parque Duarte. Desde principiantes hasta maestros de club, todos son bienvenidos para jugar partidas amistosas con café colado y buena conversación colonial.',
    category: 'community',
    activityType: 'Ajedrez al Aire Libre',
    date: daysFromNow(3, 16, 0),
    endDate: daysFromNow(3, 19, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8872, 18.4719],
      address: 'Calle Padre Billini esq. Duarte, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Parque Duarte'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['ajedrez', 'parque-duarte', 'zona-colonial', 'comunidad', 'fijo-semanal'],
    images: [{ url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&q=80', isCover: true }],
    maxAttendees: 40,
    status: 'published',
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayOfWeek: 'Saturday',
      timeText: 'Todos los sábados a las 4:00 PM'
    },
    isSoloFriendly: true
  },
  {
    title: 'Clases Abiertas de Salsa & Bachata Social',
    description: 'Aprende los pasos esenciales del baile dominicano al aire libre en el Parque Iberoamérica. Una hora de instrucción paso a paso (nivel básico a intermedio) seguida de dos horas de baile social con música en vivo y animación.',
    category: 'art',
    activityType: 'Baile Social',
    date: daysFromNow(2, 19, 0),
    endDate: daysFromNow(2, 22, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9192, 18.4721],
      address: 'Parque Iberoamérica, Calle César Nicolás Penson',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      venue: 'Parque Iberoamérica (Glorieta Central)'
    },
    price: { amount: 0, currency: 'DOP' },
    paymentMode: 'free',
    tags: ['bachata', 'salsa', 'baile', 'parque-iberoamerica', 'fijo-semanal'],
    images: [{ url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=1200&q=80', isCover: true }],
    maxAttendees: 150,
    status: 'published',
    isRecurring: true,
    recurringSchedule: {
      frequency: 'weekly',
      dayOfWeek: 'Friday',
      timeText: 'Todos los viernes a las 7:00 PM'
    },
    isSoloFriendly: true
  },

  // ─────────────────────────────────────────────────────────────
  // 5. TOURS, EXCURSIONES Y ESCAPADAS DOMINICANAS
  // ─────────────────────────────────────────────────────────────
  {
    title: 'Excursión de Aventura: 27 Charcos de Damajagua',
    description: 'Pasadía de ecoturismo y adrenalina en los saltos y cañones naturales de Damajagua en Puerto Plata. Incluye saltos a pozas de agua turquesa, toboganes de roca natural, equipo de seguridad certificado (casco y chaleco), transporte climatizado ida y vuelta y almuerzo buffet campestre.',
    category: 'outdoors',
    activityType: 'Excursión / Ecoturismo',
    date: daysFromNow(6, 6, 0),
    endDate: daysFromNow(6, 19, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.8122, 19.7428],
      address: 'Carretera Navarrete - Puerto Plata Km 14',
      city: 'Puerto Plata',
      country: 'República Dominicana',
      venue: 'Monumento Natural 27 Charcos de Damajagua'
    },
    price: { amount: 3200, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['27-charcos', 'damajagua', 'puerto-plata', 'aventura', 'ecoturismo', 'tour'],
    images: [{ url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', isCover: true }],
    maxAttendees: 30,
    status: 'published',
    isTourOrTrip: true,
    tourDetails: {
      departurePoint: 'Salida coordinada desde Galerías 360 (Santo Domingo)',
      includes: [
        'Transporte ida y vuelta en autobús turístico con A/C',
        'Entrada al parque ecológico Damajagua',
        'Guía oficial y chaleco salvavidas / casco',
        'Almuerzo típico buffet dominicano'
      ]
    },
    isSoloFriendly: true
  },
  {
    title: 'Pasadía Cayo Levantado & Santuario de Ballenas Jorobadas',
    description: 'Temporada oficial de avistamiento de ballenas jorobadas en la hermosa bahía de Samaná. Navegamos en catamarán con biólogos marinos hasta los bancos de reproducción y luego disfrutamos de una tarde de playa de arena blanca y cocos en Cayo Levantado.',
    category: 'outdoors',
    activityType: 'Pasadía Ecológico',
    date: daysFromNow(7, 5, 30),
    endDate: daysFromNow(7, 20, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.3333, 19.2000],
      address: 'Puerto Marítimo de Samaná, Malecón',
      city: 'Samaná',
      country: 'República Dominicana',
      venue: 'Bahía de Samaná & Cayo Levantado'
    },
    price: { amount: 4500, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['ballenas-jorobadas', 'cayo-levantado', 'samana', 'playa', 'ecoturismo', 'tour'],
    images: [{ url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=80', isCover: true }],
    maxAttendees: 40,
    status: 'published',
    isTourOrTrip: true,
    tourDetails: {
      departurePoint: 'Salida coordinada desde Estación Metro Juan Pablo Duarte',
      includes: [
        'Transporte terrestre con A/C',
        'Paseo en catamarán con seguro marítimo',
        'Guía naturalista certificado',
        'Almuerzo frente al mar en Cayo Levantado'
      ]
    },
    isSoloFriendly: true
  },
  {
    title: 'Ruta del Café, Fresas y Cascadas en Jarabacoa',
    description: 'Escapada a la Ciudad de la Eterna Primavera. Visitaremos plantaciones de café orgánico y campos de fresas en las montañas, paseo al Salto de Jimenoa y degustación de comida típica cocinada a leña en un mirador de la cordillera central.',
    category: 'outdoors',
    activityType: 'Ruta de Montaña',
    date: daysFromNow(8, 6, 30),
    endDate: daysFromNow(8, 19, 30),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-70.6278, 19.1219],
      address: 'Carretera a Manabao Km 4',
      city: 'Jarabacoa',
      country: 'República Dominicana',
      venue: 'Salto de Jimenoa & Plantación Jarabacoa'
    },
    price: { amount: 2800, currency: 'DOP' },
    paymentMode: 'onsite',
    tags: ['jarabacoa', 'montaa', 'salto-jimenoa', 'cafe', 'ecoturismo', 'tour'],
    images: [{ url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80', isCover: true }],
    maxAttendees: 35,
    status: 'published',
    isTourOrTrip: true,
    isSoloFriendly: true
  }
];

async function seedMasterEcosystem() {
  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_DATA !== 'true') { console.log('Demo catalogue disabled; use an authorized ingestion source.'); return; }
  await mongoose.connect('mongodb://localhost:27017/eventconnect');
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));

  // Find admin or organizer user
  const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({});
  const organizerId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

  console.log('Using organizer ID:', organizerId);

  let inserted = 0;
  let updated = 0;

  for (const eventData of MASTER_EVENTS) {
    const existing = await Event.findOne({ title: eventData.title, source: 'demo_catalog' });
    if (!existing) {
      await Event.create({
        ...eventData,
        createdBy: organizerId,
        organizer: adminUser ? adminUser.username : 'eventnow_oficial',
        status: 'draft', source: 'demo_catalog', isOfficial: false, isFeatured: false, tags: [...(eventData.tags || []), 'demo'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      inserted++;
      console.log(`+ CREADO: [${eventData.category}] ${eventData.title}`);
    } else {
      await Event.updateOne({ _id: existing._id }, {
        $set: {
          ...eventData, status: 'draft', source: 'demo_catalog', isOfficial: false, isFeatured: false, tags: [...(eventData.tags || []), 'demo'],
          updatedAt: new Date()
        }
      });
      updated++;
      console.log(`* ACTUALIZADO: [${eventData.category}] ${eventData.title}`);
    }
  }

  const total = await Event.countDocuments();
  console.log(`\n=========================================`);
  console.log(`RESULTADO DE POBLACIÓN:`);
  console.log(`Insertados: ${inserted}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Total de Eventos en Base de Datos: ${total}`);
  console.log(`=========================================\n`);

  process.exit(0);
}

seedMasterEcosystem().catch(err => {
  console.error('Error seeding master ecosystem:', err);
  process.exit(1);
});
