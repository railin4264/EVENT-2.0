import type { Event } from '@/types/models'
import { getEventPhase } from '@/components/events/event-phase'
import { isInNextPlanWindow } from '@/lib/event-window'

export type Location = { lat: number; lng: number; address?: string }
export const categories = [
  { value: '', label: 'Todos' },
  { value: 'music', label: 'Música' },
  { value: 'sports', label: 'Deportes' },
  { value: 'food', label: 'Gastronomía' },
  { value: 'art', label: 'Arte y cultura' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'business', label: 'Networking' },
  { value: 'education', label: 'Aprender' },
  { value: 'religion', label: 'Religión & Espiritualidad' },
  { value: 'politics', label: 'Política & Civismo' },
  { value: 'charity', label: 'Causas & Voluntariado' },
  { value: 'science', label: 'Ciencia & Astronomía' },
  { value: 'wellness', label: 'Bienestar' },
  { value: 'outdoors', label: 'Aire libre' },
  { value: 'other', label: 'Más planes' },
]

export interface FilterOptions {
  category: string;
  date: string;
  query: string;
  sort: string;
  location: Location | null;
  // Content restriction options
  hidePolitical?: boolean;
  hideReligious?: boolean;
  hiddenCategories?: string[];
  preferredCategories?: string[];
  contentFilterMode?: 'all' | 'whitelist' | 'blacklist';
}

export function distanceKm(location: Location, event: Event) {
  const coordinates = event.location?.coordinates
  if (!coordinates || !coordinates.every(Number.isFinite)) return Infinity
  const [lng, lat] = coordinates
  const radians = (value: number) => value * Math.PI / 180
  const a = Math.sin(radians(lat - location.lat) / 2) ** 2 +
    Math.cos(radians(location.lat)) * Math.cos(radians(lat)) * Math.sin(radians(lng - location.lng) / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

export function isLive(event: Event, now = new Date()) {
  return getEventPhase(event, now) === 'live'
}

const POLITICAL_SLUGS = ['politics', 'politica', 'política', 'civismo']
const RELIGIOUS_SLUGS = ['religion', 'religión', 'espiritualidad']

export function filterEvents(events: Event[], options: FilterOptions, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = (offset: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
  // On Sunday the current weekend is still in progress.
  const saturday = now.getDay() === 0 ? -1 : 6 - now.getDay()
  const ranges: Record<string, [Date, Date]> = {
    today: [start, day(1)], tomorrow: [day(1), day(2)],
    weekend: [day(saturday), day(saturday + 2)], week: [start, day(7)],
  }
  const range = ranges[options.date]
  const query = options.query.trim().toLocaleLowerCase('es')

  const hiddenSet = new Set((options.hiddenCategories || []).map(c => c.toLowerCase()))
  if (options.hidePolitical) {
    POLITICAL_SLUGS.forEach(p => hiddenSet.add(p))
  }
  if (options.hideReligious) {
    RELIGIOUS_SLUGS.forEach(r => hiddenSet.add(r))
  }

  const filtered = events.filter(event => {
    if (event.status === 'cancelled' || event.status === 'draft' || event.isPrivate) return false

    const cat = (event.category || '').toLowerCase()

    // Content restrictions
    if (hiddenSet.has(cat)) return false

    if (options.contentFilterMode === 'whitelist' && options.preferredCategories && options.preferredCategories.length > 0) {
      const allowed = options.preferredCategories.map(c => c.toLowerCase())
      if (!allowed.includes(cat)) return false
    }

    if (options.category && cat !== options.category.toLowerCase()) return false
    if (query && !`${event.title} ${event.description} ${event.location?.address || ''}`.toLocaleLowerCase('es').includes(query)) return false
    const date = new Date(event.date)
    if (Number.isNaN(date.getTime())) return false
    if (options.date === 'next12h' && !isInNextPlanWindow(event, now)) return false
    if (range && !(date >= range[0] && date < range[1])) return false
    return true
  })
  return filtered.sort((a, b) => {
    if (options.sort === 'distance' && options.location) return distanceKm(options.location, a) - distanceKm(options.location, b)
    if (options.sort === 'popular') return (b.attendeesCount ?? b.attendees?.length ?? 0) - (a.attendeesCount ?? a.attendees?.length ?? 0)
    if (options.sort === 'new') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}
