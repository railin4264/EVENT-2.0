// @vitest-environment jsdom
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LiveVibeRadar } from './LiveVibeRadar'
const query = vi.hoisted(() => ({ data: undefined as any, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQuery: () => query }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: vi.fn() } }))
afterEach(() => { cleanup(); query.data = undefined; query.isError = false })
it('shows actual foreign location and no manufactured heat or default Dominican venue', () => {
  query.data = { success: true, data: [{ _id: '1', title: 'Concierto', location: { city: 'Madrid', country: 'España' }, vibeRadar: { currentVibe: 'none', reportsCount: 0, lastReportedAt: null } }] }
  render(<LiveVibeRadar />)
  expect(screen.getByText('Madrid · España')).toBeTruthy()
  expect(screen.getByText('0 reportes recientes')).toBeTruthy()
  expect(screen.queryByText(/Heat|Santo Domingo|95%/)).toBeNull()
  expect(screen.queryByText('Buen ambiente')).toBeNull()
})
it('distinguishes unavailable data from a valid empty radar', () => {
  query.isError = true
  render(<LiveVibeRadar />)
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByText('Sin eventos en curso con este filtro')).toBeNull()
})
