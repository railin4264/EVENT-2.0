import { describe, expect, it } from 'vitest'
import { ESTIMATED_EVENT_DURATION_MS, getEventPhase, getEventTiming } from './event-phase'

const event = { date: '2026-10-23T20:00:00-04:00', endDate: '2026-10-23T23:00:00-04:00', status: 'published' }
const start = new Date(event.date).getTime()
const end = new Date(event.endDate).getTime()

describe('event phase presentation', () => {
  it('is upcoming until the start and live at the exact start boundary', () => {
    expect(getEventPhase(event, start - 1)).toBe('upcoming')
    expect(getEventPhase(event, start)).toBe('live')
  })
  it('remains live until the end and ends at the exact end boundary', () => {
    expect(getEventPhase(event, end - 1)).toBe('live')
    expect(getEventPhase(event, end)).toBe('ended')
  })
  it('respects the ISO timezone offset across midnight in UTC', () => {
    expect(getEventPhase(event, new Date('2026-10-24T00:00:00Z'))).toBe('live')
    expect(getEventPhase(event, new Date('2026-10-24T03:00:00Z'))).toBe('ended')
  })
  it('uses a documented two-hour estimate when endDate is absent', () => {
    const withoutEnd = { date: event.date, status: 'published' }
    expect(getEventTiming(withoutEnd, start).endIsEstimated).toBe(true)
    expect(getEventPhase(withoutEnd, start + ESTIMATED_EVENT_DURATION_MS - 1)).toBe('live')
    expect(getEventPhase(withoutEnd, start + ESTIMATED_EVENT_DURATION_MS)).toBe('ended')
  })
  it.each(['invalid', '2026-10-23T19:00:00-04:00'])('uses the same safe estimate for an unusable endDate %s', endDate => {
    expect(getEventTiming({ ...event, endDate }, start).endsAt).toBe(start + ESTIMATED_EVENT_DURATION_MS)
  })
  it('honors an explicit zero-duration event instead of inventing two extra hours', () => {
    const instantEvent = { ...event, endDate: event.date }
    expect(getEventPhase(instantEvent, start - 1)).toBe('upcoming')
    expect(getEventPhase(instantEvent, start)).toBe('ended')
    expect(getEventTiming(instantEvent, start).endIsEstimated).toBe(false)
  })
  it('takes cancellation over dates or a future start', () => {
    expect(getEventPhase({ ...event, status: 'cancelled' }, start - 1)).toBe('cancelled')
    expect(getEventPhase({ ...event, status: 'cancelled' }, end + 1)).toBe('cancelled')
  })
  it.each(['completed', 'expired'])('honors authoritative status %s', status => {
    expect(getEventPhase({ ...event, status }, start - 1)).toBe('ended')
  })
  it('never claims live for missing dates, invalid clocks or unpublished drafts', () => {
    expect(getEventPhase({}, start)).toBe('upcoming')
    expect(getEventPhase({ date: 'invalid' }, start)).toBe('upcoming')
    expect(getEventPhase(event, NaN)).toBe('upcoming')
    expect(getEventPhase({ ...event, status: 'draft' }, start)).toBe('upcoming')
  })
})
