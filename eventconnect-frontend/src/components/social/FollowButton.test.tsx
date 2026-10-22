// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FollowButton } from './FollowButton'

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: false, user: null as null | { id: string } },
  push: vi.fn(), toast: vi.fn(), status: vi.fn(), follow: vi.fn(), unfollow: vi.fn(),
  store: { followStatuses: {} as Record<string, { isFollowing: boolean; followsMe: boolean; isMutual: boolean }> }
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/' }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/followsStore', () => ({ useFollowsStore: () => ({ ...mocks.store, getFollowStatus: mocks.status, followUser: mocks.follow, unfollowUser: mocks.unfollow }) }))
vi.mock('@/components/redesign/ui/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

describe('FollowButton for public discovery', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React)
    vi.clearAllMocks()
    mocks.auth = { isAuthenticated: false, user: null }
    mocks.store.followStatuses = {}
    mocks.status.mockResolvedValue({ isFollowing: false })
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('lets guests request login without calling a protected follow endpoint', () => {
    render(<FollowButton userId="organizer" />)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    expect(mocks.push).toHaveBeenCalledWith('/login?redirect=%2F')
    expect(mocks.status).not.toHaveBeenCalled()
    expect(mocks.follow).not.toHaveBeenCalled()
  })

  it('automatically loads authenticated status and catches a failure with a retry action', async () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'viewer' } }
    mocks.status.mockRejectedValueOnce(new Error('Offline'))
    render(<FollowButton userId="organizer" />)
    const retry = await screen.findByRole('button', { name: 'Reintentar seguimiento' })
    expect(mocks.status).toHaveBeenCalledTimes(1)
    mocks.status.mockImplementationOnce(async () => {
      mocks.store.followStatuses.organizer = { isFollowing: false, followsMe: false, isMutual: false }
    })
    fireEvent.click(retry)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    await waitFor(() => expect(mocks.follow).toHaveBeenCalledWith('organizer'))
  })

  it('hides the action on the current user when auth exposes the id alias', () => {
    mocks.auth = { isAuthenticated: true, user: { id: 'viewer' } }
    const { container } = render(<FollowButton userId="viewer" />)
    expect(container.textContent).toBe('')
    expect(mocks.status).not.toHaveBeenCalled()
  })
})
