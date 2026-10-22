const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/services/eventIngestion/planetaryCatalog.js');
let content = fs.readFileSync(file, 'utf8');

const newItems = `  // =========================================================================
  // 10. FAMILIA, BEBÉS & MATERNIDAD SEGURA 🧸 (Comunidad Sensible & Cuidados)
  // =========================================================================
  {
    sourceId: 'do-sd-torneo-gateo-bebes-2026',
    title: 'Torneo de Gateo & Estimulación Sensorial para Bebés (6 a 18 meses)',
    description: 'Competencia recreativa y lúdica de gateo sobre colchonetas antialérgicas esterilizadas. Talleres de estimulación motriz temprana guiados por fisioterapeutas pediátricos, zona de descanso, estación de hidratación y medalla conmemorativa para todos los bebés participantes.',
    category: 'family',
    date: futureDate(5, 10, 0),
    endDate: futureDate(5, 13, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9392, 18.4715],
      address: 'Avenida John F. Kennedy con Tiradentes (Nivel 4)',
      venue: 'Ágora Cultural Kids & Family Space',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 350, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1200&q=80' }],
    maxAttendees: 80,
    tags: ['bebes', 'gateo', 'familia', 'estimulacion-temprana', 'ninos', 'santo-domingo'],
    isOfficial: true,
    activityType: 'baby_competition',
    familyDetails: {
      isFamilyEvent: true,
      targetAudience: 'babies',
      ageMinMonths: 6,
      ageMaxMonths: 18,
      strollerAccessible: true,
      nursingRoomAvailable: true,
      diaperChangingStation: true,
      supervisionRequired: true,
      safetyNotes: 'Acompañamiento obligatorio de al menos un padre o tutor legal. Pistas acolchadas higienizadas.'
    }
  },
  {
    sourceId: 'do-sd-taller-lactancia-maternidad-2026',
    title: 'Taller de Lactancia Materna, Postparto y Crianza Respetuosa',
    description: 'Espacio cálido y seguro para futuras madres, madres lactantes y sus parejas. Asesoría con consultoras internacionales de lactancia (IBCLC), técnicas de agarre sin dolor, gestión del sueño infantil, nutrición postparto y círculo de escucha emocional.',
    category: 'education',
    date: futureDate(4, 15, 30),
    endDate: futureDate(4, 18, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9312, 18.4861],
      address: 'Avenida Winston Churchill, Piantini',
      venue: 'Centro de Bienestar Materno-Infantil',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 800, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80' }],
    maxAttendees: 35,
    tags: ['maternidad', 'lactancia', 'madres', 'postparto', 'bebes', 'crianza'],
    isOfficial: true,
    activityType: 'parenting_workshop',
    familyDetails: {
      isFamilyEvent: true,
      targetAudience: 'parents',
      strollerAccessible: true,
      nursingRoomAvailable: true,
      diaperChangingStation: true,
      supervisionRequired: false
    }
  },

  // =========================================================================
  // 11. DÍAS FESTIVOS & CELEBRACIONES TEMÁTICAS 💐❤️
  // =========================================================================
  {
    sourceId: 'do-sd-especial-madres-botanico-2026',
    title: 'Especial Día de las Madres: Serenata & Picnic en el Jardín Botánico',
    description: 'Celebración familiar para homenajear a las madres en su día. Ensamble de cuerdas en vivo bajo los árboles del pabellón de helechos, merienda campestre, sesiones fotográficas familiares gratuitas y flores de bienvenida para cada madre.',
    category: 'music',
    date: futureDate(9, 11, 0),
    endDate: futureDate(9, 16, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9547, 18.4908],
      address: 'Avenida República de Colombia, Los Jardines',
      venue: 'Jardín Botánico Nacional Dr. Rafael M. Moscoso',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 450, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80' }],
    maxAttendees: 1500,
    tags: ['dia-de-las-madres', 'madres', 'familia', 'botanico', 'serenata', 'musica'],
    isOfficial: true,
    activityType: 'holiday_celebration',
    holidaySeason: 'mothers_day',
    holidayLabel: 'Especial Día de las Madres',
    familyDetails: {
      isFamilyEvent: true,
      targetAudience: 'all_family',
      strollerAccessible: true,
      diaperChangingStation: true
    }
  },
  {
    sourceId: 'es-mad-san-valentin-tardeo-2026',
    title: 'Especial San Valentín: Tardeo Romántico & Jazz Acústico en el Retiro',
    description: 'Celebración del amor y la amistad en los jardines históricos de Madrid. Paseo en barca por el estanque, cócteles de autor con fresas silvestres, velas al caer la noche y música íntima de saxofón y guitarra española.',
    category: 'music',
    date: futureDate(3, 18, 0),
    endDate: futureDate(3, 22, 0),
    timeZone: 'Europe/Madrid',
    location: {
      type: 'Point',
      coordinates: [-3.6838, 40.4153],
      address: 'Plaza de la Independencia 7, Parque del Retiro',
      venue: 'Estanque Grande y Terrazas del Retiro',
      city: 'Madrid',
      country: 'España',
      countryCode: 'ES'
    },
    price: { amount: 25, currency: 'EUR' },
    images: [{ url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&q=80' }],
    maxAttendees: 400,
    tags: ['san-valentin', 'amor', 'madrid', 'retiro', 'jazz', 'romantico'],
    isOfficial: true,
    activityType: 'romantic_gathering',
    holidaySeason: 'valentines',
    holidayLabel: 'Especial San Valentín'
  },

  // =========================================================================
  // 12. SALUD COMUNITARIA & INVESTIGACIÓN CIENTÍFICA ACREDITADA 🏥🔬
  // =========================================================================
  {
    sourceId: 'do-sd-jornada-salud-comunitaria-2026',
    title: 'Jornada Comunitaria de Salud Visual, Pediatría y Chequeos Gratuitos',
    description: 'Operativo médico asistencial y preventivo para familias y adultos mayores. Consultas gratuitas de oftalmología (con entrega de lentes de lectura según evaluación), despistaje de hipertensión/diabetes, vacunación pediátrica y orientación nutricional comunitaria.',
    category: 'health',
    date: futureDate(2, 8, 30),
    endDate: futureDate(2, 14, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.8974, 18.4725],
      address: 'Calle Caracas esq. Calle Ravelo, Villa Francisca',
      venue: 'Centro Comunitario & Parroquial Villa Francisca',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&q=80' }],
    maxAttendees: 500,
    tags: ['salud', 'operativo-medico', 'gratis', 'pediatria', 'oftalmologia', 'comunidad'],
    isOfficial: true,
    activityType: 'free_health_clinic',
    healthDetails: {
      isHealthInitiative: true,
      healthType: 'community_clinic',
      hospitalOrInstitution: 'Patronato de Salud Comunitaria & Cruz Roja Dominicana',
      medicalDisclaimer: 'Operativo médico preventivo y asistencial sin costo. Atención por orden de llegada con médicos colegiados y voluntarios de salud certificados.'
    }
  },
  {
    sourceId: 'do-sd-estudio-clinico-acreditado-2026',
    title: 'Ficha Informativa: Protocolo Clínico en Salud Cardiovascular (Centro Acreditado)',
    description: 'Aviso institucional de divulgación científica: centro de investigaciones biomédicas universitario abre convocatoria para protocolo observacional y clínico en prevención de factores de riesgo cardíaco. Incluye chequeos de laboratorio y seguimiento cardiológico especializado sin costo para participantes calificados.',
    category: 'health',
    date: futureDate(7, 9, 0),
    endDate: futureDate(7, 13, 0),
    timeZone: 'America/Santo_Domingo',
    location: {
      type: 'Point',
      coordinates: [-69.9115, 18.4731],
      address: 'Avenida Pedro Henríquez Ureña esq. Alma Mater',
      venue: 'Centro de Investigaciones Médicas y Biomédicas Universitario',
      city: 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO'
    },
    price: { amount: 0, currency: 'DOP' },
    images: [{ url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80' }],
    maxAttendees: 150,
    tags: ['investigacion-medica', 'salud', 'cardiologia', 'estudio-clinico', 'hospital'],
    isOfficial: true,
    activityType: 'clinical_trial_info',
    healthDetails: {
      isHealthInitiative: true,
      healthType: 'clinical_trial_info',
      hospitalOrInstitution: 'Centro de Investigaciones Médicas y Cardiovasculares (Hospital Universitario)',
      clinicalTrialId: 'NCT06184201',
      ethicsApprovalRef: 'Comité de Bioética en Investigación Ref. CBI-2026-44',
      medicalDisclaimer: 'Aviso estrictamente divulgativo e institucional de protocolo clínico aprobado. EventNow no intermedia ni diagnostica. La elegibilidad voluntaria se evalúa formalmente en la consulta médica del hospital patrocinador.'
    }
  }
];

module.exports = {`;

const target = `];

module.exports = {`;

if (content.includes(target)) {
  content = content.replace(target, () => newItems);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully appended Family, Holidays, and Health events to planetaryCatalog.js');
} else {
  console.error('Target not found in planetaryCatalog.js');
}
