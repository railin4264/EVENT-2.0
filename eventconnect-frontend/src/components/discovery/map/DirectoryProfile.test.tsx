// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SuppliersPage from '@/app/suppliers/page'
import UserProfilePage from '@/app/users/[id]/page'
const mocks = vi.hoisted(() => ({ get: vi.fn(), auth: { user: { id: 'bbbbbbbbbbbbbbbbbbbbbbbb' }, isAuthenticated: true } }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }), useRouter: () => ({ back: vi.fn() }) }))
vi.mock('@/components/social', () => ({ FollowButton: () => <button>Seguir</button> }))
vi.mock('@/components/ui/UserBadges', () => ({ UserBadges: () => null, AVAILABLE_BADGES: [] }))
vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div> } }))
let client: QueryClient
beforeEach(() => { vi.stubGlobal('React', React); mocks.auth.isAuthenticated = true; mocks.get.mockReset(); client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }) })
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals() })
const mount = (element: React.ReactNode) => render(<QueryClientProvider client={client}>{element}</QueryClientProvider>)
it('opens the actual flat supplier response and searches its city', async () => {
  mocks.get.mockResolvedValue({ data: { success: true, data: [{ _id: 'dj', name: 'Sonido del Caribe', category: 'dj_sound', city: 'Santiago', rating: 4.8, reviewsCount: 8, whatsapp: '+18095550100' }, { _id: 'camera', name: 'Cámara del Sur' }] } })
  mount(<SuppliersPage />); await screen.findByRole('heading', { name: 'Sonido del Caribe' }); expect(screen.getByRole('link', { name: 'Solicitar cotización' }).getAttribute('href')).toContain('wa.me/18095550100?')
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar suplidores' }), { target: { value: 'Santiago' } }); expect(screen.queryByRole('heading', { name: 'Cámara del Sur' })).toBeNull()
});
it('queries the privacy-aware profile endpoint and never the restricted account endpoint', async () => {
  mocks.get.mockImplementation(async (url: string) => ({ data: url.includes('/users/profile/') ? { user: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', username: 'ana', bio: 'Perfil de Ana', isPrivate: true, canViewAttendance: false, stats: {}, followersCount: 7, followingCount: 3 } } : { events: [] } }))
  mount(<UserProfilePage />); await screen.findByText('Perfil de Ana'); expect(mocks.get).toHaveBeenCalledWith('/users/profile/aaaaaaaaaaaaaaaaaaaaaaaa'); expect(mocks.get).not.toHaveBeenCalledWith('/users/aaaaaaaaaaaaaaaaaaaaaaaa')
  fireEvent.click(screen.getByRole('button', { name: /Asistidos/ })); await screen.findByText('Esta persona mantiene su asistencia privada.'); expect(mocks.get).not.toHaveBeenCalledWith('/users/aaaaaaaaaaaaaaaaaaaaaaaa/attended-events')
});
it('shows a useful unavailable state without repeating a forbidden profile request', async () => {
  mocks.get.mockRejectedValue({ response: { status: 403 } }); mount(<UserProfilePage />); await screen.findByRole('heading', { name: 'Perfil no disponible' }); expect(mocks.get).toHaveBeenCalledTimes(1)
});
it('does not request profile data for guests', async () => {
  mocks.auth.isAuthenticated = false; mount(<UserProfilePage />); await screen.findByRole('link', { name: 'Iniciar sesión' }); expect(mocks.get).not.toHaveBeenCalled()
});

it('reports a supplier outage as an error rather than an empty directory', async () => {
  mocks.get.mockRejectedValue({ response: { status: 503 } }); mount(<SuppliersPage />)
  await screen.findByRole('heading', { name: 'No pudimos cargar los suplidores' }, { timeout: 5000 })
  expect(screen.queryByRole('heading', { name: 'No hay suplidores con estos filtros' })).toBeNull()
  mocks.get.mockResolvedValue({ data: { success: true, data: [{ _id: 'retry', name: 'Equipo recuperado' }] } })
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await screen.findByRole('heading', { name: 'Equipo recuperado' })
});
