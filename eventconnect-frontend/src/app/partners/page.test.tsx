// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PartnersPage from './page'
const mocks = vi.hoisted(() => ({ auth: { user: null as null | { id: string }, isAuthenticated: false }, get: vi.fn(), post: vi.fn() }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post } }))
const need = { _id: 'need1', title: 'Buscamos equipo de sonido', description: 'Condiciones a coordinar', kind: 'in_kind', status: 'open', proposalCount: 0, proposals: [], canManage: false, resource: { title: 'El coro', audience: 4, audienceLabel: 'inscripciones confirmadas' } }
afterEach(cleanup)
beforeEach(() => {
  mocks.auth = { user: null, isAuthenticated: false }; mocks.post.mockReset(); mocks.get.mockReset()
  mocks.get.mockImplementation((path: string) => Promise.resolve({ data: { success: true, data: path.endsWith('/needs') ? [need] : path.endsWith('/mine') ? { needs: [], spaces: [] } : path.endsWith('/targets') ? [{ _id: 'event1', type: 'event', title: 'Mi evento' }] : [] } }))
})
describe('partner workspace', () => {
  it('lets guests inspect real needs and points participation to login', async () => {
    render(<PartnersPage />)
    expect(await screen.findByText('Buscamos equipo de sonido')).toBeTruthy()
    expect(screen.getByText('Entrar para colaborar').getAttribute('href')).toContain('/login?redirect=')
    expect(screen.queryByText('Proponer colaboración')).toBeNull()
    expect(mocks.get).not.toHaveBeenCalledWith('/partners/mine')
  })
  it('submits selected own activity and never infers money or activation', async () => {
    mocks.auth = { user: { id: 'host1' }, isAuthenticated: true }; mocks.post.mockResolvedValue({ data: { success: true } })
    render(<PartnersPage />)
    await screen.findByText('Mi evento', { exact: false })
    fireEvent.change(screen.getByLabelText('Tu actividad'), { target: { value: 'event1' } })
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Un aliado' } })
    fireEvent.change(screen.getByLabelText('Qué necesitas y qué ofreces'), { target: { value: 'Intercambio a coordinar' } })
    fireEvent.click(screen.getByText('Publicar convocatoria'))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/partners/needs', expect.objectContaining({ targetType: 'event', targetId: 'event1', title: 'Un aliado' })))
    expect(await screen.findByText('Convocatoria publicada. Ahora puedes revisar propuestas.')).toBeTruthy()
  })
  it('shows server failure instead of pretending the proposal was accepted', async () => {
    mocks.auth = { user: { id: 'sponsor1' }, isAuthenticated: true }; mocks.post.mockRejectedValue({ response: { data: { message: 'La convocatoria se cerró.' } } })
    render(<PartnersPage />)
    fireEvent.change(await screen.findByLabelText('Tu propuesta'), { target: { value: 'Puedo aportar sonido' } })
    fireEvent.click(screen.getByText('Proponer colaboración'))
    expect((await screen.findByRole('alert')).textContent).toContain('La convocatoria se cerró.')
    expect(screen.queryByText('Propuesta enviada al anfitrión.')).toBeNull()
  })
  it('templates only fill the draft until the host explicitly publishes', async () => {
    mocks.auth = { user: { id: 'host1' }, isAuthenticated: true }
    render(<PartnersPage />)
    fireEvent.click(await screen.findByText('Hidratación para el encuentro'))
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Hidratación para el encuentro')
    expect((screen.getByLabelText('Necesito') as HTMLSelectElement).value).toBe('in_kind')
    expect(mocks.post).not.toHaveBeenCalled()
  })
})
