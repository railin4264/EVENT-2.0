/**
 * Seed events into the database (ENRICHED demo mode).
 *
 * 1) If TICKETMASTER_API_KEY and/or EVENTBRITE_API_KEY are set, real official
 *    events are pulled and stored via the eventAggregator (recommended for
 *    production so the global map is never empty).
 * 2) Always seeds an ENRICHED set of demo events across ~40 world cities and
 *    every category so the global map looks alive immediately, even without API keys.
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

// [lat, lng, city, country]
const C = {
  madrid: [-3.7038, 40.4168, 'Madrid', 'España'],
  ny: [-74.006, 40.7128, 'New York', 'USA'],
  cdmx: [-99.1332, 19.4326, 'Ciudad de México', 'México'],
  london: [-0.1276, 51.5074, 'Londres', 'Reino Unido'],
  paris: [2.3522, 48.8566, 'París', 'Francia'],
  buenosAires: [-58.3816, -34.6037, 'Buenos Aires', 'Argentina'],
  bogota: [-74.0721, 4.711, 'Bogotá', 'Colombia'],
  santoDomingo: [-69.9312, 18.4719, 'Santo Domingo', 'República Dominicana'],
  barcelona: [2.1734, 41.3851, 'Barcelona', 'España'],
  la: [-118.2437, 34.0522, 'Los Ángeles', 'USA'],
  miami: [-80.1918, 25.7617, 'Miami', 'USA'],
  berlin: [13.405, 52.52, 'Berlín', 'Alemania'],
  lima: [-77.0428, -12.0464, 'Lima', 'Perú'],
  santiago: [-70.6693, -33.4489, 'Santiago', 'Chile'],
  saoPaulo: [-46.6333, -23.5505, 'São Paulo', 'Brasil'],
  rio: [-43.1729, -22.9068, 'Río de Janeiro', 'Brasil'],
  caracas: [-66.9036, 10.4806, 'Caracas', 'Venezuela'],
  quito: [-78.4678, -0.1807, 'Quito', 'Ecuador'],
  medellin: [-75.5812, 6.2442, 'Medellín', 'Colombia'],
  cali: [-76.532, 3.4516, 'Cali', 'Colombia'],
  sanJose: [-84.0833, 9.9333, 'San José', 'Costa Rica'],
  panama: [-79.5199, 9.0764, 'Ciudad de Panamá', 'Panamá'],
  montevideo: [-56.1645, -34.9011, 'Montevideo', 'Uruguay'],
  asuncion: [-57.5759, -25.2637, 'Asunción', 'Paraguay'],
  laPaz: [-68.1193, -16.4897, 'La Paz', 'Bolivia'],
  guadalajara: [-103.3496, 20.6597, 'Guadalajara', 'México'],
  monterrey: [-100.3161, 25.6866, 'Monterrey', 'México'],
  tijuana: [-117.0382, 32.5149, 'Tijuana', 'México'],
  cancun: [-86.8515, 21.1619, 'Cancún', 'México'],
  lisboa: [-9.1393, 38.7223, 'Lisboa', 'Portugal'],
  roma: [12.4964, 41.9028, 'Roma', 'Italia'],
  milano: [9.19, 45.4642, 'Milán', 'Italia'],
  amsterdam: [4.9041, 52.3676, 'Ámsterdam', 'Países Bajos'],
  viena: [16.3738, 48.2082, 'Viena', 'Austria'],
  praga: [14.4378, 50.0755, 'Praga', 'República Checa'],
  dubai: [55.2708, 25.2048, 'Dubái', 'EAU'],
  tokyo: [139.6917, 35.6895, 'Tokio', 'Japón'],
  seoul: [126.978, 37.5665, 'Seúl', 'Corea del Sur'],
  sydney: [151.2093, -33.8688, 'Sídney', 'Australia'],
  toronto: [-79.3832, 43.6532, 'Toronto', 'Canadá'],
  chicago: [-87.6298, 41.8781, 'Chicago', 'USA'],
  houston: [-95.3698, 29.7604, 'Houston', 'USA'],
  atlanta: [-84.388, 33.749, 'Atlanta', 'USA'],
  mumbai: [72.8777, 19.076, 'Mumbai', 'India'],
  cairo: [31.2357, 30.0444, 'El Cairo', 'Egipto'],
  ciudadMexico: [-99.1332, 19.4326, 'CDMX', 'México'],
};

function ev(title, description, category, tags, key, venue, days, price, currency) {
  const [lng, lat, city, country] = C[key];
  const organizers = ['Railin Events', 'EventNow RD', 'Pulsar Live', 'Urban Noise', 'Cultura Viva', 'Noche Capital', 'Marea Fest', 'Sonora Group'];
  const org = organizers[Math.abs(hashStr(title)) % organizers.length];
  const interested = (Math.abs(hashStr(title + 'i')) % 480) + 24;
  return {
    title,
    description,
    category,
    tags,
    location: { type: 'Point', coordinates: [lng, lat], address: `${city}, ${country}` },
    venue,
    date: daysFromNow(days),
    price: { amount: price, currency },
    organizer: org,
    interestedCount: interested,
    images: [{ url: `https://picsum.photos/seed/${slug(title)}/800/400` }],
  };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }

function daysFromNow(d) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt;
}

const DEMO_EVENTS = [
  ev('Festival de Música Electrónica', 'Una noche inolvidable con los mejores DJs de música electrónica.', 'music', ['music', 'festival', 'electronic'], 'madrid', 'WiZink Center', 7, 45, 'EUR'),
  ev('Tech Conference 2026', 'La conferencia de tecnología más importante del año.', 'technology', ['tech', 'conference', 'ai'], 'ny', 'Javits Center', 14, 199, 'USD'),
  ev('Festival Gastronómico', 'Descubre los sabores auténticos mexicanos.', 'food', ['food', 'festival', 'culture'], 'cdmx', 'Zócalo CDMX', 10, 15, 'MXN'),
  ev('Maratón Internacional', 'Corre por las calles históricas de Londres.', 'sports', ['sports', 'running', 'marathon'], 'london', 'The Mall', 21, 60, 'GBP'),
  ev('Exposición de Arte Contemporáneo', 'Muestra única de artistas contemporáneos.', 'art', ['art', 'exhibition', 'culture'], 'paris', 'Louvre', 5, 22, 'EUR'),
  ev('Concierto de Rock', 'Las bandas de rock más grandes de Latinoamérica en vivo.', 'music', ['music', 'rock', 'concert'], 'buenosAires', 'Estadio River Plate', 18, 50, 'ARS'),
  ev('Feria de Emprendimiento', 'Conecta con emprendedores y mentores.', 'business', ['business', 'startup', 'networking'], 'bogota', 'Corferias', 12, 0, 'COP'),
  ev('Carnaval de Santo Domingo', 'La celebración más colorida del Caribe.', 'party', ['party', 'carnival', 'caribbean'], 'santoDomingo', 'Malecón', 30, 10, 'DOP'),
  ev('Workshop de Fotografía', 'Aprende fotografía urbana con profesionales.', 'education', ['education', 'photography', 'workshop'], 'barcelona', 'CCCB', 8, 35, 'EUR'),
  ev('Festival de Cine', 'Estrenos exclusivos y encuentros con directores.', 'art', ['film', 'festival', 'cinema'], 'la', 'TCL Chinese Theatre', 25, 75, 'USD'),
  ev('Yoga al Amanecer', 'Sesión de yoga en la playa con la comunidad local.', 'health', ['health', 'yoga', 'wellness'], 'miami', 'South Beach', 3, 12, 'USD'),
  ev('Festival de Cerveza Artesanal', 'Más de 100 cervezas artesanales de Europa.', 'food', ['food', 'beer', 'festival'], 'berlin', 'Tempelhof', 16, 20, 'EUR'),
  // Latam expandido
  ev('Festival de Salsa', 'La mejor salsa de la costa peruana.', 'party', ['party', 'salsa', 'music'], 'lima', 'Parque Kennedy', 9, 18, 'PEN'),
  ev('Santiago Metal Fest', 'Heavy metal en vivo con bandas nacionales e internacionales.', 'music', ['music', 'metal', 'concert'], 'santiago', 'Teatro Caupolicán', 22, 40, 'CLP'),
  ev('São Paulo Fashion Week', 'La semana de la moda más importante de Brasil.', 'art', ['fashion', 'art', 'catwalk'], 'saoPaulo', 'Ibirapuera', 28, 120, 'BRL'),
  ev('Réveillon de Copacabana', 'La fiesta de Año Nuevo más grande del mundo.', 'party', ['party', 'newyear', 'beach'], 'rio', 'Copacabana', 45, 0, 'BRL'),
  ev('Caracas Tech Meetup', 'Comunidad de desarrolladores y startups.', 'technology', ['tech', 'meetup', 'dev'], 'caracas', 'Centro Comercial', 6, 0, 'VES'),
  ev('Quito Gastronómico', 'Festival de comida andina y fusión.', 'food', ['food', 'andean', 'festival'], 'quito', 'Plaza Foch', 11, 12, 'USD'),
  ev('Medellín Flower Festival', 'El desfile de silleteros más emblemático.', 'social', ['social', 'culture', 'flowers'], 'medellin', 'Avenida del Río', 33, 8, 'COP'),
  ev('Cali Fair', 'La feria de la salsa y el folclor pacífico.', 'party', ['party', 'salsa', 'fair'], 'cali', 'Cañasgordas', 40, 15, 'COP'),
  ev('San José Startup Weekend', 'Construye un startup en 54 horas.', 'business', ['business', 'startup', 'weekend'], 'sanJose', 'Parque Futura', 17, 25, 'CRC'),
  ev('Panamá Jazz Festival', 'Jazz latino con artistas internacionales.', 'music', ['music', 'jazz', 'festival'], 'panama', 'Teatro Nacional', 19, 30, 'USD'),
  ev('Montevideo Book Fair', 'La feria del libro más antigua de Uruguay.', 'education', ['education', 'books', 'fair'], 'montevideo', 'Palacio Legislativo', 26, 5, 'UYU'),
  ev('Asunción Music Week', 'Semana de conciertos emergentes.', 'music', ['music', 'emerging', 'concerts'], 'asuncion', 'Conmebol', 13, 20, 'PYG'),
  ev('La Paz Folklore Night', 'Noche de música andina y danza.', 'social', ['social', 'folklore', 'andean'], 'laPaz', 'Plaza Murillo', 15, 10, 'BOB'),
  ev('Guadalajara International Film', 'Cine iberoamericano de autor.', 'art', ['film', 'festival', 'cinema'], 'guadalajara', 'Cine Foro', 23, 60, 'MXN'),
  ev('Monterrey Metal Open Air', 'Festival de metal al aire libre.', 'music', ['music', 'metal', 'festival'], 'monterrey', 'Estadio', 27, 55, 'MXN'),
  ev('Tijuana Food Truck Fest', 'Los mejores food trucks de la frontera.', 'food', ['food', 'truck', 'festival'], 'tijuana', 'Centro', 4, 10, 'MXN'),
  ev('Cancún Beach Party', 'Fiesta electrónica frente al Caribe.', 'party', ['party', 'edm', 'beach'], 'cancun', 'Playa Delfines', 7, 35, 'MXN'),
  // Europa expandido
  ev('Lisboa Web Summit Warmup', 'Encuentro de la comunidad tech antes del Summit.', 'technology', ['tech', 'meetup', 'startup'], 'lisboa', 'Altice Arena', 20, 0, 'EUR'),
  ev('Roma Opera Night', 'Gala de ópera al aire libre.', 'art', ['art', 'opera', 'classical'], 'roma', 'Coliseo', 12, 80, 'EUR'),
  ev('Milano Design Week', 'La semana del diseño más importante del mundo.', 'art', ['design', 'art', 'fair'], 'milano', 'Brera', 31, 25, 'EUR'),
  ev('Ámsterdam Dance Event', 'El mayor festival de música electrónica.', 'music', ['music', 'edm', 'festival'], 'amsterdam', 'RAI', 24, 70, 'EUR'),
  ev('Viena Classical Concert', 'Concierto de la Filarmónica de Viena.', 'music', ['music', 'classical', 'concert'], 'viena', 'Musikverein', 9, 90, 'EUR'),
  ev('Praga Beer Festival', 'Cerveza checa y música en vivo.', 'food', ['food', 'beer', 'festival'], 'praga', 'Výstaviště', 18, 15, 'CZK'),
  ev('Dubái Expo Tech Talks', 'Charlas de innovación y futuro.', 'technology', ['tech', 'talks', 'future'], 'dubai', 'Dubai Exhibition Centre', 14, 50, 'AED'),
  // Asia / Oceanía / otros
  ev('Tokio Anime Festival', 'El mayor encuentro de anime y cultura otaku.', 'social', ['social', 'anime', 'culture'], 'tokyo', 'Akihabara', 16, 30, 'JPY'),
  ev('Seúl K-Pop Concert', 'Concierto de los grupos más populares de Corea.', 'music', ['music', 'kpop', 'concert'], 'seoul', 'Goyang Stadium', 21, 65, 'KRW'),
  ev('Sídney New Year Fireworks', 'Fuegos artificiales en la bahía.', 'party', ['party', 'newyear', 'fireworks'], 'sydney', 'Darling Harbour', 50, 0, 'AUD'),
  ev('Toronto Film Festival', 'Premiere de cine internacional.', 'art', ['film', 'festival', 'premiere'], 'toronto', 'TIFF Bell Lightbox', 29, 45, 'CAD'),
  ev('Chicago Jazz Festival', 'Jazz al aire libre en Grant Park.', 'music', ['music', 'jazz', 'festival'], 'chicago', 'Grant Park', 19, 0, 'USD'),
  ev('Houston Rodeo', 'El rodeo más grande del mundo.', 'sports', ['sports', 'rodeo', 'country'], 'houston', 'NRG Stadium', 35, 25, 'USD'),
  ev('Atlanta Hip-Hop Week', 'Cuna del hip-hop sureño.', 'music', ['music', 'hiphop', 'concert'], 'atlanta', 'Centennial', 22, 40, 'USD'),
  ev('Mumbai Film Festival', 'Cine de Bollywood y autor.', 'art', ['film', 'bollywood', 'festival'], 'mumbai', 'NCPA', 26, 20, 'INR'),
  ev('El Cairo Ramadan Nights', 'Noches culturales durante Ramadán.', 'social', ['social', 'culture', 'ramadan'], 'cairo', 'Al-Azhar Park', 8, 0, 'EGP'),
  ev('CDMX Lucha Libre Night', 'La lucha libre más espectacular.', 'sports', ['sports', 'wrestling', 'show'], 'ciudadMexico', 'Arena México', 5, 18, 'MXN'),
  // Live-right-now events (date = now) so the "EN VIVO" block has data
  { title: 'Basket en Parque Mirador', description: 'Partido amistoso abierto al público.', category: 'sports', tags: ['sports', 'basket', 'live'], location: { type: 'Point', coordinates: [-3.7038, 40.4168], address: 'Madrid, España' }, venue: 'Parque Mirador', date: new Date(), price: { amount: 0, currency: 'EUR' }, organizer: 'EventNow RD', interestedCount: 32, images: [{ url: 'https://picsum.photos/seed/live-basket/800/400' }] },
  { title: 'Jam Session Centro', description: 'Música en vivo, lleva tu instrumento.', category: 'music', tags: ['music', 'jam', 'live'], location: { type: 'Point', coordinates: [-3.7038, 40.4168], address: 'Madrid, España' }, venue: 'Sala Clamores', date: new Date(Date.now() - 30 * 60000), price: { amount: 10, currency: 'EUR' }, organizer: 'Sonora Group', interestedCount: 58, images: [{ url: 'https://picsum.photos/seed/live-jam/800/400' }] },
];

async function getSystemUser() {
  let u = await User.findOne({ email: 'system@eventconnect.app' });
  if (!u) {
    u = await User.create({
      username: 'eventconnect_system',
      email: 'system@eventconnect.app',
      password: require('crypto').randomBytes(32).toString('hex'),
      firstName: 'EventConnect',
      lastName: 'System',
      isEmailVerified: true,
      role: 'system'
    });
  }
  return u;
}

async function seedDemo(systemUser) {
  let created = 0;
  for (const e of DEMO_EVENTS) {
    const existing = await Event.findOne({ title: e.title, source: { $in: [null, undefined, 'demo'] } });
    if (existing) continue;
    await Event.create({ ...e, createdBy: systemUser._id, status: 'published', imported: false });
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

  if (process.env.TICKETMASTER_API_KEY || process.env.EVENTBRITE_API_KEY ||
      process.env.BANDSINTOWN_APP_ID || process.env.SONGKICK_API_KEY || process.env.MEETUP_TOKEN) {
    console.log('Aggregating real official events...');
    const result = await aggregator.aggregateAndStore({ size: 50 });
    console.log(`Official events -> fetched: ${result.fetched}, created: ${result.created}, updated: ${result.updated}`);
  } else {
    console.log('No API keys set (TICKETMASTER/ EVENTBRITE/ BANDSINTOWN/ SONGKICK/ MEETUP) — skipping official aggregation.');
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
