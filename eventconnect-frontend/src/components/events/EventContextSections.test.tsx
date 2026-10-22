// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EventContextSections } from './EventContextSections'

const session = vi.hoisted(() => ({ isAuthenticated: true }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => session }))
vi.mock('@/components/stories/StoriesBar', () => ({ default: () => <div>stories-marker</div> }))
vi.mock('./SoloGoersSection', () => ({ SoloGoersSection: () => <div>solo-marker</div> }))
vi.mock('./EventPlusOneSection', () => ({ EventPlusOneSection: () => <div>plus-marker</div> }))
vi.mock('./EventSongVotingSection', () => ({ EventSongVotingSection: () => <div>songs-marker</div> }))
vi.mock('./VibeRadarSection', () => ({ default: () => <div>vibe-marker</div> }))
vi.mock('./SafetyCoroSection', () => ({ default: () => <div>safety-marker</div> }))
vi.mock('./EventAfterRadarSection', () => ({ EventAfterRadarSection: () => <div>after-marker</div> }))
vi.mock('./EventMemoriesSection', () => ({ EventMemoriesSection: ({ isAttendee, isOrganizer }: any) => <div>album-{isAttendee || isOrganizer ? 'participant' : 'locked'}</div> }))
vi.mock('./MutualReconnectSection', () => ({ MutualReconnectSection: () => <div>reconnect-marker</div> }))

const event = { _id: 'event', title: 'Concierto', isAttending: true, createdBy: { _id: 'owner', username: 'ana', firstName: 'Ana', lastName: '' } }
beforeEach(() => { vi.stubGlobal('React', React); session.isAuthenticated = true })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('contextual event sections', () => {
  it('keeps optional coordination unmounted until requested before the event', () => {
    render(<EventContextSections event={event} phase="upcoming" isOrganizer={false} onUpdate={() => {}} />)
    expect(screen.queryByText('solo-marker')).toBeNull()
    const disclosure = screen.getByRole('button', { name: /Organiza tu plan/ })
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(disclosure)
    expect(screen.getByText('solo-marker')).toBeTruthy()
    expect(screen.getByText('plus-marker')).toBeTruthy()
    expect(screen.getByText('songs-marker')).toBeTruthy()
    expect(screen.queryByText('vibe-marker')).toBeNull()
    expect(screen.queryByText('after-marker')).toBeNull()
    expect(screen.queryByText(/album-/)).toBeNull()
    expect(screen.queryByText('reconnect-marker')).toBeNull()
  })

  it('shows participant live logistics and keeps afters optional during the event', () => {
    render(<EventContextSections event={event} phase="live" isOrganizer={false} onUpdate={() => {}} />)
    expect(screen.getByText('vibe-marker')).toBeTruthy()
    expect(screen.getByText('safety-marker')).toBeTruthy()
    expect(screen.queryByText('after-marker')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Historias y planes al salir/ }))
    expect(screen.getByText('after-marker')).toBeTruthy()
    expect(screen.queryByText(/album-/)).toBeNull()
    expect(screen.queryByText('reconnect-marker')).toBeNull()
  })

  it('does not expose participant live tools to a visitor even with stale attendee data', () => {
    session.isAuthenticated = false
    render(<EventContextSections event={event} phase="live" isOrganizer={false} onUpdate={() => {}} />)
    expect(screen.queryByText('vibe-marker')).toBeNull()
    expect(screen.queryByText('safety-marker')).toBeNull()
  })

  it('shows memories and reconnection for a confirmed attendee after the event', () => {
    render(<EventContextSections event={event} phase="ended" isOrganizer={false} onUpdate={() => {}} />)
    expect(screen.getByText('album-participant')).toBeTruthy()
    expect(screen.getByText('reconnect-marker')).toBeTruthy()
    expect(screen.queryByText('vibe-marker')).toBeNull()
    expect(screen.queryByText('after-marker')).toBeNull()
    expect(screen.queryByText('songs-marker')).toBeNull()
  })

  it('keeps memories locked and omits reconnection for non-attendees', () => {
    render(<EventContextSections event={{ ...event, isAttending: false }} phase="ended" isOrganizer={false} onUpdate={() => {}} />)
    expect(screen.getByText('album-locked')).toBeTruthy()
    expect(screen.queryByText('reconnect-marker')).toBeNull()
  })

  it('mounts no promotional or social event tools after cancellation', () => {
    const { container } = render(<EventContextSections event={event} phase="cancelled" isOrganizer={false} onUpdate={() => {}} />)
    expect(container.innerHTML).toBe('')
  })
})
