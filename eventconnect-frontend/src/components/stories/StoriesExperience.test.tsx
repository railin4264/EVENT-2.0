// @vitest-environment jsdom
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import StoriesExperience from './StoriesExperience'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: false, user: null }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))

let queryClient: QueryClient
const show = (storyId?: string) => render(<QueryClientProvider client={queryClient}><StoriesExperience storyId={storyId} /></QueryClientProvider>)

describe('Stories guest access', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React)
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })
  afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals() })

  it('explains login with a return path and makes no protected API requests for a guest', () => {
    show()
    expect(screen.getByRole('link', { name: 'Entrar para ver historias' }).getAttribute('href')).toBe('/login?redirect=%2Fstories')
    expect(screen.getByRole('link', { name: 'Seguir explorando eventos' }).getAttribute('href')).toBe('/')
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('preserves a shared story destination through login and registration', () => {
    show('story123')
    expect(screen.getByRole('link', { name: 'Entrar para ver historias' }).getAttribute('href')).toBe('/login?redirect=%2Fstories%2Fstory123')
    expect(screen.getByRole('link', { name: 'Crear cuenta' }).getAttribute('href')).toBe('/register?redirect=%2Fstories%2Fstory123')
    expect(mocks.get).not.toHaveBeenCalled()
  })
})
