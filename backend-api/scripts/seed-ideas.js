/**
 * Siembra ideas de actividades innovadoras (NO son eventos falsos: son propuestas
 * abiertas para que la gente diga "me interesa" y los creadores las conviertan en eventos).
 *
 * Uso:  node scripts/seed-ideas.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');
const ActivityIdea = require('../src/models/ActivityIdea');
const User = require('../src/models/User');

const SD = { name: 'Santo Domingo', city: 'Santo Domingo', c: [-69.9312, 18.4861] };
const MIRADOR = { name: 'Parque Mirador Sur', city: 'Santo Domingo', c: [-69.9577, 18.4560] };
const ZONA_COLONIAL = { name: 'Zona Colonial', city: 'Santo Domingo', c: [-69.8837, 18.4733] };
const SANTIAGO = { name: 'Santiago', city: 'Santiago', c: [-70.6970, 19.4517] };
const PP = { name: 'Puerto Plata', city: 'Puerto Plata', c: [-70.6973, 19.7934] };
const PC = { name: 'Punta Cana', city: 'La Altagracia', c: [-68.3739, 18.5820] };
const SAMANA = { name: 'Samaná', city: 'Samaná', c: [-69.3368, 19.2056] };
const LR = { name: 'La Romana', city: 'La Romana', c: [-68.9728, 18.4273] };

const IDEAS = [
  ['Violín en el parque al atardecer', 'music', 'violín en el parque', '🎻', MIRADOR, 'Músicos tocando violín y cuerdas en vivo mientras la gente pasea o hace picnic.'],
  ['Pintar al aire libre en comunidad', 'art', 'pintar en el parque', '🎨', MIRADOR, 'Lleva tu lienzo o cuaderno y pinta junto a otras personas, sin importar tu nivel.'],
  ['Piano en la plaza', 'music', 'piano en la plaza', '🎹', ZONA_COLONIAL, 'Un piano público en la Zona Colonial para que cualquiera toque o escuche.'],
  ['Ajedrez en el parque', 'gaming', 'ajedrez en el parque', '♟️', SD, 'Tableros al aire libre, partidas abiertas y mini torneos relámpago.'],
  ['Cine al aire libre bajo las estrellas', 'film', 'cine al aire libre', '🎬', SD, 'Proyección de cine dominicano y clásicos en una plaza o playa.'],
  ['Club de lectura en la playa', 'literature', 'club de lectura', '📖', SD, 'Leemos y comentamos un libro al mes con vista al mar.'],
  ['Yoga al amanecer frente al mar', 'wellness', 'yoga en el parque', '🧘', SD, 'Sesiones suaves de yoga gratuitas o a la gorra con el malecón de fondo.'],
  ['Photowalk por la Zona Colonial', 'photography', 'photowalk', '📷', ZONA_COLONIAL, 'Caminata fotográfica para aprender y compartir con otras personas aficionadas.'],
  ['Noche de poesía y micrófono abierto', 'nightlife', 'open mic', '🎤', SD, 'Poesía, música y cuentos en un espacio íntimo; sube y comparte lo tuyo.'],
  ['Cerámica y barro para principiantes', 'workshop', 'cerámica', '🏺', SD, 'Taller de modelado con barro, sin experiencia previa.'],
  ['Intercambio de idiomas en un café', 'education', 'intercambio de idiomas', '🗣️', SD, 'Practica inglés, francés, alemán o español con personas nativas.'],
  ['Observación de estrellas', 'outdoors', 'observación de estrellas', '🔭', SANTIAGO, 'Noches de telescopio y constelaciones lejos de la luz de la ciudad.'],
  ['Senderismo y cascadas los domingos', 'outdoors', 'senderismo', '🥾', SANTIAGO, 'Grupo de caminatas moderadas por la Cordillera Central.'],
  ['Coro comunitario abierto', 'music', 'coro comunitario', '🎶', SANTIAGO, 'Cantamos por diversión, sin audición y sin experiencia.'],
  ['Mercado de trueque y segunda mano', 'community', 'mercado de trueque', '♻️', SD, 'Intercambia ropa, libros y plantas sin gastar dinero.'],
  ['Jam session de músicos locales', 'music', 'jam session', '🎸', PP, 'Toca con otras personas: jazz, blues, merengue y fusión.'],
  ['Limpieza de playa + picnic', 'community', 'limpieza de playa', '🏖️', PC, 'Mañana de limpieza con comida compartida después.'],
  ['Clases de salsa y bachata en la plaza', 'dance', 'salsa al aire libre', '💃', SD, 'Clases abiertas al aire libre para todos los niveles.'],
  ['Cuentacuentos para familias', 'family', 'cuentacuentos', '🧸', SD, 'Cuentos en voz alta para niños y adultos en una biblioteca o parque.'],
  ['Juegos de mesa y rol', 'gaming', 'juegos de mesa', '🎲', SD, 'Encuentro semanal de juegos de mesa, cartas y rol.'],
  ['Carrera relajada de running club', 'sports', 'running club', '🏃', SD, 'Salidas grupales de 5K a ritmo cómodo, con café después.'],
  ['Huerto urbano comunitario', 'community', 'huerto comunitario', '🌱', SD, 'Aprende a sembrar y cosechar en un espacio compartido.'],
  ['Taller de fotografía con celular', 'workshop', 'taller de fotografía', '📱', SANTIAGO, 'Aprende composición y edición con solo tu teléfono.'],
  ['Observación de ballenas y aves', 'outdoors', 'birdwatching', '🐋', SAMANA, 'Salidas guiadas para observar fauna de la bahía de Samaná.'],
  ['Murales colectivos en barrios', 'art', 'muralismo', '🖌️', SD, 'Artistas y vecinos pintan un mural juntos.'],
  ['Cata de cacao y chocolate dominicano', 'food', 'cocina local', '🍫', SD, 'Descubre el cacao local, de la mazorca a la barra.'],
  ['Stand-up comedy en español', 'entertainment', 'stand-up', '😂', SD, 'Noche de comedia con humor local y artistas emergentes.'],
  ['Sesión de sound healing / meditación', 'wellness', 'sound healing', '🔔', PC, 'Meditación guiada con cuencos y sonidos para relajarse.'],
  ['Torneo comunitario de dominó', 'gaming', 'dominó', '🁣', LR, 'Dominó por parejas con premios simbólicos y ambiente de barrio.'],
  ['Danza folclórica abierta', 'dance', 'danza folclórica', '🪘', SANTIAGO, 'Aprende ritmos tradicionales dominicanos con grupos folclóricos.']
];

async function seedIdeas() {
  let owner = await User.findOne({ email: 'system@eventconnect.app' });
  if (!owner) {
    owner = await User.create({
      username: 'eventnow_system', email: 'system@eventconnect.app',
      password: crypto.randomBytes(32).toString('hex') + 'Aa1!',
      firstName: 'EventNow', lastName: 'Ideas', isEmailVerified: true, role: 'system'
    });
  }

  let created = 0;
  for (const [title, category, activityType, emoji, z, description] of IDEAS) {
    const exists = await ActivityIdea.findOne({ title, seeded: true });
    if (exists) continue;
    await ActivityIdea.create({
      title, description, category, activityType, emoji,
      zone: { name: z.name, city: z.city, location: { type: 'Point', coordinates: z.c } },
      createdBy: owner._id, seeded: true, supporters: [], supportersCount: Math.floor(Math.random() * 8),
      quorumTarget: 15
    });
    created += 1;
  }
  console.log(`Ideas sembradas: ${created} nuevas (${IDEAS.length} en catálogo)`);
  return { created, total: IDEAS.length };
}

async function main() {
  const uri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventconnect').replace('localhost', '127.0.0.1');
  await mongoose.connect(uri);
  await seedIdeas();
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedIdeas, IDEAS };
