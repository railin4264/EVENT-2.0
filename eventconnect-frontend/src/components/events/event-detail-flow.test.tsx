// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EventDetailPage from '@/app/events/[id]/page'
import EventDetailError from '@/app/events/[id]/error'

const mocks = vi.hoisted(() => ({
  push: vi.fn(), get: vi.fn(), post: vi.fn(), error: vi.fn(), success: vi.fn(),
  storyExport: vi.fn(), flyerExport: vi.fn(),
  auth: { isAuthenticated: false, user: null as any },
  search: '',
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, back: vi.fn() }), useParams: () => ({ id: 'event123' }), useSearchParams: () => new URLSearchParams(mocks.search) }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(() => mocks.auth, { getState: () => mocks.auth }) }))
vi.mock('@/hooks/usePublicConfig', () => ({ usePublicConfig: () => ({ paymentsEnabled: true }) }))
vi.mock('react-hot-toast', () => ({ default: { error: mocks.error, success: mocks.success } }))
vi.mock('@/components/social/FollowButton', () => ({ FollowButton: () => null }))
vi.mock('@/components/stories/StoriesBar', () => ({ default: () => null }))
vi.mock('@/components/comments', () => ({ CommentSection: () => null }))
vi.mock('@/components/discovery/CategoryBadge', () => ({ CategoryBadge: () => null }))
vi.mock('@/components/events/SoloGoersSection', () => ({ SoloGoersSection: () => null }))
vi.mock('@/components/events/EventPracticalInfo', () => ({ EventPracticalInfo: () => null }))
vi.mock('@/components/events/OrganizerReliability', () => ({ default: () => null }))
vi.mock('@/components/social/StoryExportModal', () => ({ StoryExportModal: (props: any) => { mocks.storyExport(props); return null } }))
vi.mock('@/components/events/SerruchoModal', () => ({ SerruchoModal: () => null }))
vi.mock('@/components/events/VibeRadarSection', () => ({ default: () => null }))
vi.mock('@/components/events/SafetyCoroSection', () => ({ default: () => null }))
vi.mock('@/components/social/FlyerExportModal', () => ({ default: (props: any) => { mocks.flyerExport(props); return null } }))
vi.mock('@/components/events/MutualReconnectSection', () => ({ MutualReconnectSection: () => null }))
vi.mock('@/components/events/EventMemoriesSection', () => ({ EventMemoriesSection: () => null }))
vi.mock('@/components/events/EventAfterRadarSection', () => ({ EventAfterRadarSection: () => null }))
vi.mock('@/components/events/EventPlusOneSection', () => ({ EventPlusOneSection: () => null }))
vi.mock('@/components/events/EventSongVotingSection', () => ({ EventSongVotingSection: () => <div>Lista de canciones de prueba</div> }))
vi.mock('framer-motion', async () => {
  const { createElement, forwardRef } = await import('react')
  const element = (tag: string) => forwardRef((props: any, ref) => {
    const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props
    return createElement(tag, { ...rest, ref })
  })
  return { motion: { div: element('div'), button: element('button') }, AnimatePresence: ({ children }: any) => children }
})

function fixture(overrides = {}) {
  return { _id: 'event123', title: 'Música en la ciudad', description: 'Un concierto abierto.', date: new Date(Date.now() + 86400000).toISOString(),
    maxAttendees: 100, attendeesCount: 3, price: { amount: 0, currency: 'DOP' }, tags: [], images: [], isPrivate: false, status: 'published',
    createdBy: { _id: 'owner123', firstName: 'Ana', lastName: 'Pérez', username: 'ana' }, ...overrides }
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><EventDetailPage /></QueryClientProvider>)
  return { ...view, refreshAuth: () => view.rerender(<QueryClientProvider client={client}><EventDetailPage /></QueryClientProvider>) }
}

beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.clearAllMocks()
  mocks.auth = { isAuthenticated: false, user: null }
  mocks.search = ''
  mocks.get.mockResolvedValue({ data: { event: fixture() } })
  mocks.post.mockResolvedValue({ data: { success: true } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('uses the privacy projection for visible profiles and capacity instead of legacy pending-inclusive counts', async () => {
  const attendeeId = '1234567890abcdef12345678'
  mocks.get.mockResolvedValue({ data: { event: fixture({
    maxAttendees: 10, attendeesCount: 10,
    attendees: [{ user: { _id: 'abcdef123456789012345678', firstName: 'Reservada' }, status: 'confirmed' }],
    attendanceSummary: { confirmedCount: 2, hiddenCount: 1, visibleAttendees: [{ id: attendeeId, firstName: 'Luz', username: 'luz' }] },
  }) } })
  mount()
  await screen.findByRole('link', { name: 'Ver perfil de Luz' })
  expect(screen.queryByRole('link', { name: 'Ver perfil de Reservada' })).toBeNull()
  expect(screen.getByText('Inscripciones confirmadas: 2')).toBeTruthy()
  expect(screen.getByText('Disponibles').parentElement?.textContent).toContain('8')
  expect(screen.getByText('20%')).toBeTruthy()
})

describe('public event action flow', () => {
  it('restores an RSVP intent after login without confirming until an explicit click and blocks duplicate clicks', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.search = 'intent=rsvp'
    mount()
    await screen.findByText('Solo falta tu confirmación')
    const confirm = screen.getByRole('button', { name: 'Confirmar asistencia gratis' })
    expect(mocks.post).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Asistencia confirmada'))
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(mocks.post).toHaveBeenCalledWith('/events/event123/join')
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/events/event123')
    expect(screen.getByRole('button', { name: 'Salir del Evento' })).toBeTruthy()
    expect(screen.queryByText('Solo falta tu confirmación')).toBeNull()
  })

  it('does not treat unrelated URL actions as an RSVP or an attendance request', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.search = 'intent=join&attend=true'
    mount()
    await screen.findByRole('button', { name: 'Confirmar asistencia gratis' })
    expect(screen.queryByText('Solo falta tu confirmación')).toBeNull()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('stops before POST when the authenticated preflight denies age or private access', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mount()
    const confirm = await screen.findByRole('button', { name: 'Confirmar asistencia gratis' })
    mocks.get.mockRejectedValueOnce({ response: { status: 403, data: { message: 'No cumples los requisitos de edad del evento' } } })
    fireEvent.click(confirm)
    expect(await screen.findByText('No cumples los requisitos de edad del evento')).toBeTruthy()
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('does not use the free join endpoint when the preflight price changed to paid', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.get.mockResolvedValueOnce({ data: { event: fixture() } }).mockResolvedValue({ data: { event: fixture({ price: { amount: 500, currency: 'DOP' } }) } })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar asistencia gratis' }))
    await screen.findByText('El precio cambió. Revisa las opciones de entrada antes de confirmar.')
    expect(mocks.post).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: /Comprar Entrada/ }))
    expect(mocks.push).toHaveBeenCalledWith('/checkout/event123')
  })

  it('shows confirmation failure and retries only when requested', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.post.mockRejectedValueOnce({ response: { data: { message: 'Conexión interrumpida al confirmar' } } })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar asistencia gratis' }))
    await screen.findByText('Conexión interrumpida al confirmar')
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Salir del Evento' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar confirmación' }))
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Asistencia confirmada'))
    expect(mocks.post).toHaveBeenCalledTimes(2)
  })

  it('does not confirm under a different account if authentication changed during preflight', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'account-a' } }
    const view = mount()
    const confirm = await screen.findByRole('button', { name: 'Confirmar asistencia gratis' })
    let resolve!: (value: any) => void
    mocks.get.mockReturnValueOnce(new Promise(yes => { resolve = yes }))
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2))
    mocks.auth = { isAuthenticated: true, user: { id: 'account-b' } }
    view.refreshAuth()
    await act(async () => resolve({ data: { event: fixture() } }))
    await screen.findByRole('button', { name: 'Confirmar asistencia gratis' })
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Salir del Evento' })).toBeNull()
  })

  it.each([
    { attendees: [{ user: 'confirmed', status: 'confirmed' }, { user: 'pending', status: 'pending' }], label: '1' },
    { attendees: undefined, label: 'Por confirmar' },
  ])('labels visible confirmed registrations from the verifiable breakdown: $label', async ({ attendees, label }) => {
    mocks.get.mockResolvedValue({ data: { event: fixture({ attendeesCount: 2, attendees }) } })
    mount()
    await screen.findByText(`Inscripciones confirmadas: ${label}`)
    expect(screen.getByText('Inscripciones confirmadas').parentElement?.textContent).toContain(label)
    expect(screen.queryByText('2/100 asistentes')).toBeNull()
  })

  it('prepares the public WhatsApp invitation and reuses exports without exposing a revealed secret location', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.get.mockResolvedValue({ data: { event: fixture({ isAttending: true, isSecretLocation: true, location: { type: 'Point', venue: 'Recinto secreto', address: 'Dirección reservada 997', coordinates: [-69.987654, 18.876543] } }) } })
    mount()
    const invitation = await screen.findByRole('link', { name: 'Armar el coro en WhatsApp' })
    expect(new URL(invitation.getAttribute('href')!).searchParams.get('text')).toContain('Ubicación reservada')
    expect(decodeURIComponent(invitation.getAttribute('href')!)).not.toMatch(/Recinto secreto|Dirección reservada|69\.987654|18\.876543/)
    expect(mocks.storyExport).toHaveBeenCalled()
    expect(mocks.flyerExport).toHaveBeenCalled()
    for (const renderExport of [mocks.storyExport, mocks.flyerExport]) {
      const data = renderExport.mock.calls.at(-1)![0].event
      expect(data.location).toEqual({ venue: 'Ubicación reservada', address: 'Ubicación reservada' })
    }
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('does not offer public invitations or exports for a private event', async () => {
    mocks.get.mockResolvedValue({ data: { event: fixture({ isPrivate: true }) } })
    mount()
    await screen.findByRole('heading', { name: 'Música en la ciudad' })
    expect(screen.queryByRole('link', { name: 'Armar el coro en WhatsApp' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Compartir' }) as HTMLButtonElement).disabled).toBe(true)
    expect(mocks.storyExport).not.toHaveBeenCalled()
    expect(mocks.flyerExport).not.toHaveBeenCalled()
  })

  it('opens a public event as a visitor without requesting a session', async () => {
    mount()
    await screen.findByRole('heading', { name: 'Música en la ciudad' })
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it.each(['Confirmar asistencia gratis', 'Favoritos', 'Contactar', 'Hacer Serrucho'])('sends visitor action %s to login with return to this event', async action => {
    mount()
    if (action === 'Hacer Serrucho') fireEvent.click(await screen.findByRole('button', { name: /Comparte y organiza con amigos/ }))
    fireEvent.click(await screen.findByRole('button', { name: action }))
    expect(mocks.push).toHaveBeenCalledWith(action === 'Confirmar asistencia gratis' ? '/login?redirect=%2Fevents%2Fevent123%3Fintent%3Drsvp' : '/login?redirect=%2Fevents%2Fevent123')
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('opens paid checkout rather than the free attendance endpoint', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.get.mockResolvedValue({ data: { event: fixture({ price: { amount: 500, currency: 'DOP' }, ticketUrl: 'https://tickets.example.com/' }) } })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: /Comprar Entrada/ }))
    expect(mocks.push).toHaveBeenCalledWith('/checkout/event123')
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('restores favorite state if the save fails', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.post.mockRejectedValue({ response: { data: { message: 'No se pudo guardar' } } })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Favoritos' }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('No se pudo guardar'))
    expect(screen.getByRole('button', { name: 'Favoritos' })).toBeTruthy()
  })

  it('renders incomplete legacy events and disables links to a missing organizer', async () => {
    mocks.get.mockResolvedValue({ data: { event: fixture({ createdBy: null, description: null, price: null, tags: null, location: null }) } })
    mount()
    await screen.findByRole('heading', { name: 'Música en la ciudad' })
    expect((screen.getByRole('button', { name: 'Ver Perfil' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Contactar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('reports clipboard failure without an unhandled rejection', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Compartir' }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('No se pudo compartir. Copia el enlace desde la barra de direcciones.'))
  })

  it('offers login for a restricted event instead of claiming it was deleted', async () => {
    mocks.get.mockRejectedValue({ response: { status: 403 } })
    mount()
    await screen.findByRole('heading', { name: 'Este evento tiene acceso restringido' })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(mocks.push).toHaveBeenCalledWith('/login?redirect=%2Fevents%2Fevent123')
  })

  it('keeps the main attendance action before the long information sections on mobile', async () => {
    mount()
    const join = await screen.findByRole('button', { name: 'Confirmar asistencia gratis' })
    const description = screen.getByRole('heading', { name: 'Descripción' })
    expect(join.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('does not advertise a live virtual stream or expose its link before the event starts', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.get.mockResolvedValue({ data: { event: fixture({ isVirtual: true, isAttending: true, virtualLink: 'https://stream.example.com/' }) } })
    mount()
    await screen.findByRole('heading', { name: 'Música en la ciudad' })
    expect(screen.queryByText(/Evento Virtual en Vivo/i)).toBeNull()
    expect(screen.queryByRole('link', { name: /Ingresar a la Sala/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Crear Historia/ })).toBeNull()
  })

  it.each(['completed', 'cancelled'])('keeps attendance history and disables new purchases for status %s', async status => {
    mocks.auth = { isAuthenticated: true, user: { id: 'guest123' } }
    mocks.get.mockResolvedValue({ data: { event: fixture({ status, isAttending: true, ticketUrl: 'https://tickets.example.com/' }) } })
    mount()
    await screen.findByRole('heading', { name: 'Música en la ciudad' })
    expect(screen.queryByRole('button', { name: /Unirse al Evento|Salir del Evento|Comprar Entrada/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Comprar entradas oficiales/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Favoritos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Compartir' })).toBeTruthy()
    expect(mocks.post).not.toHaveBeenCalled()
  })
})


it.each([404, 410, 429])('offers a safe return to the map after HTTP %s', async status => {
  mocks.get.mockRejectedValue({ response: { status } })
  mount()
  expect((await screen.findByRole('link', { name: 'Volver al mapa' })).getAttribute('href')).toBe('/discovery')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(status === 429 ? 'Espera un momento' : 'ya no está disponible')
})

it('loads music and company only after opening their section', async () => {
  mocks.get.mockResolvedValue({ data: { event: fixture({ category: 'music' }) } })
  mount()
  await screen.findByRole('heading', { name: 'Música en la ciudad' })
  expect(mocks.get.mock.calls.some(([url]) => /\/songs|\/coro-match/.test(url))).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: /Música y compañía/ }))
  expect(await screen.findByText('Lista de canciones de prueba')).toBeTruthy()
})


it('keeps song requests to musical events and transport tools to in-person events', async () => {
  mocks.get.mockResolvedValue({ data: { event: fixture({ category: 'technology', isVirtual: true, virtualLink: 'https://stream.example.com/' }) } })
  mount()
  await screen.findByRole('heading', { name: 'Música en la ciudad' })
  expect(screen.queryByRole('button', { name: /Música y compañía/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /Planifica tu salida/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /Personas con quienes ir/ })).toBeNull()
  expect(screen.getByRole('heading', { name: 'Transmisión en línea' })).toBeTruthy()
})

it('recovers from render errors without exposing internal error messages', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const reset = vi.fn()
  render(<EventDetailError error={new Error('Internal stack should stay private')} reset={reset} />)
  expect(screen.queryByText('Internal stack should stay private')).toBeNull()
  expect(screen.getByRole('link', { name: 'Volver al mapa' }).getAttribute('href')).toBe('/discovery')
  fireEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }))
  expect(reset).toHaveBeenCalledTimes(1)
  vi.restoreAllMocks()
})
