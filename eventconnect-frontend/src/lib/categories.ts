/**
 * Taxonomía única de categorías de EventNow (espejo de backend-api/src/utils/categories.js).
 * Cada categoría tiene un emoji y un color propio para identificar el tipo de plan de un vistazo.
 */
export interface CategoryMeta {
  slug: string
  label: string
  emoji: string
  /** Color base (hex) usado en insignias, marcadores y degradados */
  color: string
  /** Ejemplos de actividades de nicho dentro de la categoría */
  examples: string[]
}

export const CATEGORY_LIST: CategoryMeta[] = [
  { slug: 'music', label: 'Música', emoji: '🎵', color: '#8b5cf6', examples: ['Violín en el parque', 'Piano en la plaza', 'Jam session'] },
  { slug: 'art', label: 'Arte y cultura', emoji: '🎨', color: '#ec4899', examples: ['Pintar en el parque', 'Muralismo', 'Cerámica'] },
  { slug: 'dance', label: 'Baile', emoji: '💃', color: '#f43f5e', examples: ['Salsa al aire libre', 'Bachata', 'Danza folclórica'] },
  { slug: 'outdoors', label: 'Aire libre', emoji: '🌿', color: '#16a34a', examples: ['Senderismo', 'Picnic', 'Observación de estrellas'] },
  { slug: 'sports', label: 'Deportes', emoji: '⚽', color: '#f97316', examples: ['Voleibol de playa', 'Running club', 'Surf'] },
  { slug: 'wellness', label: 'Bienestar', emoji: '🧘', color: '#14b8a6', examples: ['Yoga en el parque', 'Meditación', 'Sound healing'] },
  { slug: 'food', label: 'Gastronomía', emoji: '🍽️', color: '#eab308', examples: ['Cata de ron', 'Cocina local', 'Mercado orgánico'] },
  { slug: 'workshop', label: 'Talleres', emoji: '🛠️', color: '#0ea5e9', examples: ['Cerámica', 'Fotografía', 'Costura'] },
  { slug: 'education', label: 'Aprender', emoji: '📚', color: '#6366f1', examples: ['Intercambio de idiomas', 'Charlas abiertas'] },
  { slug: 'literature', label: 'Lectura', emoji: '📖', color: '#a16207', examples: ['Club de lectura', 'Poesía al aire libre'] },
  { slug: 'technology', label: 'Tecnología', emoji: '💻', color: '#2563eb', examples: ['Hackathon', 'Meetup de IA'] },
  { slug: 'gaming', label: 'Juegos', emoji: '🎲', color: '#7c3aed', examples: ['Juegos de mesa', 'Ajedrez', 'Dominó'] },
  { slug: 'film', label: 'Cine', emoji: '🎬', color: '#dc2626', examples: ['Cine al aire libre', 'Cineclub'] },
  { slug: 'photography', label: 'Fotografía', emoji: '📷', color: '#475569', examples: ['Photowalk', 'Fotografía de calle'] },
  { slug: 'culture', label: 'Cultura', emoji: '🏛️', color: '#b45309', examples: ['Tour histórico', 'Tradiciones locales'] },
  { slug: 'community', label: 'Comunidad', emoji: '🤝', color: '#059669', examples: ['Voluntariado', 'Limpieza de playa', 'Huerto'] },
  { slug: 'family', label: 'Familia', emoji: '👨‍👩‍👧', color: '#f59e0b', examples: ['Cuentacuentos', 'Talleres infantiles'] },
  { slug: 'networking', label: 'Networking', emoji: '🧑‍💼', color: '#0284c7', examples: ['Cafés de emprendedores'] },
  { slug: 'nightlife', label: 'Vida nocturna', emoji: '🌙', color: '#4f46e5', examples: ['Open mic', 'Karaoke', 'Comedia'] },
  { slug: 'entertainment', label: 'Entretenimiento', emoji: '🎭', color: '#d946ef', examples: ['Teatro', 'Stand-up', 'Magia'] },
  { slug: 'business', label: 'Negocios', emoji: '📈', color: '#0d9488', examples: ['Feria de emprendedores'] },
  { slug: 'health', label: 'Salud', emoji: '❤️', color: '#ef4444', examples: ['Jornada de salud'] },
  { slug: 'religion', label: 'Religión & Espiritualidad', emoji: '🙏', color: '#6366f1', examples: ['Misas al aire libre', 'Vigilias de oración', 'Retiros de fe', 'Estudios bíblicos'] },
  { slug: 'politics', label: 'Política & Civismo', emoji: '🏛️', color: '#475569', examples: ['Debates ciudadanos', 'Foros cívicos', 'Asambleas vecinales', 'Cabildos abiertos'] },
  { slug: 'charity', label: 'Causas & Voluntariado', emoji: '🎗️', color: '#10b981', examples: ['Colectas benéficas', 'Rescate animal', 'Limpieza comunitaria', 'Reforestación'] },
  { slug: 'science', label: 'Ciencia & Astronomía', emoji: '🔬', color: '#0284c7', examples: ['Noches de telescopios', 'Divulgación científica', 'Laboratorios abiertos'] },
  { slug: 'party', label: 'Fiestas', emoji: '🎉', color: '#e11d48', examples: ['Fiesta temática', 'Festival'] },
  { slug: 'social', label: 'Social', emoji: '💬', color: '#0891b2', examples: ['Encuentro social'] },
  { slug: 'other', label: 'Más planes', emoji: '✨', color: '#8b7cc8', examples: [] }
]

/** Alias antiguos (español / sinónimos) → slug canónico */
const ALIASES: Record<string, string> = {
  música: 'music', deportes: 'sports', sociales: 'social', tecnologia: 'technology', tecnología: 'technology', tech: 'technology',
  comida: 'food', gastronomía: 'food', arte: 'art', negocios: 'business', empresarial: 'business',
  educación: 'education', educacion: 'education', fiesta: 'party', salud: 'health', otro: 'other',
  religión: 'religion', religion: 'religion', espiritualidad: 'religion',
  política: 'politics', politica: 'politics', civismo: 'politics',
  voluntariado: 'charity', causas: 'charity', caridad: 'charity',
  ciencia: 'science', astronomia: 'science', astronomía: 'science'
}

const BY_SLUG = new Map(CATEGORY_LIST.map(c => [c.slug, c]))

/** Include older stored category names when querying the public catalogue. */
export function categoryQueryValues(slugs: string[]) {
  const selected = new Set(slugs)
  return [...new Set([...slugs, ...Object.entries(ALIASES).filter(([, canonical]) => selected.has(canonical)).map(([alias]) => alias)])]
}

export function categoryMeta(raw?: string | null): CategoryMeta {
  const key = String(raw || 'other').toLowerCase()
  return BY_SLUG.get(key) || BY_SLUG.get(ALIASES[key]) || BY_SLUG.get('other')!
}

export const CATEGORY_COLORS_BY_SLUG: Record<string, string> = Object.fromEntries(CATEGORY_LIST.map(c => [c.slug, c.color]))
