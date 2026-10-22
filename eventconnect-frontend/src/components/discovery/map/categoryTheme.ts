import { categoryMeta } from '@/lib/categories'

export interface CategoryMeta {
  slug: string
  aliases: string[]
  label: string
  shortLabel: string
  emoji: string
  color: string
  secondaryColor: string
  bgTint: string
  textTint: string
  borderTint: string
  svg: string
}

export interface RDHub {
  id: string
  name: string
  subtitle: string
  emoji: string
  lat: number
  lng: number
  radius: number
  zoom: number
  country?: 'DO' | 'ES' | 'MX' | 'US' | 'GB' | 'FR' | 'DE' | 'JP' | 'BR' | 'CO' | 'AR' | 'CL' | 'PE' | 'CA' | 'IT'
}

export const DEFAULT_RD_LOCATION = {
  lat: 18.4721,
  lng: -69.9192,
  address: 'Santo Domingo, República Dominicana'
}

export const RD_HUBS: RDHub[] = [
  {
    id: 'santo-domingo',
    name: 'Santo Domingo',
    subtitle: 'Distrito Nacional',
    emoji: '🏛️',
    lat: 18.4721,
    lng: -69.9192,
    radius: 25,
    zoom: 13,
    country: 'DO'
  },
  {
    id: 'zona-colonial',
    name: 'Zona Colonial',
    subtitle: 'Centro Histórico',
    emoji: '🏰',
    lat: 18.4735,
    lng: -69.8845,
    radius: 5,
    zoom: 15,
    country: 'DO'
  },
  {
    id: 'santiago',
    name: 'Santiago',
    subtitle: 'El Cibao',
    emoji: '⛰️',
    lat: 19.4517,
    lng: -70.6970,
    radius: 25,
    zoom: 13,
    country: 'DO'
  },
  {
    id: 'punta-cana',
    name: 'Punta Cana',
    subtitle: 'Costa Este',
    emoji: '🏖️',
    lat: 18.5601,
    lng: -68.3725,
    radius: 35,
    zoom: 12,
    country: 'DO'
  },
  {
    id: 'puerto-plata',
    name: 'Puerto Plata',
    subtitle: 'Costa Norte',
    emoji: '🌊',
    lat: 19.7934,
    lng: -70.6884,
    radius: 30,
    zoom: 12,
    country: 'DO'
  },
  {
    id: 'jarabacoa',
    name: 'Jarabacoa',
    subtitle: 'Montaña',
    emoji: '🌲',
    lat: 19.1206,
    lng: -70.6358,
    radius: 30,
    zoom: 13,
    country: 'DO'
  },
  {
    id: 'samana',
    name: 'Samaná',
    subtitle: 'Las Terrenas & Bahía',
    emoji: '🐋',
    lat: 19.2056,
    lng: -69.3369,
    radius: 35,
    zoom: 12,
    country: 'DO'
  },
  {
    id: 'bayahibe',
    name: 'Bayahíbe',
    subtitle: 'La Romana & Saona',
    emoji: '⛵',
    lat: 18.3756,
    lng: -68.8398,
    radius: 25,
    zoom: 13,
    country: 'DO'
  },
  {
    id: 'all-rd',
    name: 'Toda RD',
    subtitle: 'Isla Completa',
    emoji: '🇩🇴',
    lat: 18.85,
    lng: -70.16,
    radius: 300,
    zoom: 8,
    country: 'DO'
  },
  // España Hubs
  {
    id: 'madrid',
    name: 'Madrid',
    subtitle: 'Centro & Gran Vía',
    emoji: '🇪🇸',
    lat: 40.4168,
    lng: -3.7038,
    radius: 20,
    zoom: 13,
    country: 'ES'
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    subtitle: 'Gòtic & Gràcia',
    emoji: '🏛️',
    lat: 41.3851,
    lng: 2.1734,
    radius: 20,
    zoom: 13,
    country: 'ES'
  },
  // México Hubs
  {
    id: 'cdmx',
    name: 'Ciudad de México',
    subtitle: 'Roma & Condesa',
    emoji: '🇲🇽',
    lat: 19.4326,
    lng: -99.1332,
    radius: 25,
    zoom: 13,
    country: 'MX'
  },
  // USA / Global Hubs
  {
    id: 'miami',
    name: 'Miami',
    subtitle: 'Wynwood & Brickell',
    emoji: '🌴',
    lat: 25.7617,
    lng: -80.1918,
    radius: 25,
    zoom: 13,
    country: 'US'
  },
  {
    id: 'new-york',
    name: 'New York',
    subtitle: 'Manhattan & Brooklyn',
    emoji: '🗽',
    lat: 40.7128,
    lng: -74.0060,
    radius: 25,
    zoom: 12,
    country: 'US'
  },
  // Reino Unido
  {
    id: 'london',
    name: 'Londres',
    subtitle: 'Soho & Camden',
    emoji: '🇬🇧',
    lat: 51.5074,
    lng: -0.1278,
    radius: 25,
    zoom: 12,
    country: 'GB'
  },
  // Francia
  {
    id: 'paris',
    name: 'París',
    subtitle: 'Montmartre & Le Marais',
    emoji: '🇫🇷',
    lat: 48.8566,
    lng: 2.3522,
    radius: 20,
    zoom: 13,
    country: 'FR'
  },
  // Alemania
  {
    id: 'berlin',
    name: 'Berlín',
    subtitle: 'Kreuzberg & Mitte',
    emoji: '🇩🇪',
    lat: 52.5200,
    lng: 13.4050,
    radius: 25,
    zoom: 12,
    country: 'DE'
  },
  // Japón
  {
    id: 'tokyo',
    name: 'Tokio',
    subtitle: 'Shibuya & Shinjuku',
    emoji: '🇯🇵',
    lat: 35.6762,
    lng: 139.6503,
    radius: 30,
    zoom: 12,
    country: 'JP'
  },
  // Brasil
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    subtitle: 'Paulista & Vila Madalena',
    emoji: '🇧🇷',
    lat: -23.5505,
    lng: -46.6333,
    radius: 30,
    zoom: 12,
    country: 'BR'
  },
  // Colombia
  {
    id: 'bogota',
    name: 'Bogotá',
    subtitle: 'Chapinero & Usaquén',
    emoji: '🇨🇴',
    lat: 4.7110,
    lng: -74.0721,
    radius: 25,
    zoom: 12,
    country: 'CO'
  },
  // Argentina
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    subtitle: 'Palermo & San Telmo',
    emoji: '🇦🇷',
    lat: -34.6037,
    lng: -58.3816,
    radius: 25,
    zoom: 12,
    country: 'AR'
  },
  // Chile
  {
    id: 'santiago-cl',
    name: 'Santiago de Chile',
    subtitle: 'Bellavista & Providencia',
    emoji: '🇨🇱',
    lat: -33.4489,
    lng: -70.6693,
    radius: 25,
    zoom: 12,
    country: 'CL'
  },
  // Perú
  {
    id: 'lima',
    name: 'Lima',
    subtitle: 'Barranco & Miraflores',
    emoji: '🇵🇪',
    lat: -12.0464,
    lng: -77.0428,
    radius: 25,
    zoom: 12,
    country: 'PE'
  },
  // Canadá
  {
    id: 'toronto',
    name: 'Toronto',
    subtitle: 'Queen West & Downtown',
    emoji: '🇨🇦',
    lat: 43.6532,
    lng: -79.3832,
    radius: 25,
    zoom: 12,
    country: 'CA'
  },
  // Italia
  {
    id: 'rome',
    name: 'Roma',
    subtitle: 'Trastevere & Centro Storico',
    emoji: '🇮🇹',
    lat: 41.9028,
    lng: 12.4964,
    radius: 20,
    zoom: 13,
    country: 'IT'
  }
]

export const DISCOVERY_CATEGORIES: CategoryMeta[] = [
  {
    slug: 'music',
    aliases: ['music', 'música', 'musica', 'dance', 'baile'],
    label: 'Música & Acústicos',
    shortLabel: 'Música',
    emoji: '🎵',
    color: '#8B5CF6',
    secondaryColor: '#C084FC',
    bgTint: 'bg-violet-500/15',
    textTint: 'text-violet-300',
    borderTint: 'border-violet-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
  },
  {
    slug: 'party',
    aliases: ['party', 'fiesta', 'fiestas', 'nightlife', 'entertainment', 'entretenimiento'],
    label: 'Fiesta & Rooftops',
    shortLabel: 'Fiesta',
    emoji: '🎉',
    color: '#EC4899',
    secondaryColor: '#F472B6',
    bgTint: 'bg-pink-500/15',
    textTint: 'text-pink-300',
    borderTint: 'border-pink-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>`
  },
  {
    slug: 'art',
    aliases: ['art', 'arte', 'photography', 'fotografía', 'film', 'cine', 'literature', 'lectura', 'workshop'],
    label: 'Arte & Creatividad',
    shortLabel: 'Arte',
    emoji: '🎨',
    color: '#F43F5E',
    secondaryColor: '#FB7185',
    bgTint: 'bg-rose-500/15',
    textTint: 'text-rose-300',
    borderTint: 'border-rose-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="white"/><circle cx="17.5" cy="10.5" r=".5" fill="white"/><circle cx="8.5" cy="7.5" r=".5" fill="white"/><circle cx="6.5" cy="12.5" r=".5" fill="white"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`
  },
  {
    slug: 'culture',
    aliases: ['culture', 'cultura', 'science', 'ciencia', 'community', 'comunidad', 'charity'],
    label: 'Cultura & Astronomía',
    shortLabel: 'Cultura',
    emoji: '🔭',
    color: '#F59E0B',
    secondaryColor: '#FBBF24',
    bgTint: 'bg-amber-500/15',
    textTint: 'text-amber-300',
    borderTint: 'border-amber-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"/><path d="m13.56 11.747 4.332-.924"/><path d="m16 21-3.105-6.21"/><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"/><path d="m6.158 8.633 1.114 4.456"/><path d="m8 21 3.105-6.21"/><circle cx="12" cy="13" r="2"/></svg>`
  },
  {
    slug: 'religion',
    aliases: ['religion', 'religión', 'espiritualidad', 'fe'],
    label: 'Fe & Espiritualidad',
    shortLabel: 'Religioso',
    emoji: '🕊️',
    color: '#38BDF8',
    secondaryColor: '#7DD3FC',
    bgTint: 'bg-sky-500/15',
    textTint: 'text-sky-300',
    borderTint: 'border-sky-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M7 7h10"/><path d="M5 20h14"/></svg>`
  },
  {
    slug: 'politics',
    aliases: ['politics', 'política', 'politica', 'civismo'],
    label: 'Política & Foro Cívico',
    shortLabel: 'Político',
    emoji: '🏛️',
    color: '#6366F1',
    secondaryColor: '#818CF8',
    bgTint: 'bg-indigo-500/15',
    textTint: 'text-indigo-300',
    borderTint: 'border-indigo-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`
  },
  {
    slug: 'technology',
    aliases: ['technology', 'tecnología', 'tecnologia', 'tech', 'networking', 'business', 'negocios'],
    label: 'Tech & Networking',
    shortLabel: 'Tech',
    emoji: '💻',
    color: '#3B82F6',
    secondaryColor: '#60A5FA',
    bgTint: 'bg-blue-500/15',
    textTint: 'text-blue-300',
    borderTint: 'border-blue-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
  },
  {
    slug: 'gaming',
    aliases: ['gaming', 'juegos', 'ajedrez'],
    label: 'Gaming & Estrategia',
    shortLabel: 'Juegos',
    emoji: '♟️',
    color: '#A855F7',
    secondaryColor: '#D8B4FE',
    bgTint: 'bg-purple-500/15',
    textTint: 'text-purple-300',
    borderTint: 'border-purple-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>`
  },
  {
    slug: 'wellness',
    aliases: ['wellness', 'bienestar', 'health', 'salud', 'outdoors'],
    label: 'Bienestar & Naturaleza',
    shortLabel: 'Bienestar',
    emoji: '🧘',
    color: '#10B981',
    secondaryColor: '#34D399',
    bgTint: 'bg-emerald-500/15',
    textTint: 'text-emerald-300',
    borderTint: 'border-emerald-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 2 1.5 3.5 3 4.5V14H7a3 3 0 0 0-3 3v3h16v-3a3 3 0 0 0-3-3h-3v-2.5c1.5-1 3-2.5 3-4.5a5 5 0 0 0-5-5z"/></svg>`
  },
  {
    slug: 'sports',
    aliases: ['sports', 'deportes', 'fitness'],
    label: 'Deportes & Acción',
    shortLabel: 'Deportes',
    emoji: '⚽',
    color: '#14B8A6',
    secondaryColor: '#2DD4BF',
    bgTint: 'bg-teal-500/15',
    textTint: 'text-teal-300',
    borderTint: 'border-teal-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`
  },
  {
    slug: 'food',
    aliases: ['food', 'gastronomía', 'gastronomia', 'comida'],
    label: 'Gastronomía & Catas',
    shortLabel: 'Gastronomía',
    emoji: '🍽️',
    color: '#F97316',
    secondaryColor: '#FB923C',
    bgTint: 'bg-orange-500/15',
    textTint: 'text-orange-300',
    borderTint: 'border-orange-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
  },
  {
    slug: 'education',
    aliases: ['education', 'educación', 'educacion'],
    label: 'Educación & Charlas',
    shortLabel: 'Educación',
    emoji: '🎓',
    color: '#06B6D4',
    secondaryColor: '#22D3EE',
    bgTint: 'bg-cyan-500/15',
    textTint: 'text-cyan-300',
    borderTint: 'border-cyan-500/40',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
  }
]

const FALLBACK_CATEGORY: CategoryMeta = {
  slug: 'other',
  aliases: ['other', 'otro', 'social'],
  label: 'Evento Especial',
  shortLabel: 'Especial',
  emoji: '✨',
  color: '#8B5CF6',
  secondaryColor: '#C084FC',
  bgTint: 'bg-violet-500/15',
  textTint: 'text-violet-300',
  borderTint: 'border-violet-500/40',
  svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
}

export function getCategoryMeta(categoryRaw?: string): CategoryMeta {
  if (!categoryRaw) return FALLBACK_CATEGORY
  const normalized = categoryRaw.toLowerCase().trim()
  const found = DISCOVERY_CATEGORIES.find(
    (c) => c.slug === normalized || c.aliases.includes(normalized)
  )
  if (found) return found
  const known = categoryMeta(normalized)
  return known.slug === 'other' ? FALLBACK_CATEGORY : {
    ...FALLBACK_CATEGORY, slug: known.slug, aliases: [known.slug], label: known.label,
    shortLabel: known.label, emoji: known.emoji, color: known.color, secondaryColor: known.color
  }
}

export const DISCOVERY_VIBES = [
  {
    id: 'chill',
    label: 'Chill & Atardecer',
    emoji: '🌅',
    categories: ['art', 'arte', 'wellness', 'salud', 'health', 'outdoors', 'literature', 'music', 'música'],
    gradient: 'from-violet-600 to-fuchsia-600'
  },
  {
    id: 'fiesta',
    label: 'Coro & Rumba',
    emoji: '🔥',
    categories: ['party', 'fiesta', 'nightlife', 'entertainment', 'entretenimiento', 'music', 'música', 'dance'],
    gradient: 'from-pink-600 to-rose-600'
  },
  {
    id: 'civico_fe',
    label: 'Fe, Cultura & Civismo',
    emoji: '🕊️',
    categories: ['religion', 'religión', 'politics', 'política', 'culture', 'cultura', 'community', 'charity'],
    gradient: 'from-sky-600 to-indigo-600'
  },
  {
    id: 'aprendizaje',
    label: 'Mente, Tech & Juegos',
    emoji: '🧠',
    categories: ['technology', 'tecnología', 'gaming', 'education', 'educación', 'networking', 'science', 'workshop'],
    gradient: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'aventura',
    label: 'Deporte & Sabor',
    emoji: '⚡',
    categories: ['sports', 'deportes', 'food', 'gastronomía', 'outdoors'],
    gradient: 'from-emerald-600 to-teal-600'
  }
]
