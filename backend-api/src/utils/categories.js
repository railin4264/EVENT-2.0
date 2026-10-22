/**
 * Taxonomía única de categorías / actividades de EventNow.
 * `slug` es el valor guardado en Event.category. Las actividades de nicho
 * (violín en el parque, pintar al aire libre, etc.) viven en `activityTypes`
 * como sugerencias dentro de su categoría.
 */
const CATEGORIES = [
  { slug: 'music', label: 'Música', emoji: '🎵', activityTypes: ['violín en el parque', 'piano en la plaza', 'jam session', 'coro comunitario', 'concierto acústico'] },
  { slug: 'art', label: 'Arte', emoji: '🎨', activityTypes: ['pintar en el parque', 'muralismo', 'cerámica', 'dibujo urbano', 'galería abierta'] },
  { slug: 'dance', label: 'Baile', emoji: '💃', activityTypes: ['salsa al aire libre', 'bachata', 'danza folclórica', 'ballet comunitario'] },
  { slug: 'outdoors', label: 'Aire libre', emoji: '🌿', activityTypes: ['senderismo', 'picnic', 'observación de estrellas', 'birdwatching', 'ciclismo'] },
  { slug: 'sports', label: 'Deportes', emoji: '⚽', activityTypes: ['voleibol de playa', 'running club', 'surf', 'ajedrez en el parque'] },
  { slug: 'wellness', label: 'Bienestar', emoji: '🧘', activityTypes: ['yoga en el parque', 'meditación', 'sound healing', 'tai chi'] },
  { slug: 'food', label: 'Gastronomía', emoji: '🍽️', activityTypes: ['cata de ron', 'cocina local', 'mercado orgánico', 'food truck'] },
  { slug: 'workshop', label: 'Talleres', emoji: '🛠️', activityTypes: ['taller de fotografía', 'cerámica', 'costura', 'carpintería'] },
  { slug: 'education', label: 'Educación', emoji: '📚', activityTypes: ['intercambio de idiomas', 'charla abierta', 'club de ciencia'] },
  { slug: 'literature', label: 'Lectura', emoji: '📖', activityTypes: ['club de lectura', 'poesía al aire libre', 'intercambio de libros'] },
  { slug: 'technology', label: 'Tecnología', emoji: '💻', activityTypes: ['hackathon', 'meetup de IA', 'taller de código'] },
  { slug: 'gaming', label: 'Juegos', emoji: '🎲', activityTypes: ['juegos de mesa', 'torneo de ajedrez', 'esports', 'rol'] },
  { slug: 'film', label: 'Cine', emoji: '🎬', activityTypes: ['cine al aire libre', 'cineclub', 'cortometrajes locales'] },
  { slug: 'photography', label: 'Fotografía', emoji: '📷', activityTypes: ['photowalk', 'fotografía de calle', 'revelado análogo'] },
  { slug: 'culture', label: 'Cultura', emoji: '🏛️', activityTypes: ['tour histórico', 'tradiciones locales', 'museo abierto'] },
  { slug: 'community', label: 'Comunidad', emoji: '🤝', activityTypes: ['voluntariado', 'limpieza de playa', 'huerto comunitario'] },
  { slug: 'family', label: 'Familia', emoji: '👨‍👩‍👧', activityTypes: ['cuentacuentos', 'talleres infantiles', 'juegos en familia'] },
  { slug: 'networking', label: 'Networking', emoji: '🧑‍💼', activityTypes: ['cafés de emprendedores', 'meetup profesional'] },
  { slug: 'nightlife', label: 'Vida nocturna', emoji: '🌙', activityTypes: ['noche de comedia', 'karaoke', 'open mic'] },
  { slug: 'entertainment', label: 'Entretenimiento', emoji: '🎭', activityTypes: ['teatro', 'stand-up', 'magia'] },
  { slug: 'business', label: 'Negocios', emoji: '📈', activityTypes: ['feria de emprendedores', 'conferencia'] },
  { slug: 'health', label: 'Salud', emoji: '❤️', activityTypes: ['jornada de salud', 'primeros auxilios'] },
  { slug: 'religion', label: 'Religión & Espiritualidad', emoji: '🙏', activityTypes: ['misa comunitaria', 'culto al aire libre', 'retiro espiritual', 'vigilia de oración', 'estudio bíblico', 'meditación interreligiosa', 'conferencia de fe'] },
  { slug: 'politics', label: 'Política & Civismo', emoji: '🏛️', activityTypes: ['debate político', 'foro cívico ciudadano', 'asamblea comunitaria', 'marcha pacífica', 'presentación de propuestas', 'cabildo abierto'] },
  { slug: 'charity', label: 'Causas & Voluntariado', emoji: '🎗️', activityTypes: ['colecta benéfica', 'rescate animal', 'jornada de donación', 'reforestación comunitaria'] },
  { slug: 'science', label: 'Ciencia & Astronomía', emoji: '🔬', activityTypes: ['noche de telescopios', 'divulgación científica', 'laboratorio abierto', 'observación astronómica'] },
  { slug: 'party', label: 'Fiestas', emoji: '🎉', activityTypes: ['fiesta temática', 'festival'] },
  { slug: 'social', label: 'Social', emoji: '💬', activityTypes: ['encuentro social', 'speed friending'] },
  { slug: 'other', label: 'Otros', emoji: '✨', activityTypes: [] }
];

// Alias en español / sinónimos usados históricamente en el modelo y en fuentes externas.
const LEGACY_ALIASES = [
  'música', 'deportes', 'sociales', 'tecnologia', 'tecnología', 'tech', 'comida', 'gastronomía',
  'arte', 'negocios', 'empresarial', 'educación', 'educacion', 'fiesta', 'salud', 'otro',
  'religión', 'religion', 'espiritualidad', 'política', 'politica', 'civismo', 'voluntariado', 'ciencia'
];

const CATEGORY_SLUGS = CATEGORIES.map(c => c.slug);
const CATEGORY_ENUM = [...CATEGORY_SLUGS, ...LEGACY_ALIASES];

const POLITICAL_CATEGORIES = ['politics', 'política', 'politica', 'civismo'];
const RELIGIOUS_CATEGORIES = ['religion', 'religión', 'religion', 'espiritualidad'];

/**
 * Builds a Mongoose query value for `category` taking into account:
 * 1. Query parameters (?category=..., ?categories=..., ?excludeCategories=..., ?hidePolitical=true, ?hideReligious=true)
 * 2. Authenticated user preferences (hidePolitical, hideReligious, contentFilterMode, preferredCategories, hiddenCategories)
 *
 * Returns either:
 * - string (single category equality)
 * - { $in: [...] } (whitelist)
 * - { $nin: [...] } (blacklist)
 * - null (no restriction)
 */
function buildCategoryFilterQuery({ category, categories, excludeCategories, hidePolitical, hideReligious, userPreferences } = {}) {
  const prefs = userPreferences || {};

  // Build exclusion list
  const exclusionSet = new Set();

  const parseList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).toLowerCase().trim()).filter(Boolean);
    if (typeof val === 'string') return val.split(',').map(v => v.toLowerCase().trim()).filter(Boolean);
    return [];
  };

  // Exclude explicit categories from query
  parseList(excludeCategories).forEach(cat => {
    exclusionSet.add(cat);
    if (POLITICAL_CATEGORIES.includes(cat)) POLITICAL_CATEGORIES.forEach(p => exclusionSet.add(p));
    if (RELIGIOUS_CATEGORIES.includes(cat)) RELIGIOUS_CATEGORIES.forEach(r => exclusionSet.add(r));
  });

  // Political flag (query or user preference)
  const shouldHidePolitical = hidePolitical === true || hidePolitical === 'true' || (hidePolitical === undefined && prefs.hidePolitical === true);
  if (shouldHidePolitical) {
    POLITICAL_CATEGORIES.forEach(p => exclusionSet.add(p));
  }

  // Religious flag (query or user preference)
  const shouldHideReligious = hideReligious === true || hideReligious === 'true' || (hideReligious === undefined && prefs.hideReligious === true);
  if (shouldHideReligious) {
    RELIGIOUS_CATEGORIES.forEach(r => exclusionSet.add(r));
  }

  // User preference custom hidden categories
  if (Array.isArray(prefs.hiddenCategories)) {
    prefs.hiddenCategories.forEach(c => exclusionSet.add(String(c).toLowerCase().trim()));
  }

  // Build inclusion / whitelist
  let allowedList = null;

  if (categories) {
    allowedList = parseList(categories);
  } else if (prefs.contentFilterMode === 'whitelist' && Array.isArray(prefs.preferredCategories) && prefs.preferredCategories.length > 0) {
    allowedList = parseList(prefs.preferredCategories);
  }

  // Single category query parameter
  if (category && typeof category === 'string') {
    const single = category.toLowerCase().trim();
    if (allowedList) {
      allowedList = allowedList.filter(c => c === single);
    } else {
      allowedList = [single];
    }
  }

  // Combine allowed and exclusions
  if (allowedList !== null) {
    const filteredAllowed = allowedList.filter(c => !exclusionSet.has(c));
    if (filteredAllowed.length === 0) {
      return { $in: [] }; // Nothing matches
    }
    if (filteredAllowed.length === 1) {
      return filteredAllowed[0];
    }
    return { $in: filteredAllowed };
  }

  if (exclusionSet.size > 0) {
    return { $nin: Array.from(exclusionSet) };
  }

  return null;
}

module.exports = {
  CATEGORIES,
  CATEGORY_SLUGS,
  CATEGORY_ENUM,
  LEGACY_ALIASES,
  POLITICAL_CATEGORIES,
  RELIGIOUS_CATEGORIES,
  buildCategoryFilterQuery
};

