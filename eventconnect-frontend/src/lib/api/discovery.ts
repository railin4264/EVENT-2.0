import { apiClient } from '@/lib/api/client'
import type { Event } from '@/types/models'

export interface DiscoveryEvent extends Event {
  badge?: 'featured' | 'trending' | 'upcoming'
  badgeLabel?: string
  trendingScore?: number
  matchReasons?: string[]
  activityType?: string
  isUnofficial?: boolean
  isSecretLocation?: boolean
  isOrganizerVerified?: boolean
  paymentMode?: 'free' | 'onsite' | 'external' | 'platform'
  ticketUrl?: string
  paymentInfo?: string
}

export interface PublicConfig {
  paymentsEnabled: boolean
  mode: 'marketplace' | 'informational'
  features: Record<string, boolean>
  promotion: { contact: string; note: string }
}

export interface ActivityIdea {
  _id: string
  title: string
  description?: string
  category: string
  activityType?: string
  emoji?: string
  zone: { name?: string; city?: string }
  supportersCount: number
  supported: boolean
  status: 'open' | 'launched' | 'closed'
  seeded?: boolean
  linkedEvent?: string
  quorumTarget?: number
  quorumDeadline?: string | null
  expiresAt?: string
  isExpired?: boolean
  lifecycleStatus?: 'open' | 'expired' | 'launched' | 'closed'
  quorumReached?: boolean
  quorumReachedAt?: string | null
  quorumProgress?: number
  createdAt: string
}

export interface DemandOpportunity {
  category: string
  label: string
  emoji: string
  demand: number
  ideas: number
  upcomingEvents: number
  gapScore: number
  topIdeas: { _id: string; title: string; supporters: number; emoji?: string }[]
}

const DEFAULT_CONFIG: PublicConfig = {
  paymentsEnabled: false,
  mode: 'informational',
  features: {},
  promotion: { contact: '', note: '' }
}

export type DiscoveryGeo = { lat?: number; lng?: number; radiusKm?: number; radius?: number; countryCode?: string; city?: string } | null | undefined
type Geo = DiscoveryGeo

const geoParams = (geo: Geo) => (geo ? { lat: geo.lat, lng: geo.lng, radiusKm: geo.radiusKm ?? geo.radius, countryCode: geo.countryCode, city: geo.city } : {})

export const discoveryApi = {
  async getConfig(): Promise<PublicConfig> {
    try {
      const res = await apiClient.get('/config')
      return { ...DEFAULT_CONFIG, ...(res.data?.data || {}) }
    } catch {
      return DEFAULT_CONFIG
    }
  },

  async getFeatured(geo?: Geo, limit = 6): Promise<DiscoveryEvent[]> {
    const res = await apiClient.get('/events/featured', { params: { limit, ...geoParams(geo) } })
    return res.data?.data || []
  },

  async getTrending(geo?: Geo, limit = 10): Promise<DiscoveryEvent[]> {
    const res = await apiClient.get('/events/trending', { params: { limit, ...geoParams(geo) } })
    return res.data?.data || []
  },

  async getForYou(geo?: Geo, limit = 12): Promise<{ events: DiscoveryEvent[]; personalized: boolean }> {
    const res = await apiClient.get('/events/for-you', { params: { limit, ...geoParams(geo) } })
    return { events: res.data?.data || [], personalized: Boolean(res.data?.meta?.personalized) }
  },

  async getIdeas(params: { status?: 'open' | 'expired' | 'launched'; category?: string; q?: string; sort?: 'top' | 'new'; page?: number; limit?: number } & Partial<{ lat: number; lng: number }> = {}) {
    const res = await apiClient.get('/ideas', { params })
    return { ideas: (res.data?.data || []) as ActivityIdea[], pagination: res.data?.pagination }
  },

  async createIdea(body: { title: string; description?: string; category: string; activityType?: string; emoji?: string; zone?: { name?: string; city?: string; coordinates?: [number, number] }; quorumTarget?: number; daysToTarget?: number }) {
    const res = await apiClient.post('/ideas', body)
    return res.data?.data as ActivityIdea
  },

  async toggleSupport(id: string): Promise<{ supported: boolean; supportersCount: number; quorumReached?: boolean; quorumTarget?: number }> {
    const res = await apiClient.post(`/ideas/${id}/support`)
    return res.data?.data
  },

  async getDemand(geo?: Geo): Promise<{ totalIdeas: number; totalSupporters: number; opportunities: DemandOpportunity[] }> {
    const res = await apiClient.get('/ideas/demand', { params: geoParams(geo) })
    return res.data?.data || { totalIdeas: 0, totalSupporters: 0, opportunities: [] }
  },

  async requestPromotion(eventId: string, note?: string) {
    const res = await apiClient.post(`/events/${eventId}/promotion-request`, { note })
    return res.data
  }
}
