// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import EventCommunityActions from './EventCommunityActions'
const mock = vi.hoisted(() => ({ owner: 'member', get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mock.get, post: mock.post, put: mock.put, patch: mock.patch, delete: mock.delete } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: mock.owner ? { id: mock.owner } : null, isAuthenticated: !!mock.owner }) }))
const fixture = (patch = {}) => ({ title: 'Coro comunitario', canManage: false, canContribute: true, canRepeat: false, canSetMeetup: false, canJoinMeetup: true, roles: [], repeat: { interested: false, interestedCount: 0, days: [], dayCounts: {} }, meetup: null, ...patch })
const response = (data: unknown) => ({ data: { success: true, data } })
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mock.owner = 'member'; mock.get.mockResolvedValue(response(fixture())) })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
it('does not join or submit a vote when merely opening the page', async () => {
  render(<EventCommunityActions id="event-a" />); await screen.findByText('Coro comunitario')
  expect(mock.post).not.toHaveBeenCalled(); expect(mock.put).not.toHaveBeenCalled()
})
it('guests get a sign-in return link and no participation button', async () => {
  mock.owner = ''; render(<EventCommunityActions id="event-a" />)
  const link = await screen.findByRole('link', { name: 'Iniciar sesión' })
  expect(link.getAttribute('href')).toContain(encodeURIComponent('/community/events/event-a'))
  expect(screen.queryByRole('button', { name: 'Quiero otra edición' })).toBeNull()
})
it('a failed meetup join remains an error instead of displaying a membership', async () => {
  mock.get.mockResolvedValue(response(fixture({ meetup: { place: 'Parque central', time: new Date(Date.now() + 3600000).toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString(), joined: false, names: [], participantCount: 0 } })))
  mock.put.mockRejectedValue(new Error('Sin conexión'))
  render(<EventCommunityActions id="event-a" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Apuntarme al encuentro' }))
  await screen.findByText('Sin conexión')
  expect(mock.put).toHaveBeenCalledWith('/community-actions/events/event-a/meetup/join', { joined: true, shareName: false })
  expect(screen.queryByRole('button', { name: 'Salir del encuentro' })).toBeNull()
})
it('ignores a late response belonging to the previous account', async () => {
  let resolveFirst: (value: unknown) => void = () => {}
  mock.get.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve })).mockResolvedValueOnce(response(fixture({ title: 'Cuenta nueva' })))
  const { rerender } = render(<EventCommunityActions id="event-a" />)
  mock.owner = 'other'; rerender(<EventCommunityActions id="event-a" />)
  await screen.findByText('Cuenta nueva')
  await act(async () => resolveFirst(response(fixture({ title: 'Datos de la cuenta anterior' }))))
  expect(screen.queryByText('Datos de la cuenta anterior')).toBeNull()
})
it('removes an expired meetup and consented names while the page remains open', async () => {
  vi.useFakeTimers(); const now = Date.now()
  mock.get.mockResolvedValue(response(fixture({ meetup: { place: 'Entrada temporal', time: new Date(now - 100).toISOString(), expiresAt: new Date(now + 1000).toISOString(), joined: true, names: ['Nombre consentido'], participantCount: 1 } })))
  await act(async () => { render(<EventCommunityActions id="event-a" />) })
  expect(screen.getByText('Entrada temporal')).toBeTruthy()
  await act(async () => { vi.advanceTimersByTime(1100) })
  expect(screen.queryByText('Entrada temporal')).toBeNull()
  expect(screen.queryByText(/Nombre consentido/)).toBeNull()
})
