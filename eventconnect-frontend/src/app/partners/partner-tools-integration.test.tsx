// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PartnersPage from './page'
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: null, isAuthenticated: false }) }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: vi.fn() } }))
beforeEach(() => {
  mocks.get.mockImplementation((path: string) => Promise.resolve({ data: { success: true, data: path.endsWith('/needs') ? [
    { _id: 'n1', title: 'Música para todos', description: 'Equipo para el coro', kind: 'in_kind', status: 'open', proposalCount: 0, proposals: [], resource: { title: 'Actividad A', city: 'Bogotá', audience: 3, audienceLabel: 'interesados' } },
    { _id: 'n2', title: 'Un salón de taller', description: 'Un espacio', kind: 'space', status: 'open', proposalCount: 0, proposals: [], resource: { title: 'Actividad B', city: 'Lima', audience: 2, audienceLabel: 'interesados' } }
  ] : [{ _id: 's1', title: 'Espacio pequeño', city: 'Bogotá', country: 'Colombia', capacity: 20, conditions: 'Consultar', availability: 'Consultar' }, { _id: 's2', title: 'Espacio amplio', city: 'Lima', country: 'Perú', capacity: 100, conditions: 'Consultar', availability: 'Consultar' }] } }))
})
afterEach(cleanup)
it('actually filters displayed needs with the search, kind and real city controls', async () => {
  render(<PartnersPage />); await screen.findByText('Música para todos')
  fireEvent.change(screen.getByLabelText('Buscar convocatorias'), { target: { value: 'musica' } })
  expect(screen.queryByText('Un salón de taller')).toBeNull()
  fireEvent.change(screen.getByLabelText('Tipo de colaboración'), { target: { value: 'in_kind' } })
  fireEvent.change(screen.getByLabelText('Ciudad de la convocatoria'), { target: { value: 'Lima' } })
  expect(screen.queryByText('Música para todos')).toBeNull()
  fireEvent.change(screen.getByLabelText('Ciudad de la convocatoria'), { target: { value: 'Bogotá' } })
  expect(screen.getByText('Música para todos')).toBeTruthy()
  expect(screen.getByText(/sólo a los resultados cargados/)).toBeTruthy()
})
it('actually filters venue capacity and country in the loaded directory', async () => {
  render(<PartnersPage />); await screen.findByText('Espacio pequeño')
  fireEvent.change(screen.getByLabelText('Capacidad mínima del espacio'), { target: { value: '80' } })
  expect(screen.queryByText('Espacio pequeño')).toBeNull(); expect(screen.getByText('Espacio amplio')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('País del espacio'), { target: { value: 'Colombia' } })
  expect(screen.queryByText('Espacio amplio')).toBeNull()
  expect(screen.getByText('No hay espacios cargados que coincidan con estos filtros.')).toBeTruthy()
})
