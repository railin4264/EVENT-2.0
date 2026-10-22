// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import PassportPage from './page'

const state = vi.hoisted(() => ({ query: { data: undefined, isLoading: false, error: null as Error | null, refetch: vi.fn() }, authenticated: true }))
vi.mock('@tanstack/react-query', () => ({ useQuery: () => state.query }))
vi.mock('@/lib/api/client', () => ({ apiClient: {} }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: state.authenticated, user: { id: 'viewer' } }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))

describe('Passport request states', () => {
  beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); state.authenticated = true; state.query.isLoading = false; state.query.error = null })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  it('does not display a fabricated passport while loading', () => {
    state.query.isLoading = true
    render(<PassportPage />)
    expect(screen.getByRole('status').textContent).toContain('Cargando')
    expect(screen.queryByText('RD-EN-000000')).toBeNull()
  })
  it('offers retry on failure instead of presenting zero stamps as a successful result', () => {
    state.query.error = new Error('Offline')
    render(<PassportPage />)
    expect(screen.getByRole('alert').textContent).toContain('No pudimos cargar')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.query.refetch).toHaveBeenCalledOnce()
    expect(screen.queryByText('RD-EN-000000')).toBeNull()
  })
})
