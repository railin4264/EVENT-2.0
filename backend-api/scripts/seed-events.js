/**
 * Seed events into the database.
 *
 * 1) If TICKETMASTER_API_KEY and/or EVENTBRITE_API_KEY are set, real official
 *    events are pulled and stored via the eventAggregator (recommended for
 *    production so the global map is never empty).
 * 2) Always seeds a set of demo events around major world cities so the map
 *    is usable immediately, even before API keys are configured.
 *
 * Usage:
 *   node scripts/seed-events.js            # demo + real (if keys present)
 *   node scripts/seed-events.js --no-demo  # only real official events
 */

const path = require('path');

// Load env (best-effort)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) { /* dotenv optional */ }

const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const aggregator = require('../src/services/eventAggregator');

const DEMO_EVENTS = [
  {
    title: 'Festival de Música Electrónica - Madrid',
    description: 'Una noche inolvidable con los mejores DJs de música electrónica en el corazón de Madrid.',
    category: 'music',
    tags: ['music', 'festival', 'electronic'],
    location: { type: 'Point', coordinates: [-3.7038, 40.4168], address: 'Madrid, España' },
    venue: 'WiZink Center',
    date: daysFromNow(7),
    price: { amount: 45, currency: 'EUR' },
    images: [{ url: 'https://picsum.photos/seed/madrid-music/800/400' }]
  },
  {
    title: 'Tech Conference 2026 - New York',
    description: 'La conferencia de tecnología más importante del año con ponentes de todo el mundo.',
    category: 'technology',
    tags: ['tech', 'conference', 'ai'],
    location: { type: 'Point', coordinates: [-74.006, 40.7128], address: 'New York, USA' },
    venue: 'Javits Center',
    date: daysFromNow(14),
    price: { amount: 199, currency: 'USD' },
    images: [{ url: 'https://picsum.photos/seed/ny-tech/800/400' }]
  },
  {
    title: 'Festival Gastronómico - Ciudad de México',
    description: 'Descubre los sabores auténticos mexicanos en este festival de comida y cultura.',
    category: 'food',
    tags: ['food', 'festival', 'culture'],
    location: { type: 'Point', coordinates: [-99.1332, 19.4326], address: 'Ciudad de México, México' },
    venue: 'Zócalo CDMX',
    date: daysFromNow(10),
    price: { amount: 15, currency: 'MXN' },
    images: [{ url: 'https://picsum.photos/seed/mexico-food/800/400' }]
  },
  {
    title: 'Maratón Internacional - Londres',
    description: 'Corre por las calles históricas de Londres en la maratón más emblemática.',
    category: 'sports',
    tags: ['sports', 'running', 'marathon'],
    location: { type: 'Point', coordinates: [-0.1276, 51.5074], address: 'Londres, Reino Unido' },
    venue: 'The Mall',
    date: daysFromNow(21),
    price: { amount: 60, currency: 'GBP' },
    images: [{ url: 'https://picsum.photos/seed/london-run/800/400' }]
  },
  {
    title: 'Exposición de Arte Contemporáneo - París',
    description: 'Una muestra única de artistas contemporáneos en el museo más visitado del mundo.',
    category: 'art',
    tags: ['art', 'exhibition', 'culture'],
    location: { type: 'Point', coordinates: [2.3522, 48.8566], address: 'París, Francia' },
    venue: 'Louvre',
    date: daysFromNow(5),
    price: { amount: 22, currency: 'EUR' },
    images: [{ url: 'https://picsum.photos/seed/paris-art/800/400' }]
  },
  {
    title: 'Concierto de Rock - Buenos Aires',
    description: 'Las bandas de rock más grandes de Latinoamérica en vivo en Buenos Aires.',
    category: 'music',
    tags: ['music', 'rock', 'concert'],
    location: { type: 'Point', coordinates: [-58.3816, -34.6037], address: 'Buenos Aires, Argentina' },
    venue: 'Estadio River Plate',
    date: daysFromNow(18),
    price: { amount: 50, currency: 'ARS' },
    images: [{ url: 'https://picsum.photos/seed/ba-rock/800/400' }]
  },
  {
    title: 'Feria de Emprendimiento - Bogotá',
    description: 'Conecta con emprendedores y aprende de los mejores mentores del ecosistema.',
    category: 'business',
    tags: ['business', 'startup', 'networking'],
    location: { type: 'Point', coordinates: [-74.0721, 4.711], address: 'Bogotá, Colombia' },
    venue: 'Corferias',
    date: daysFromNow(12),
    price: { amount: 0, currency: 'COP' },
    images: [{ url: 'https://picsum.photos/seed/bogota-biz/800/400' }]
  },
  {
    title: 'Carnaval de Santo Domingo',
    description: 'La celebración más colorida del Caribe con música, baile y cultura dominicana.',
    category: 'party',
    tags: ['party', 'carnival', 'caribbean'],
    location: { type: 'Point', coordinates: [-69.9312, 18.4719], address: 'Santo Domingo, República Dominicana' },
    venue: 'Malecón',
    date: daysFromNow(30),
    price: { amount: 10, currency: 'DOP' },
    images: [{ url: 'https://picsum.photos/seed/sd-carnival/800/400' }]
  },
  {
    title: 'Workshop de Fotografía - Barcelona',
    description: 'Aprende técnicas de fotografía urbana con fotógrafos profesionales.',
    category: 'education',
    tags: ['education', 'photography', 'workshop'],
    location: { type: 'Point', coordinates: [2.1734, 41.3851], address: 'Barcelona, España' },
    venue: 'CCCB',
    date: daysFromNow(8),
    price: { amount: 35, currency: 'EUR' },
    images: [{ url: 'https://picsum.photos/seed/bcn-photo/800/400' }]
  },
  {
    title: 'Festival de Cine - Los Ángeles',
    description: 'Estrenos exclusivos y encuentros con directores en la capital del cine.',
    category: 'art',
    tags: ['film', 'festival', 'cinema'],
    location: { type: 'Point', coordinates: [-118.2437, 34.0522], address: 'Los Ángeles, USA' },
    venue: 'TCL Chinese Theatre',
    date: daysFromNow(25),
    price: { amount: 75, currency: 'USD' },
    images: [{ url: 'https://picsum.photos/seed/la-film/800/400' }]
  },
  {
    title: 'Yoga al Amanecer - Miami',
    description: 'Comienza el día con una sesión de yoga en la playa con la comunidad local.',
    category: 'health',
    tags: ['health', 'yoga', 'wellness'],
    location: { type: 'Point', coordinates: [-80.1918, 25.7617], address: 'Miami, USA' },
    venue: 'South Beach',
    date: daysFromNow(3),
    price: { amount: 12, currency: 'USD' },
    images: [{ url: 'https://picsum.photos/seed/miami-yoga/800/400' }]
  },
  {
    title: 'Festival de Cerveza Artesanal - Berlín',
    description: 'Más de 100 cervezas artesanales de toda Europa en un solo lugar.',
    category: 'food',
    tags: ['food', 'beer', 'festival'],
    location: { type: 'Point', coordinates: [13.405, 52.52], address: 'Berlín, Alemania' },
    venue: 'Tempelhof',
    date: daysFromNow(16),
    price: { amount: 20, currency: 'EUR' },
    images: [{ url: 'https://picsum.photos/seed/berlin-beer/800/400' }]
  }
];

function daysFromNow(d) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt;
}

async function getSystemUser() {
  let u = await User.findOne({ email: 'system@eventconnect.app' });
  if (!u) {
    u = await User.create({
      username: 'eventconnect_system',
      email: 'system@eventconnect.app',
      password: require('crypto').randomBytes(32).toString('hex'),
      isEmailVerified: true,
      role: 'system'
    });
  }
  return u;
}

async function seedDemo(systemUser) {
  let created = 0;
  for (const ev of DEMO_EVENTS) {
    const existing = await Event.findOne({ title: ev.title, source: { $in: [null, undefined, 'demo'] } });
    if (existing) continue;
    await Event.create({ ...ev, createdBy: systemUser._id, status: 'published', imported: false });
    created += 1;
  }
  return created;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect';
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);
  console.log('Connected.');

  const systemUser = await getSystemUser();

  const onlyReal = process.argv.includes('--no-demo');
  if (!onlyReal) {
    const demoCount = await seedDemo(systemUser);
    console.log(`Demo events seeded: ${demoCount}`);
  }

  if (process.env.TICKETMASTER_API_KEY || process.env.EVENTBRITE_API_KEY) {
    console.log('Aggregating real official events...');
    const result = await aggregator.aggregateAndStore({ size: 50 });
    console.log(`Official events -> fetched: ${result.fetched}, created: ${result.created}, updated: ${result.updated}`);
  } else {
    console.log('No API keys set (TICKETMASTER_API_KEY / EVENTBRITE_API_KEY) — skipping official aggregation.');
  }

  const total = await Event.countDocuments({ status: 'published' });
  console.log(`Total published events in DB: ${total}`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
