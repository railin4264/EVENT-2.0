// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import StoriesBar from './StoriesBar'
import { useStoriesStore } from '@/stores/storiesStore'

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), push: vi.fn(),
  auth: { isAuthenticated: false, user: null as any },
}))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(() => mocks.auth, { getState: () => mocks.auth }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/events/event123' }))
vi.mock('framer-motion', async () => {
  const { createElement, forwardRef } = await import('react')
  const element = (tag: string) => forwardRef((props: any, ref) => {
    const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props
    return createElement(tag, { ...rest, ref })
  })
  return { motion: { div: element('div'), button: element('button') }, AnimatePresence: ({ children }: any) => children }
})

const story = {
  _id: 'story123', content: 'Historia pública del concierto', media: [],
  author: { _id: 'owner123', firstName: 'Ana', username: 'ana', lastName: '', avatar: '' },
  createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000), views: 0, reactions: 0, replies: 0,
  isViewed: false, hasReacted: false, privacy: 'public', tags: [],
}

beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.clearAllMocks()
  mocks.auth = { isAuthenticated: false, user: null }
  // The bundled Node runtime exposes a non-browser localStorage; use a test-only store.
  useStoriesStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } })
  useStoriesStore.setState({ feedItems: [], myStories: [], currentStory: null, isViewingStories: false, isLoading: false, error: null })
  mocks.get.mockImplementation((path: string) => Promise.resolve({ data: { success: true, stories: path.startsWith('/stories/event/') ? [story] : [] } }))
  mocks.post.mockResolvedValue({ data: { success: true } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('real public event stories component', () => {
  it('loads only public event stories for a visitor and never requests /stories/my', async () => {
    render(<StoriesBar eventId="event123" />)
    await screen.findByRole('button', { name: /Historias/ })
    expect(mocks.get.mock.calls.map(call => call[0])).toEqual(['/stories/event/event123'])
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('opens a real public viewer without calling the protected view endpoint', async () => {
    render(<StoriesBar eventId="event123" />)
    fireEvent.click(await screen.findByRole('button', { name: /Historias/ }))
    await screen.findByText('Historia pública del concierto')
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.get).not.toHaveBeenCalledWith('/stories/my')
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('does not fetch the protected feed or private stories for an anonymous home', async () => {
    render(<StoriesBar />)
    await screen.findByText('No hay historias disponibles')
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('loads private stories only after identity is available and clears them on logout', async () => {
    const { rerender } = render(<StoriesBar eventId="event123" />)
    await screen.findByRole('button', { name: /Historias/ })
    mocks.auth = { isAuthenticated: true, user: { id: 'owner123', firstName: 'Ana' } }
    rerender(<StoriesBar eventId="event123" />)
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/stories/my'))
    useStoriesStore.setState({ myStories: [story as any] })
    mocks.auth = { isAuthenticated: false, user: null }
    const callsBeforeLogout = mocks.get.mock.calls.length
    rerender(<StoriesBar eventId="event123" />)
    await waitFor(() => expect(useStoriesStore.getState().myStories).toEqual([]))
    expect(mocks.get.mock.calls.slice(callsBeforeLogout).map(call => call[0])).toEqual(['/stories/event/event123'])
  })

  it('guards the private store action itself when no account is signed in', async () => {
    await useStoriesStore.getState().fetchMyStories()
    await useStoriesStore.getState().viewStory('story123')
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
  })
})

