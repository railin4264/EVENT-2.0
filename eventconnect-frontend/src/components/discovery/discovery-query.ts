import { CATEGORY_LIST, categoryMeta, categoryQueryValues } from '@/lib/categories'
import { DISCOVERY_VIBES } from './map/categoryTheme'
import type { ContentFilterPreferences } from './ContentFilterModal'
import type { MomentFilter } from './discovery-filters'

export function discoveryQuery(options: {
  categories: string[]; vibe: string | null; preferences: ContentFilterPreferences
  maximum: number | null; currency: string; moment: MomentFilter; now: Date; authenticated: boolean
}): Record<string, string | number | boolean> {
  const { categories, vibe, preferences: prefs, maximum, currency, moment, now, authenticated } = options
  const query: Record<string, string | number | boolean> = {}
  const selectedVibe = DISCOVERY_VIBES.find(v => v.id === vibe)
  const canonical = (values: string[]) => values.map(value => categoryMeta(value).slug)
  const allowed = CATEGORY_LIST.filter(({ slug }) =>
    (!categories.length || categories.includes(slug)) &&
    (!selectedVibe || canonical(selectedVibe.categories).includes(slug)) &&
    (!prefs.hidePolitical || slug !== 'politics') && (!prefs.hideReligious || slug !== 'religion') &&
    (prefs.contentFilterMode !== 'whitelist' || canonical(prefs.preferredCategories || []).includes(slug)) &&
    (prefs.contentFilterMode !== 'blacklist' || !canonical(prefs.hiddenCategories || []).includes(slug))
  ).map(category => category.slug)
  if (allowed.length < CATEGORY_LIST.length) query.categories = allowed.length ? categoryQueryValues(allowed).join(',') : '__no_match__'
  if (maximum !== null && Number.isFinite(maximum) && maximum >= 0 && maximum <= 100000000) { query.priceMax = maximum; query.currency = currency }
  if (prefs.hideAdultOnly && authenticated) query.hideAdultOnly = true
  if (moment === 'free') query.freeOnly = true
  if (moment === 'secret') query.secretOnly = true
  if (moment === 'virtual') query.isOnline = 'true'
  if (moment === 'now') query.liveOnly = true
  if (moment === 'today' || moment === 'weekend') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    if (moment === 'weekend') start.setDate(start.getDate() + (start.getDay() === 0 ? -1 : (6 - start.getDay() + 7) % 7))
    const end = new Date(start); end.setDate(end.getDate() + (moment === 'today' ? 1 : 2))
    query.startsAfter = start.toISOString(); query.startsBefore = end.toISOString()
  }
  return query
}
