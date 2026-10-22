import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventsStore } from './eventsStore'

const api = vi.hoisted(() => ({ getEvents: vi.fn(), searchEvents: vi.fn() }))
vi.mock('@/lib/api/events', () => ({
  ...api, getEvent: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn(),
  attendEvent: vi.fn(), leaveEvent: vi.fn(), viewEvent: vi.fn(), addEventComment: vi.fn(), toggleEventCommentLike: vi.fn(),
}))

function deferred() {
  let resolve!: (value: any) => void
  let reject!: (error: any) => void
  const promise = new Promise<any>((success, failure) => { resolve = success; reject = failure })
  return { promise, resolve, reject }
}
const result = (id: string) => ({ events: [{ _id: id }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } })

beforeEach(() => {
  vi.clearAllMocks()
  useEventsStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } })
  useEventsStore.setState({ events: [{ _id: 'previous' }] as any, pagination: null, isLoading: false, error: null })
})

describe('event list request ordering', () => {
  it('keeps a newer search result when an older destination fetch finishes later', async () => {
    const old = deferred(); const latest = deferred()
    api.getEvents.mockReturnValueOnce(old.promise)
    api.searchEvents.mockReturnValueOnce(latest.promise)
    const first = useEventsStore.getState().fetchEvents({ countryCode: 'DO' })
    const second = useEventsStore.getState().searchEventsAction({ countryCode: 'ES' })
    latest.resolve(result('Madrid')); await second
    old.resolve({ ...result('Santo Domingo'), pagination: { page: 2, limit: 20, total: 99, pages: 5 } }); await first
    expect(useEventsStore.getState().events.map(event => event._id)).toEqual(['Madrid'])
    expect(useEventsStore.getState().pagination).toEqual(result('Madrid').pagination)
    expect(useEventsStore.getState().error).toBeNull()
    expect(useEventsStore.getState().isLoading).toBe(false)
  })

  it('ignores an obsolete search error while the latest fetch is still loading', async () => {
    const old = deferred(); const latest = deferred()
    api.searchEvents.mockReturnValueOnce(old.promise)
    api.getEvents.mockReturnValueOnce(latest.promise)
    const first = useEventsStore.getState().searchEventsAction({ city: 'Santo Domingo' })
    const second = useEventsStore.getState().fetchEvents({ city: 'Madrid' })
    old.reject({ response: { data: { message: 'Old destination is offline' } } })
    await expect(first).resolves.toBeUndefined()
    expect(useEventsStore.getState().isLoading).toBe(true)
    expect(useEventsStore.getState().error).toBeNull()
    expect(useEventsStore.getState().events.map(event => event._id)).toEqual(['previous'])
    latest.resolve(result('Madrid')); await second
    expect(useEventsStore.getState().events.map(event => event._id)).toEqual(['Madrid'])
  })

  it('keeps the latest error when an older fetch succeeds after it', async () => {
    const old = deferred(); const latest = deferred()
    api.getEvents.mockReturnValueOnce(old.promise)
    api.searchEvents.mockReturnValueOnce(latest.promise)
    const first = useEventsStore.getState().fetchEvents({ city: 'Old city' })
    const latestError = { response: { data: { message: 'Latest request failed' } } }
    const second = useEventsStore.getState().searchEventsAction({ city: 'Current city' }).catch(error => error)
    latest.reject(latestError)
    expect(await second).toBe(latestError)
    old.resolve(result('Old city')); await first
    expect(useEventsStore.getState().events.map(event => event._id)).toEqual(['previous'])
    expect(useEventsStore.getState().pagination).toBeNull()
    expect(useEventsStore.getState().error).toBe('Latest request failed')
    expect(useEventsStore.getState().isLoading).toBe(false)
  })

  it('does not replace a successful current result with an obsolete fetch error', async () => {
    const old = deferred(); const latest = deferred()
    api.getEvents.mockReturnValueOnce(old.promise)
    api.searchEvents.mockReturnValueOnce(latest.promise)
    const first = useEventsStore.getState().fetchEvents({ city: 'Old city' })
    const second = useEventsStore.getState().searchEventsAction({ city: 'Current city' })
    latest.resolve(result('Current city')); await second
    old.reject(new Error('Old failure')); await first
    expect(useEventsStore.getState().events.map(event => event._id)).toEqual(['Current city'])
    expect(useEventsStore.getState().error).toBeNull()
    expect(useEventsStore.getState().isLoading).toBe(false)
  })

  it('orders two ordinary list fetches through the same intent sequence', async () => {
    const old = deferred(); const latest = deferred()
    api.getEvents.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = useEventsStore.getState().fetchEvents({ countryCode: 'DO' })
    const second = useEventsStore.getState().fetchEvents({ countryCode: 'ES' })
    latest.resolve(result('Spain')); await second
    old.resolve(result('Dominican Republic')); await first
    expect(useEventsStore.getState().events.map(event => event._id)).toEqual(['Spain'])
  })

  it('still reports and rejects a genuine current fetch failure', async () => {
    const error = { response: { data: { message: 'Current request failed' } } }
    api.getEvents.mockRejectedValueOnce(error)
    await expect(useEventsStore.getState().fetchEvents()).rejects.toBe(error)
    expect(useEventsStore.getState().error).toBe('Current request failed')
    expect(useEventsStore.getState().isLoading).toBe(false)
  })
})
