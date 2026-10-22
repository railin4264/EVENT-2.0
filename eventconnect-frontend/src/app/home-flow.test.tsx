// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import HomeScreen from './page'

const mocks = vi.hoisted(() => ({ getEvents: vi.fn() }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: false, user: null }) }))
vi.mock('@/lib/api/services', () => ({ eventsService: { getEvents: mocks.getEvents } }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
vi.mock('@/components/discovery/MapComponent', () => ({ default: () => null }))
vi.mock('@/components/discovery/FeaturedBanner', () => ({ FeaturedBanner: () => <div>Otros planes destacados</div> }))
vi.mock('@/components/discovery/DiscoveryRows', () => ({ TrendingRow: () => <div>Otros planes en tendencia</div>, ForYouRow: () => <div>Otros planes para ti</div>, IdeasRadar: () => null, FeaturedTribesRow: () => null }))
vi.mock('@/components/discovery/FeaturedOrganizers', () => ({ FeaturedOrganizers: () => null }))
vi.mock('@/components/discovery/RouletteModal', () => ({ RouletteModal: () => null }))
vi.mock('@/components/redesign/ui/theme-toggle', () => ({ CompactThemeToggle: () => null }))
vi.mock('@/components/discovery/ContentFilterModal', () => ({ default: () => null, loadStoredPreferences: () => ({ contentFilterMode: 'all', hiddenCategories: [], preferredCategories: [], hidePolitical: false, hideReligious: false }) }))

beforeEach(() => {
  vi.stubGlobal('React', React)
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined })
  HTMLElement.prototype.scrollIntoView = vi.fn()
  mocks.getEvents.mockResolvedValue({ events: Array.from({ length: 8 }, (_, index) => ({
    _id: String(index), title: index === 7 ? 'Senderismo al amanecer' : `Concierto ${index}`,
    description: 'Un buen plan', category: index === 7 ? 'outdoors' : 'music',
    date: new Date(Date.now() + 86400000 + index * 1000), status: 'published', isPrivate: false,
    location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Santo Domingo' },
    price: { amount: 10, currency: 'INVALID-CURRENCY' }, images: [], attendees: []
  })) })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

it('connects visitors to itinerary and collaboration tools without requiring registration', async () => {
  render(<HomeScreen />)
  await screen.findByText('Concierto 0')
  expect(screen.getByRole('link', { name: 'Preparar mi itinerario' }).getAttribute('href')).toBe('/planning-tools')
  expect(screen.getByRole('link', { name: 'Explorar colaboraciones' }).getAttribute('href')).toBe('/partners')
})

it('offers public event links and a sign-in return for creating an event without crashing on legacy currency data', async () => {
  render(<HomeScreen />)
  await screen.findByText('Concierto 0')
  expect(screen.getByRole('link', { name: 'Ver Concierto 0' }).getAttribute('href')).toBe('/events/0')
  expect(screen.getByRole('link', { name: /Quiero organizar uno/ }).getAttribute('href')).toBe('/login?redirect=%2Fevents%2Fcreate')
  expect(screen.getAllByRole('article')).toHaveLength(6)
  fireEvent.click(screen.getByRole('button', { name: /Mostrar más planes/ }))
  expect(screen.getAllByRole('article')).toHaveLength(8)
})

it('quick-start filters select the matching category even without matchMedia support', async () => {
  render(<HomeScreen />)
  await screen.findByText('Concierto 0')
  fireEvent.click(screen.getByRole('button', { name: 'Al aire libre' }))
  expect(await screen.findByText('Senderismo al amanecer')).toBeTruthy()
  expect(screen.queryByText('Concierto 0')).toBeNull()
  expect(screen.getByRole('button', { name: 'Al aire libre' }).getAttribute('aria-pressed')).toBe('true')
})

it('recovers from an empty search through the visible clear action', async () => {
  render(<HomeScreen />)
  await screen.findByText('Concierto 0')
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar eventos' }), { target: { value: 'no existe este plan' } })
  expect(screen.getByText('Probemos con otro plan')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
  await waitFor(() => expect(screen.getByText('Concierto 0')).toBeTruthy())
})

it('switches to the next twelve hours before server pagination and can return to all dates', async () => {
  const now = Date.now()
  const make = (id: string, hours: number, extra = {}) => ({
    _id: id, title: id, description: 'Plan de prueba', category: 'music',
    date: new Date(now + hours * 3600000), status: 'published', isPrivate: false,
    location: { coordinates: [-69.93, 18.48], address: 'Santo Domingo' },
    price: { amount: 0, currency: 'DOP' }, images: [], attendees: [], ...extra,
  })
  mocks.getEvents.mockResolvedValue({ events: [make('En curso real', -1, { endDate: new Date(now + 3600000) }), make('Plan en seis horas', 6), make('Otro día', 24), make('Cancelado', 1, { status: 'cancelled' }), make('Privado', 1, { isPrivate: true })] })
  render(<HomeScreen />)
  await screen.findByText('Otro día')
  const button = screen.getByRole('button', { name: '¿Qué hay hoy?' })
  fireEvent.click(button)
  expect(screen.queryByText('Otros planes destacados')).toBeNull()
  expect(screen.queryByText('Otros planes en tendencia')).toBeNull()
  expect(screen.queryByText('Otros planes para ti')).toBeNull()
  await waitFor(() => expect(mocks.getEvents.mock.lastCall?.[0]).toMatchObject({ timeFilter: 'upcoming', status: 'published', startsBefore: expect.any(String) }))
  await screen.findByText('Plan en seis horas')
  expect(screen.getByText('En curso real')).toBeTruthy()
  expect(screen.queryByText('Otro día')).toBeNull()
  expect(screen.queryByText('Cancelado')).toBeNull()
  expect(screen.queryByText('Privado')).toBeNull()
  expect(button.getAttribute('aria-pressed')).toBe('true')
  const horizon = new Date(mocks.getEvents.mock.lastCall?.[0].startsBefore).getTime()
  expect(horizon - now).toBeGreaterThanOrEqual(12 * 3600000)
  expect(horizon - now).toBeLessThan(12 * 3600000 + 5000)
  fireEvent.click(button)
  await screen.findByText('Otro día')
  expect(mocks.getEvents.mock.lastCall?.[0]).not.toHaveProperty('startsBefore')
})

it('shows verifiable registrations rather than claiming the aggregate is physical attendance', async () => {
  const response = await mocks.getEvents()
  response.events = [{ ...response.events[0], attendeesCount: 450, attendees: [
    { user: 'one', status: 'confirmed' }, { user: { _id: 'one' }, status: 'attending' },
    { user: 'two', status: 'pending' }, { user: 'three', status: 'not-attending' },
  ] }]
  mocks.getEvents.mockResolvedValue(response)
  render(<HomeScreen />)
  await screen.findByText('Concierto 0')
  expect(screen.getByText('1 inscripción confirmada')).toBeTruthy()
  expect(screen.queryByText(/450 asistentes|personas aquí/)).toBeNull()
})
