// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import DiscoveryDetailPanel from './DiscoveryDetailPanel'
import DiscoveryCarousel from './DiscoveryCarousel'

vi.mock('@/components/discovery/ShareButton', () => ({ default: () => <button>Compartir</button> }))
vi.mock('framer-motion', async () => {
  const { createElement, forwardRef } = await import('react')
  const element = (tag: string) => forwardRef((props: any, ref) => {
    const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props
    return createElement(tag, { ...rest, ref })
  })
  return { motion: { aside: element('aside'), div: element('div') }, AnimatePresence: ({ children }: any) => children }
})

const fixture = (overrides = {}) => ({ _id: 'event123', title: 'Noche de jazz', description: 'Música en directo.', category: 'music',
  date: '2036-12-02T01:30:00Z', endDate: '2036-12-02T04:00:00Z', timeZone: 'America/Santo_Domingo', status: 'published',
  images: [], price: { amount: 25, currency: 'USD' }, location: { coordinates: [-3.7, 40.4], address: 'Teatro Central', city: 'Madrid', country: 'España' },
  attendees: [], maxAttendees: 100, attendeesCount: 12, createdBy: { _id: 'owner', firstName: 'Ana', lastName: 'Pérez' }, ...overrides })

function panelProps(overrides: Record<string, any> = {}) {
  return { selectedEvent: fixture() as any, selectedTribe: null, userLocation: null, isFavorite: () => false,
    onToggleFavorite: vi.fn(), onClose: vi.fn(), onAttendToggle: vi.fn().mockResolvedValue(undefined), onJoinTribe: vi.fn().mockResolvedValue(undefined), ...overrides }
}

beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('discovery detail panel', () => {
  it('opens legacy map records with malformed attendees without crashing', () => {
    render(<DiscoveryDetailPanel {...panelProps({ selectedEvent: fixture({ attendeesCount: undefined, attendees: { count: 3 } }) })} />)
    expect(screen.getByRole('dialog', { name: 'Noche de jazz' })).toBeTruthy()
    expect(screen.getByText('0 confirmados de 100')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver detalles del evento' }).getAttribute('href')).toBe('/events/event123')
  })

  it('does not enable attendance for events pending approval', () => {
    const props = panelProps({ selectedEvent: fixture({ status: 'pending_review' }) })
    render(<DiscoveryDetailPanel {...props} />)
    const action = screen.getByRole('button', { name: 'Ver entradas' }) as HTMLButtonElement
    expect(action.disabled).toBe(true)
    fireEvent.click(action)
    expect(props.onAttendToggle).not.toHaveBeenCalled()
  })

  it('uses actual currency and event timezone without inventing organizer verification or active features', () => {
    render(<DiscoveryDetailPanel {...panelProps()} />)
    expect(screen.getByText(/US\$25/)).toBeTruthy()
    const displayedDate = new Date('2036-12-02T01:30:00Z').toLocaleString('es-DO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo', timeZoneName: 'short' })
    expect(screen.getByText(displayedDate.replace(/\s+/g, ' '))).toBeTruthy()
    expect(screen.queryByText('Verificado')).toBeNull()
    expect(screen.queryByText(/Funciones interactivas activas/)).toBeNull()
    expect(screen.queryByText(/Álbum Privado|Radar de After/)).toBeNull()
    expect(screen.getByText('12 confirmados de 100')).toBeTruthy()
  })

  it('does not invent a location or enable navigation when coordinates are missing', () => {
    render(<DiscoveryDetailPanel {...panelProps({ selectedEvent: fixture({ location: {} }) })} />)
    expect(screen.getByText('Ubicación por confirmar')).toBeTruthy()
    expect(screen.queryByText(/Santo Domingo|República Dominicana/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Google Maps' })).toBeNull()
  })

  it('does not expose or navigate to secret coordinates, even when approximate coordinates exist', () => {
    render(<DiscoveryDetailPanel {...panelProps({ selectedEvent: fixture({ isSecretLocation: true, distance: 4 }), userLocation: { lat: 18.4, lng: -69.9 } })} />)
    expect(screen.queryByText('Teatro Central')).toBeNull()
    expect(screen.queryByText(/Madrid/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Google Maps' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ir con Waze' })).toBeNull()
    expect(screen.queryByText(/4.0 km/)).toBeNull()
  })

  it('opens directions without a fabricated origin in world or city mode', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<DiscoveryDetailPanel {...panelProps()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Google Maps' }))
    const url = new URL(String(open.mock.calls[0][0]))
    expect(url.searchParams.get('destination')).toBe('40.4,-3.7')
    expect(url.searchParams.has('origin')).toBe(false)
  })

  it('uses a supplied valid origin for directions', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<DiscoveryDetailPanel {...panelProps({ userLocation: { lat: 18.4, lng: -69.9 } })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Google Maps' }))
    expect(new URL(String(open.mock.calls[0][0])).searchParams.get('origin')).toBe('18.4,-69.9')
  })

  it.each(['completed', 'cancelled'])('does not mutate attendance for %s events', status => {
    const props = panelProps({ selectedEvent: fixture({ status }) })
    render(<DiscoveryDetailPanel {...props} />)
    const button = screen.getByRole('button', { name: status === 'cancelled' ? 'Evento cancelado' : 'Evento finalizado' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(props.onAttendToggle).not.toHaveBeenCalled()
  })

  it('delegates paid entry navigation and blocks repeated actions until the callback settles', async () => {
    let finish!: () => void
    const callback = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    const props = panelProps({ onAttendToggle: callback })
    render(<DiscoveryDetailPanel {...props} />)
    const button = screen.getByRole('button', { name: 'Ver entradas' })
    fireEvent.click(button); fireEvent.click(button)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(props.selectedEvent)
    finish()
    await waitFor(() => expect((screen.getByRole('button', { name: 'Ver entradas' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('supports named closing, Escape and focus restoration', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger); trigger.focus()
    const props = panelProps()
    const view = render(<DiscoveryDetailPanel {...props} />)
    const close = screen.getByRole('button', { name: 'Cerrar panel' })
    expect(screen.getByRole('dialog', { name: 'Noche de jazz' })).toBeTruthy()
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})

describe('discovery carousel', () => {
  it('uses real accessible buttons, currency and timezone and hides distances without an origin', () => {
    const select = vi.fn()
    render(<DiscoveryCarousel items={[fixture({ distance: 4 })]} viewType="events" selectedId="event123" onSelect={select} />)
    const card = screen.getByRole('button', { name: /Noche de jazz/ })
    expect(card.tagName).toBe('BUTTON')
    expect(card.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/US\$25/)).toBeTruthy()
    expect(screen.queryByText(/4.0 km/)).toBeNull()
    fireEvent.click(card)
    expect(select).toHaveBeenCalledTimes(1)
  })

  it('does not invent a city or describe world-scope tribes as nearby', () => {
    render(<DiscoveryCarousel items={[{ _id: 'tribe', name: 'Fotografía', category: 'art' }]} viewType="tribes" onSelect={() => {}} />)
    expect(screen.getByText('Ubicación por confirmar')).toBeTruthy()
    expect(screen.queryByText(/Santo Domingo|cercanas/)).toBeNull()
  })

  it('collapses accessibly and respects the busy action guard', () => {
    const select = vi.fn()
    render(<DiscoveryCarousel items={[fixture()]} viewType="events" onSelect={select} busyAction />)
    const card = screen.getByRole('button', { name: /Noche de jazz/ }) as HTMLButtonElement
    expect(card.disabled).toBe(true)
    fireEvent.click(card)
    expect(select).not.toHaveBeenCalled()
    const collapse = screen.getByRole('button', { name: /eventos en el mapa/ })
    fireEvent.click(collapse)
    expect(collapse.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('region', { name: 'Eventos en el mapa' })).toBeNull()
  })
})
