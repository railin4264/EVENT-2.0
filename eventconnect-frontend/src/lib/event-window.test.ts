import { describe, expect, it } from 'vitest'
import { isInNextPlanWindow, nextPlanQuery, NEXT_PLAN_WINDOW_MS } from './event-window'
import { filterEvents } from '@/components/discovery/discovery-utils'

const now = new Date('2026-10-19T23:00:00-04:00')
const time = now.getTime()
const event = (start: number, extra = {}) => ({ date: new Date(start), status: 'published', isPrivate: false, ...extra })

describe('rolling next-plan window', () => {
  it('includes ongoing plans and tomorrow morning, with an exclusive 12-hour edge', () => {
    expect(isInNextPlanWindow(event(time - 3600000), now)).toBe(true)
    expect(isInNextPlanWindow(event(time + 7200000), now)).toBe(true)
    expect(isInNextPlanWindow(event(time + NEXT_PLAN_WINDOW_MS - 1), now)).toBe(true)
    expect(isInNextPlanWindow(event(time + NEXT_PLAN_WINDOW_MS), now)).toBe(false)
    expect(nextPlanQuery(now)).toEqual({ startsBefore: '2026-10-20T15:00:00.000Z' })
  })
  it('honors explicit ends for long-running events and stops at the exact end', () => {
    expect(isInNextPlanWindow(event(time - 86400000, { endDate: new Date(time + 1) }), now)).toBe(true)
    expect(isInNextPlanWindow(event(time - 3600000, { endDate: now }), now)).toBe(false)
  })
  it('matches the existing two-hour estimate only when an explicit end is unavailable', () => {
    expect(isInNextPlanWindow(event(time - 7200000 + 1), now)).toBe(true)
    expect(isInNextPlanWindow(event(time - 7200000), now)).toBe(false)
  })
  it.each(['cancelled', 'completed', 'expired', 'draft', 'pending', 'rejected', undefined])('does not promote an unpublished or inactive event (%s)', status => {
    expect(isInNextPlanWindow(event(time + 1, { status }), now)).toBe(false)
  })
  it('rejects private events, invalid dates and invalid clocks', () => {
    expect(isInNextPlanWindow(event(time + 1, { isPrivate: true }), now)).toBe(false)
    expect(isInNextPlanWindow({ date: 'not-a-date', status: 'published' }, now)).toBe(false)
    expect(isInNextPlanWindow(event(time), NaN)).toBe(false)
  })
  it('combines the rolling window with category and content filters without mutating records', () => {
    const events = [
      { ...event(time + 3600000), _id: 'music', title: 'Plan', category: 'music' },
      { ...event(time + 3600000), _id: 'sports', title: 'Plan', category: 'sports' },
      { ...event(time + 86400000), _id: 'tomorrow-night', title: 'Plan', category: 'music' },
    ]
    const before = JSON.stringify(events)
    const result = filterEvents(events as any, { date: 'next12h', category: 'music', query: '', sort: 'soon', location: null }, now)
    expect(result.map(e => e._id)).toEqual(['music'])
    expect(JSON.stringify(events)).toBe(before)
  })
})
