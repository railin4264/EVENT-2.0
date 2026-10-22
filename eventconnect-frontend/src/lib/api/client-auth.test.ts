import axios, { AxiosError, AxiosHeaders } from 'axios'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { apiCache } from '@/lib/performance/apiCache'

const mocks = vi.hoisted(() => ({ logout: vi.fn(), assign: vi.fn(), isAuthenticated: false, token: null as string | null }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ isAuthenticated: mocks.isAuthenticated, logout: mocks.logout }) } }))
let apiClient: typeof import('./client')['apiClient']
beforeAll(async () => {
  const create = axios.create.bind(axios)
  vi.spyOn(axios, 'create').mockImplementation(config => create({ ...config, adapter: async request => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', request, null, {
      status: 401, statusText: 'Unauthorized', config: request, headers: new AxiosHeaders(), data: { success: false }
    })
  } }))
  apiClient = (await import('./client')).apiClient
})
beforeEach(() => {
  mocks.isAuthenticated = false
  mocks.token = null
  mocks.logout.mockClear()
  mocks.assign.mockClear()
  apiCache.clear('memory')
  vi.stubGlobal('window', { location: { pathname: '/events/public-event', search: '', assign: mocks.assign } })
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => key === 'auth-token' ? mocks.token : null, setItem: vi.fn() })
})
afterAll(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('keeps public visitors on their event if an optional background request returns 401', async () => {
  await expect(apiClient.get('/stories/my')).rejects.toThrow()
  expect(mocks.logout).not.toHaveBeenCalled()
  expect(mocks.assign).not.toHaveBeenCalled()
})

it('clears an expired authenticated session and keeps the return destination', async () => {
  mocks.token = 'expired-test-token'
  mocks.isAuthenticated = true
  await expect(apiClient.get('/stories/my')).rejects.toThrow()
  expect(mocks.logout).toHaveBeenCalledTimes(1)
  expect(mocks.assign).toHaveBeenCalledWith('/login?redirect=%2Fevents%2Fpublic-event')
})

it('handles unavailable browser storage without replacing the request with a storage exception', async () => {
  vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('Storage disabled') } })
  await expect(apiClient.get('/stories/my')).rejects.toMatchObject({ response: { status: 401 } })
  expect(mocks.assign).not.toHaveBeenCalled()
})
