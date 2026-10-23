// schema.org Event data for search engines. Only facts the event actually has are
// published: no default city, no guessed price, no exact address for secret locations.

type PublicEvent = {
  _id?: string; title?: string; description?: string; date?: string; endDate?: string; status?: string
  isVirtual?: boolean; eventType?: string; virtualLink?: string; isSecretLocation?: boolean; isPrivate?: boolean
  location?: { address?: string; venue?: string; city?: string; country?: string; countryCode?: string; coordinates?: unknown } | string | null
  price?: { amount?: number; currency?: string } | number | null; ticketUrl?: string; paymentMode?: string
  images?: Array<string | { url?: string }>; image?: string; organizer?: string
  createdBy?: { firstName?: string; lastName?: string; username?: string } | string | null
}

const httpsUrl = (value: unknown) => typeof value === 'string' && /^https:\/\//i.test(value) ? value : undefined

export function eventImage(event: PublicEvent): string | undefined {
  const first = Array.isArray(event.images) ? event.images[0] : undefined
  return httpsUrl(typeof first === 'string' ? first : first?.url) || httpsUrl(event.image)
}

export function eventStructuredData(event: PublicEvent, pageUrl: string): Record<string, unknown> | null {
  const start = event.date ? new Date(event.date) : null
  if (!event.title || !start || !Number.isFinite(start.getTime()) || event.isPrivate || ['draft', 'pending_review'].includes(event.status || '')) return null
  const end = event.endDate && Number.isFinite(new Date(event.endDate).getTime()) ? new Date(event.endDate) : null
  const online = event.eventType === 'virtual' || event.eventType === 'hybrid' || Boolean(event.isVirtual)
  const inPerson = event.eventType === 'hybrid' || !online
  const place = event.location && typeof event.location === 'object' ? event.location : null
  const point = Array.isArray(place?.coordinates) && place.coordinates.length === 2 && place.coordinates.every(n => typeof n === 'number' && Number.isFinite(n)) ? place.coordinates as [number, number] : null

  const locations: Record<string, unknown>[] = []
  if (inPerson && place && !event.isSecretLocation && (place.address || place.venue)) {
    locations.push({
      '@type': 'Place',
      name: place.venue || place.address,
      address: { '@type': 'PostalAddress', streetAddress: place.address, addressLocality: place.city, addressCountry: place.countryCode || place.country },
      ...(point ? { geo: { '@type': 'GeoCoordinates', latitude: point[1], longitude: point[0] } } : {})
    })
  }
  const virtualUrl = httpsUrl(event.virtualLink)
  if (online) locations.push({ '@type': 'VirtualLocation', url: virtualUrl || pageUrl })
  if (!locations.length) return null

  const amount = typeof event.price === 'object' && event.price !== null ? event.price.amount : typeof event.price === 'number' ? event.price : undefined
  const currency = typeof event.price === 'object' && event.price !== null ? event.price.currency : undefined
  // A free event says so; a paid one needs a known amount and currency; an unknown price links to the seller.
  const offers = amount === 0 && event.paymentMode !== 'external'
    ? { '@type': 'Offer', price: 0, priceCurrency: currency || 'USD', url: pageUrl, availability: 'https://schema.org/InStock' }
    : typeof amount === 'number' && amount > 0 && currency
      ? { '@type': 'Offer', price: amount, priceCurrency: currency, url: httpsUrl(event.ticketUrl) || pageUrl, availability: 'https://schema.org/InStock' }
      : httpsUrl(event.ticketUrl) ? { '@type': 'Offer', url: event.ticketUrl } : undefined

  const creator = event.createdBy && typeof event.createdBy === 'object'
    ? [event.createdBy.firstName, event.createdBy.lastName].filter(Boolean).join(' ') || event.createdBy.username : undefined
  const organizer = event.organizer || creator

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(event.description ? { description: event.description.slice(0, 5000) } : {}),
    startDate: start.toISOString(),
    ...(end && end >= start ? { endDate: end.toISOString() } : {}),
    eventStatus: event.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: online && inPerson ? 'https://schema.org/MixedEventAttendanceMode'
      : online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: locations.length === 1 ? locations[0] : locations,
    ...(eventImage(event) ? { image: [eventImage(event)] } : {}),
    ...(offers ? { offers } : {}),
    ...(organizer ? { organizer: { '@type': 'Organization', name: organizer } } : {}),
    url: pageUrl
  }
}

/** JSON for an inline script: "<" is escaped so event text can never close the script tag. */
export function serializeStructuredData(data: unknown): string {
  // U+2028/U+2029 are valid in JSON but end a line in older script parsers.
  const slash = String.fromCharCode(92)
  return JSON.stringify(data).split('<').join(slash + 'u003c')
    .split(String.fromCharCode(0x2028)).join(slash + 'u2028').split(String.fromCharCode(0x2029)).join(slash + 'u2029')
}
