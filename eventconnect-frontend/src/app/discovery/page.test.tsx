// @vitest-environment jsdom
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORLD_AREA } from '@/lib/discovery-area'
import { useDiscoveryAreaStore } from '@/stores/discoveryAreaStore'
import DiscoveryPage from './page'

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(), attend: vi.fn(), leave: vi.fn(), get: vi.fn(), post: vi.fn(), nearbyTribes: vi.fn(),
  push: vi.fn(), toast: vi.fn(), favorite: vi.fn(), interaction: vi.fn(), authenticated: false,
  events: [] as any[], ideas: [] as any[], tribes: [] as any[],
}))
vi.mock('@/lib/api/events', () => ({ getEvents: mocks.getEvents, attendEvent: mocks.attend, leaveEvent: mocks.leave }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post } }))
vi.mock('@/lib/api/services/tribes.service', () => ({ tribesService: { getNearbyTribes: mocks.nearbyTribes } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: mocks.authenticated, user: mocks.authenticated ? { id: 'viewer' } : null }) }))
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: () => ({ toggleFavorite: mocks.favorite, isFavorite: () => false }) }))
vi.mock('@/components/redesign/ui/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/providers/AnalyticsProvider', () => ({ useAnalytics: () => ({ trackEventInteraction: mocks.interaction }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
vi.mock('next/dynamic', () => ({ default: () => (props: any) => <section aria-label="Mapa simulado">
  <output data-testid="map-state">{JSON.stringify({ viewType: props.viewType, events: props.events.map((item: any) => item._id),
    ideas: props.ideas.map((item: any) => item._id), tribes: props.tribes.map((item: any) => item._id),
    overviewMode: props.overviewMode, showUserLocation: props.showUserLocation, fitToEvents: props.fitToEvents })}</output>
  {props.events.map((item: any) => <button key={item._id} onClick={() => props.onEventSelect(item)}>Mapa {item.title}</button>)}
</section> }))
vi.mock('@/components/discovery/map/DiscoveryCarousel', () => ({ default: () => null }))
vi.mock('@/components/discovery/map/DiscoveryDetailPanel', () => ({ default: (props: any) => <aside aria-label="Panel simulado">
  <h2>{props.selectedEvent?.title || props.selectedIdea?.title || props.selectedTribe?.name}</h2>
  {props.selectedEvent && <button onClick={() => props.onAttendToggle(props.selectedEvent)}>Asistir desde panel</button>}
</aside> }))
vi.mock('@/components/discovery/LocationPicker', () => ({ LocationPicker: () => <div>
  <button onClick={() => useDiscoveryAreaStore.getState().setArea({ kind: 'country', label: 'Chile', country: 'Chile', countryCode: 'CL', lat: -35, lng: -71 })}>Elegir Chile</button>
  <button onClick={() => useDiscoveryAreaStore.getState().setArea({ kind: 'city', label: 'Santiago, Chile', city: 'Santiago', country: 'Chile', countryCode: 'CL', lat: -33.448, lng: -70.669 })}>Elegir Santiago</button>
</div> }))
vi.mock('@/components/discovery/ContentFilterModal', () => {
  const defaults = { contentFilterMode: 'all', preferredCategories: [], hiddenCategories: [], hidePolitical: false, hideReligious: false, hideAdultOnly: true }
  return { default: () => null, DEFAULT_CONTENT_PREFERENCES: defaults, loadStoredPreferences: () => defaults }
})

let queryClient: QueryClient
let gps: ReturnType<typeof vi.fn>
const event = (id: string, overrides: Record<string, unknown> = {}) => ({
  _id: id, title: `Plan ${id}`, description: 'Descripción de una experiencia de prueba', category: 'music',
  date: new Date(Date.now() + 2 * 3600000).toISOString(), endDate: new Date(Date.now() + 3 * 3600000).toISOString(),
  status: 'published', timeZone: 'UTC', location: { type: 'Point', coordinates: [-70.669, -33.448], address: 'Santiago', city: 'Santiago' },
  images: [], attendees: [], price: { amount: 0, currency: 'DOP' }, ...overrides,
})
const state = () => JSON.parse(screen.getByTestId('map-state').textContent || '{}')
const show = () => render(<QueryClientProvider client={queryClient}><DiscoveryPage /></QueryClientProvider>)
const ready = async (ids = mocks.events.map(item => item._id)) => waitFor(() => expect(state().events).toEqual(ids), { timeout: 5000 })

describe('Discovery route integration', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React)
    vi.clearAllMocks()
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } })
    window.history.replaceState({}, '', '/discovery')
    useDiscoveryAreaStore.setState({ area: WORLD_AREA, initialized: true })
    gps = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } })
    mocks.authenticated = false
    mocks.events = [event('free')]
    mocks.ideas = [{ _id: 'idea-one', title: 'Pintura comunitaria', category: 'art', supportersCount: 4, zone: { name: 'Santiago', city: 'Santiago', location: { coordinates: [-70.669, -33.448] } } }]
    mocks.tribes = [{ _id: 'tribe-one', name: 'Club de senderismo', category: 'sports', location: { coordinates: [-70.669, -33.448], city: 'Santiago' }, memberCount: 8 }]
    mocks.getEvents.mockImplementation(async (params: { page: number }) => ({ events: mocks.events, pagination: { page: params.page, pages: 1, total: mocks.events.length } }))
    mocks.get.mockImplementation(async (path: string) => ({ data: { data: path === '/ideas' ? mocks.ideas : mocks.tribes } }))
    mocks.nearbyTribes.mockImplementation(async () => ({ data: mocks.tribes }))
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  })
  afterEach(() => { cleanup(); queryClient.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('loads worldwide events without an implicit GPS, country or radius filter', async () => {
    show()
    await ready()
    expect(mocks.getEvents).toHaveBeenCalledWith({ page: 1, limit: 100, timeFilter: 'upcoming', search: undefined })
    expect(state()).toMatchObject({ overviewMode: 'world', fitToEvents: true, showUserLocation: false })
    expect(gps).not.toHaveBeenCalled()
  })

  it('applies country and exact city scopes without turning their centroids into GPS searches', async () => {
    show()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Mundial Cambiar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elegir Chile' }))
    await waitFor(() => expect(mocks.getEvents).toHaveBeenLastCalledWith({ countryCode: 'CL', page: 1, limit: 100, timeFilter: 'upcoming', search: undefined }), { timeout: 5000 })
    expect(state()).toMatchObject({ overviewMode: 'country', showUserLocation: false })
    fireEvent.click(screen.getByRole('button', { name: 'Chile Cambiar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elegir Santiago' }))
    await waitFor(() => expect(mocks.getEvents).toHaveBeenLastCalledWith({ countryCode: 'CL', city: 'Santiago', page: 1, limit: 100, timeFilter: 'upcoming', search: undefined }), { timeout: 5000 })
    expect(state()).toMatchObject({ overviewMode: 'city', showUserLocation: false })
    expect(gps).not.toHaveBeenCalled()
  })

  it('shows only events currently live when En curso is selected, excluding future, ended and cancelled events', async () => {
    mocks.events = [event('live', { date: new Date(Date.now() - 1800000).toISOString(), endDate: new Date(Date.now() + 1800000).toISOString() }), event('future'),
      event('ended', { date: new Date(Date.now() - 7200000).toISOString(), endDate: new Date(Date.now() - 3600000).toISOString() }), event('cancelled', { status: 'cancelled' })]
    show()
    await ready(['live', 'future'])
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    fireEvent.click(screen.getByRole('button', { name: 'En curso' }))
    await waitFor(() => expect(state().events).toEqual(['live']))
    expect(mocks.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({ liveOnly: true, page: 1 }))
    expect(screen.getByRole('button', { name: 'En curso' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps an explicitly selected GPS radius local instead of forcing the map into worldwide overview', async () => {
    useDiscoveryAreaStore.setState({ area: { kind: 'nearby', source: 'gps', label: 'Cerca de ti', lat: 0, lng: 0, radius: 50 }, initialized: true })
    show()
    await ready()
    expect(mocks.getEvents).toHaveBeenCalledWith({ lat: 0, lng: 0, radius: 50, page: 1, limit: 100, timeFilter: 'upcoming', search: undefined })
    expect(state()).toMatchObject({ fitToEvents: false, showUserLocation: true })
    expect(state()).not.toHaveProperty('overviewMode')
    expect(gps).not.toHaveBeenCalled()
  })

  it('chooses surprise events strictly from the current category, budget and currency filters', async () => {
    mocks.events = [event('eligible'), event('expensive', { price: { amount: 500, currency: 'DOP' } }), event('other-category', { category: 'art' }), event('other-currency', { price: { amount: 10, currency: 'USD' } })]
    show()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    fireEvent.click(screen.getByRole('button', { name: /Música$/ }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Precio máximo' }), { target: { value: '100' } })
    await waitFor(() => expect(state().events).toEqual(['eligible']))
    await waitFor(() => expect(mocks.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({ categories: expect.stringContaining('music'), priceMax: 100, currency: 'DOP', page: 1 })))
    await waitFor(() => expect(state().events).toEqual(['eligible']))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    fireEvent.click(screen.getByRole('button', { name: 'Sorpréndeme' }))
    expect(screen.getByRole('heading', { name: 'Plan eligible' })).toBeTruthy()
    expect(mocks.get).not.toHaveBeenCalledWith(expect.stringContaining('roulette'), expect.anything())
  })

  it('sends a guest attendance action to login with its intended event and makes no attendance mutation', async () => {
    show()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa Plan free' }))
    fireEvent.click(screen.getByRole('button', { name: 'Asistir desde panel' }))
    expect(mocks.push).toHaveBeenCalledWith('/login?redirect=%2Fevents%2Ffree')
    expect(mocks.attend).not.toHaveBeenCalled()
    expect(mocks.leave).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('opens the event detail for an authenticated paid attendance action without silently posting attendance', async () => {
    mocks.authenticated = true
    mocks.events = [event('paid', { price: { amount: 200, currency: 'DOP' } })]
    show()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa Plan paid' }))
    fireEvent.click(screen.getByRole('button', { name: 'Asistir desde panel' }))
    expect(mocks.push).toHaveBeenCalledWith('/events/paid')
    expect(mocks.attend).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it.each([
    { button: 'Ideas', title: 'Pintura comunitaria', id: 'idea-one', layer: 'ideas', href: '/ideas' },
    { button: 'Tribus', title: 'Club de senderismo', id: 'tribe-one', layer: 'tribes', href: '/tribes/tribe-one' },
  ])('renders the $layer catalog and its correct detail link instead of event cards', async choice => {
    show()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: choice.button }))
    await waitFor(() => expect(state()[choice.layer]).toEqual([choice.id]), { timeout: 5000 })
    expect(state().events).toEqual([])
    expect((screen.getByRole('button', { name: 'Sorpréndeme' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }))
    expect(screen.getByRole('heading', { name: choice.title })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Plan free' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver detalle de ' + choice.title }).getAttribute('href')).toBe(choice.href)
  })
})
