import type { MetadataRoute } from 'next'

const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const MAX_PAGES = 20 // 2,000 upcoming events; each page refreshes hourly.

export const revalidate = 3600

// Public listing only: the API already excludes private, draft and pending events.
async function upcomingEvents(): Promise<{ _id: string; updatedAt?: string }[]> {
  const events: { _id: string; updatedAt?: string }[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const res = await fetch(`${apiUrl}/events?page=${page}&limit=100&timeFilter=upcoming`, { next: { revalidate } })
      if (!res.ok) break
      const json = await res.json()
      const rows = json.events || json.data || []
      events.push(...rows.filter((event: { _id?: unknown }) => typeof event._id === 'string'))
      if (!json.pagination || page >= json.pagination.pages) break
    } catch {
      break
    }
  }
  return events
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = ['', '/events', '/discovery', '/tribes', '/ideas', '/organizers', '/privacy', '/terms']
    .map(path => ({ url: `${appUrl}${path}`, changeFrequency: 'daily', priority: path === '' ? 1 : 0.7 }))
  const events = await upcomingEvents()
  return [...fixed, ...events.map(event => ({
    url: `${appUrl}/events/${event._id}`,
    ...(event.updatedAt ? { lastModified: new Date(event.updatedAt) } : {}),
    changeFrequency: 'daily' as const,
    priority: 0.8
  }))]
}
