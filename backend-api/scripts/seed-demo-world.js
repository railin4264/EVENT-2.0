/**
 * Explicitly fictional, local-only fixtures for manual EventNow testing.
 * Usage: NODE_ENV=development MONGODB_URI=mongodb://127.0.0.1:PORT/eventnow_local node scripts/seed-demo-world.js
 * No .env is loaded, no server/SDK is imported, and existing records are never replaced.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const { CATEGORIES } = require('../src/utils/categories');

const SEED_TAG = 'demo-world-v1';
const ACCOUNT_MARKER = 'Cuenta DEMO local de EventNow (seed-demo-world-v1). No representa a una persona ni organización real.';
const DEMO_ACCOUNT = Object.freeze({
  email: 'demo.eventnow@example.test', username: 'eventnow_demo',
  password: 'EventNowDemo!2026', firstName: 'Demo', lastName: 'EventNow',
  birthDate: '2000-01-15',
});

// Coordinates are approximate city centers, not advertised meeting venues.
const CITIES = [
  ['Santo Domingo', 'República Dominicana', 'DOP', 'America/Santo_Domingo', -69.9312, 18.4861],
  ['Santiago de los Caballeros', 'República Dominicana', 'DOP', 'America/Santo_Domingo', -70.6970, 19.4517],
  ['Punta Cana', 'República Dominicana', 'DOP', 'America/Santo_Domingo', -68.4055, 18.5601],
  ['Ciudad de México', 'México', 'MXN', 'America/Mexico_City', -99.1332, 19.4326],
  ['Guadalajara', 'México', 'MXN', 'America/Mexico_City', -103.3496, 20.6597],
  ['Bogotá', 'Colombia', 'COP', 'America/Bogota', -74.0721, 4.7110],
  ['Medellín', 'Colombia', 'COP', 'America/Bogota', -75.5812, 6.2442],
  ['Lima', 'Perú', 'PEN', 'America/Lima', -77.0428, -12.0464],
  ['Buenos Aires', 'Argentina', 'ARS', 'America/Argentina/Buenos_Aires', -58.3816, -34.6037],
  ['Santiago', 'Chile', 'CLP', 'America/Santiago', -70.6693, -33.4489],
  ['São Paulo', 'Brasil', 'BRL', 'America/Sao_Paulo', -46.6333, -23.5505],
  ['Río de Janeiro', 'Brasil', 'BRL', 'America/Sao_Paulo', -43.1729, -22.9068],
  ['Montevideo', 'Uruguay', 'UYU', 'America/Montevideo', -56.1645, -34.9011],
  ['San José', 'Costa Rica', 'CRC', 'America/Costa_Rica', -84.0907, 9.9281],
  ['Nueva York', 'Estados Unidos', 'USD', 'America/New_York', -74.0060, 40.7128],
  ['Miami', 'Estados Unidos', 'USD', 'America/New_York', -80.1918, 25.7617],
  ['Los Ángeles', 'Estados Unidos', 'USD', 'America/Los_Angeles', -118.2437, 34.0522],
  ['Toronto', 'Canadá', 'CAD', 'America/Toronto', -79.3832, 43.6532],
  ['Madrid', 'España', 'EUR', 'Europe/Madrid', -3.7038, 40.4168],
  ['Barcelona', 'España', 'EUR', 'Europe/Madrid', 2.1734, 41.3851],
  ['París', 'Francia', 'EUR', 'Europe/Paris', 2.3522, 48.8566],
  ['Londres', 'Reino Unido', 'GBP', 'Europe/London', -0.1276, 51.5072],
  ['Berlín', 'Alemania', 'EUR', 'Europe/Berlin', 13.4050, 52.5200],
  ['Lisboa', 'Portugal', 'EUR', 'Europe/Lisbon', -9.1393, 38.7223],
  ['Tokio', 'Japón', 'JPY', 'Asia/Tokyo', 139.6917, 35.6895],
  ['Seúl', 'Corea del Sur', 'KRW', 'Asia/Seoul', 126.9780, 37.5665],
  ['Sídney', 'Australia', 'AUD', 'Australia/Sydney', 151.2093, -33.8688],
  ['Melbourne', 'Australia', 'AUD', 'Australia/Melbourne', 144.9631, -37.8136],
];

const TITLES = {
  music: 'Jazz y cuerdas al atardecer', art: 'Pintura colectiva y color', dance: 'Bachata para principiantes',
  outdoors: 'Ruta verde y picnic', sports: 'Running a tu ritmo', wellness: 'Yoga y pausa consciente',
  food: 'Sabores del barrio', workshop: 'Cerámica desde cero', education: 'Café de idiomas',
  literature: 'Lecturas y café', technology: 'Ideas y prototipos digitales', gaming: 'Tarde de juegos de mesa',
  film: 'Cine bajo las estrellas', photography: 'Paseo de fotografía urbana', culture: 'Historias de la ciudad',
  community: 'Huerto y encuentro vecinal', family: 'Cuentos y juegos en familia', networking: 'Café entre profesionales',
  nightlife: 'Micrófono abierto y karaoke', entertainment: 'Teatro breve y comedia', business: 'Laboratorio de emprendimiento',
  health: 'Taller introductorio de primeros auxilios', religion: 'Diálogo sobre tradiciones espirituales',
  politics: 'Simulación de foro cívico', charity: 'Planificación de voluntariado', science: 'Exploración del cielo nocturno',
  party: 'Fiesta de ritmos del mundo', social: 'Conversaciones para conocer gente', other: 'Encuentro de ideas inesperadas',
};
const PHOTOS = [
  'photo-1465847899084-d164df4dedc6', 'photo-1513364776144-60967b0f800f',
  'photo-1451187580459-43490279c0fa', 'photo-1520523839898-5071216a7d33',
  'photo-1505373877841-8d25f7d46678', 'photo-1533105079780-92b9be482077',
  'photo-1529699211952-734e80c4d42b', 'photo-1545205597-3d9d02c29597',
  'photo-1544427920-c49ccfb85579', 'photo-1507692049790-de58290a4334',
  'photo-1492684223066-81342ee5ff30',
];
const PRICES = { DOP: 650, MXN: 250, COP: 35000, PEN: 40, ARS: 12000, CLP: 9000, BRL: 60, UYU: 550,
  CRC: 7000, USD: 18, CAD: 25, EUR: 20, GBP: 16, JPY: 2200, KRW: 18000, AUD: 28 };
const COUNTRY_CODES = { 'República Dominicana': 'DO', 'México': 'MX', 'Colombia': 'CO', 'Perú': 'PE',
  'Argentina': 'AR', 'Chile': 'CL', 'Brasil': 'BR', 'Uruguay': 'UY', 'Costa Rica': 'CR',
  'Estados Unidos': 'US', 'Canadá': 'CA', 'España': 'ES', 'Francia': 'FR', 'Reino Unido': 'GB',
  'Alemania': 'DE', 'Portugal': 'PT', 'Japón': 'JP', 'Corea del Sur': 'KR', 'Australia': 'AU' };

function assertLocalTarget(uri, environment = process.env.NODE_ENV) {
  if (String(environment || '').toLowerCase() === 'production') throw new Error('Seed DEMO prohibido en producción.');
  if (typeof uri !== 'string' || !/^mongodb:\/\//i.test(uri)) throw new Error('Se requiere una URI MongoDB local explícita.');
  let target;
  try { target = new URL(uri); } catch { throw new Error('URI MongoDB inválida.'); }
  const host = target.hostname.toLowerCase();
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host) || target.username || target.password ||
      target.pathname !== '/eventnow_local' || target.hash || target.search) {
    throw new Error('Solo se permite mongodb://HOST_LOOPBACK:PUERTO/eventnow_local sin credenciales ni opciones.');
  }
  return uri;
}

function dateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

// Convert a local calendar day/hour to an absolute UTC instant, including DST.
function localDayTime(now, timeZone, days, hour) {
  const today = dateParts(now, timeZone);
  const wall = Date.UTC(today.year, today.month - 1, today.day + days, hour);
  let instant = wall;
  for (let pass = 0; pass < 3; pass++) {
    const parts = dateParts(new Date(instant), timeZone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant += wall - represented;
  }
  return new Date(instant);
}

function eventId(index) {
  return new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`${SEED_TAG}:${index}`).digest('hex').slice(0, 24));
}

function buildDemoEvents(ownerId, now = new Date()) {
  if (!ownerId || !Number.isFinite(now.getTime())) throw new Error('Se requiere propietario y fecha válidos.');
  return Array.from({ length: 120 }, (_, index) => {
    const city = CITIES[index < 8 ? 0 : index % CITIES.length];
    const [name, country, currency, timeZone, longitude, latitude] = city;
    const category = CATEGORIES[index % CATEGORIES.length];
    const phaseIndex = index % 30;
    let date = localDayTime(now, timeZone, 2 + (index * 7) % 40, 9 + index % 11);
    let phase = 'proximo';
    if (phaseIndex === 0) { date = new Date(now.getTime() - 30 * 60000); phase = 'en-vivo'; }
    if (phaseIndex === 1) {
      const midnight = localDayTime(now, timeZone, 1, 0);
      date = new Date(now.getTime() + Math.min(10 * 60000, (midnight.getTime() - now.getTime()) / 2));
      phase = 'hoy';
    }
    if (phaseIndex === 2) { date = localDayTime(now, timeZone, 1, 18); phase = 'manana'; }
    if (phaseIndex === 3) { date = localDayTime(now, timeZone, 3, 17); phase = 'esta-semana'; }
    if (phaseIndex === 4) { date = localDayTime(now, timeZone, -3, 16); phase = 'pasado'; }
    const endDate = new Date(date.getTime() + (2 + index % 3) * 3600000);
    const isVirtual = index % 5 === 0;
    const isPaid = !isVirtual && index % 3 === 1;
    const isUnofficial = index % 2 === 1;
    const clock = new Intl.DateTimeFormat('es-DO', { timeZone, dateStyle: 'medium', timeStyle: 'short' });
    const key = `${SEED_TAG}-${String(index + 1).padStart(3, '0')}`;
    return {
      _id: eventId(index), title: `[DEMO] ${TITLES[category.slug]} - ${name}`,
      description: 'EVENTO FICTICIO DE DEMOSTRACIÓN. No es una convocatoria real, no reserves viajes ni realices pagos. ' +
        `${category.label}: ${category.activityTypes[index % Math.max(1, category.activityTypes.length)] || 'actividad abierta'}. ` +
        `Escenario ${isUnofficial ? 'comunitario no oficial' : 'de evento estándar'}, ${isVirtual ? 'virtual' : 'presencial'}, en ${name}, ${country}. ` +
        `Horario local: ${clock.format(date)} a ${clock.format(endDate)} (${timeZone}). ` +
        'La ubicación es aproximada y la imagen es ilustrativa. Datos para probar búsqueda, filtros, mapa y navegación.',
      category: category.slug, activityType: category.activityTypes[0] || 'encuentro abierto', timeZone,
      date, endDate, status: phase === 'pasado' ? 'completed' : 'published',
      location: { type: 'Point', coordinates: [longitude, latitude],
        city: name, country, countryCode: COUNTRY_CODES[country],
        address: `Punto DEMO aproximado, ${name}, ${country}`, venue: `Espacio DEMO - ${name}` },
      isVirtual, ...(isVirtual ? { virtualLink: `https://example.test/eventnow-demo/${key}` } : {}),
      images: [{ url: `https://images.unsplash.com/${PHOTOS[index % PHOTOS.length]}?w=1200&q=80` }],
      createdBy: ownerId, organizer: 'EventNow DEMO local', maxAttendees: 30 + (index % 8) * 20,
      isPrivate: false, isUnofficial, isSecretLocation: false,
      isSoloFriendly: true, soloWelcomeNote: 'Escenario DEMO para probar la bienvenida. No hay anfitrión confirmado.',
      soloWelcomeHost: { confirmed: false },
      price: { amount: isPaid ? PRICES[currency] : 0, currency }, paymentMode: isPaid ? 'onsite' : 'free',
      paymentInfo: isPaid ? 'DEMO: precio ilustrativo, sin cobros ni reservas reales. No envíes dinero.' : 'DEMO gratuito, sin convocatoria real.',
      tags: ['demo', SEED_TAG, key, phase, category.slug],
      imported: false, isFeatured: false, interestedCount: 0, trendingScore: 0,
      attendees: [], likes: [], shares: [], views: [], comments: [],
      ageRestriction: { minAge: category.slug === 'nightlife' || category.slug === 'party' ? 18 : 0,
        isAdultOnly: category.slug === 'nightlife' || category.slug === 'party' },
      safetyCoro: { enabled: false, carpoolZones: [], registeredCarpoolers: [] },
    };
  });
}

async function ensureDemoAccount(User) {
  const existing = await User.findOne({ $or: [{ email: DEMO_ACCOUNT.email }, { username: DEMO_ACCOUNT.username }] }).select('+password');
  if (existing) {
    if (existing.email !== DEMO_ACCOUNT.email || existing.username !== DEMO_ACCOUNT.username ||
        existing.bio !== ACCOUNT_MARKER || existing.role !== 'user') {
      throw new Error('La identidad DEMO ya existe sin el marcador esperado; no se modifica ni se reutiliza.');
    }
    if (!await existing.matchPassword(DEMO_ACCOUNT.password)) {
      throw new Error('La contraseña de la cuenta DEMO fue cambiada; no se restablece automáticamente.');
    }
    if (!existing.isActive || existing.twoFactor?.isEnabled) throw new Error('La cuenta DEMO no está disponible para el acceso simple; se conserva sin cambios.');
    return { user: existing, created: false };
  }
  const user = new User({ ...DEMO_ACCOUNT, bio: ACCOUNT_MARKER, role: 'user',
    isEmailVerified: true, verified: false, isOrganizerVerified: false,
    settings: { notifications: { email: false, push: false, eventReminders: false, newMessages: false, weeklyDigest: false },
      preferences: { timezone: 'America/Santo_Domingo', hideAdultOnly: false } },
    notificationSettings: { emailEnabled: false, pushEnabled: false,
      categories: { events: false, social: false, achievements: false, system: false } },
  });
  await user.save(); // Uses the normal password-hashing middleware.
  return { user, created: true };
}

async function seedDemoWorld({ connection = mongoose.connection, now = new Date() } = {}) {
  // Re-check the actual connected destination, not only an environment string.
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production' || connection.name !== 'eventnow_local' ||
      !['127.0.0.1', 'localhost', '::1'].includes(connection.host)) {
    throw new Error('La conexión activa debe ser la base local eventnow_local.');
  }
  const User = connection.model('User', require('../src/models/User').schema);
  const Event = connection.model('Event', require('../src/models/Event').schema);
  const { user, created: accountCreated } = await ensureDemoAccount(User);
  const payloads = buildDemoEvents(user._id, now);
  const records = await Event.find({ _id: { $in: payloads.map(payload => payload._id) } })
    .select('_id createdBy tags').lean();
  const recordsById = new Map(records.map(record => [String(record._id), record]));
  // Inspect every collision before creating any event, preserving manual edits.
  for (const record of records) {
    if (String(record.createdBy) !== String(user._id) || !record.tags.includes(SEED_TAG) || !record.tags.includes('demo')) {
      throw new Error('Colisión de identificador: se conserva el evento existente sin cambios.');
    }
  }
  let created = 0;
  let existing = 0;
  for (const payload of payloads) {
    const record = recordsById.get(String(payload._id));
    if (record) {
      existing += 1;
      continue;
    }
    try {
      await Event.create(payload);
      created += 1;
    } catch (error) {
      // A simultaneous run may have inserted the same deterministic ID.
      const duplicate = error.code === 11000 ? await Event.findById(payload._id) : null;
      if (!duplicate || String(duplicate.createdBy) !== String(user._id) ||
          !duplicate.tags.includes(SEED_TAG) || !duplicate.tags.includes('demo')) throw error;
      existing += 1;
    }
  }
  return { accountCreated, created, existing, total: created + existing, accountId: String(user._id),
    sampleEventIds: payloads.slice(0, 5).map(event => String(event._id)) };
}

async function main() {
  const uri = assertLocalTarget(process.env.MONGODB_URI);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    const result = await seedDemoWorld();
    console.log(JSON.stringify(result, null, 2));
    console.log(`Cuenta DEMO local: ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`);
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { assertLocalTarget, localDayTime, buildDemoEvents, ensureDemoAccount, seedDemoWorld,
  DEMO_ACCOUNT, ACCOUNT_MARKER, SEED_TAG, CITIES };
