import axios, { AxiosHeaders, CanceledError } from 'axios'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiCache } from '@/lib/performance/apiCache'

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

let apiClient: typeof import('./client')['apiClient']
let adapterCalls = 0
let responsePolicy = 'private, no-store'
let cancelRequest = false
const create = axios.create.bind(axios)

beforeAll(async () => {
  vi.spyOn(axios, 'create').mockImplementation(config => create({ ...config, adapter: async request => {
    adapterCalls++
    if (cancelRequest) throw new CanceledError('Canceled', request)
    return { data: request.responseType === 'blob' ? new Blob(['private pixels']) : { data: { caption: 'Private album' } },
      status: 200, statusText: 'OK', config: request, headers: new AxiosHeaders({ 'cache-control': responsePolicy }) }
  } }))
  apiClient = (await import('./client')).apiClient
})
beforeEach(() => {
  adapterCalls = 0
  responsePolicy = 'private, no-store'
  cancelRequest = false
  apiCache.clear()
})
afterAll(() => { vi.restoreAllMocks() })

describe('private response handling', () => {
  it('never reuses a no-store album through getCached', async () => {
    await apiClient.getCached('/events/private-test/memories')
    await apiClient.getCached('/events/private-test/memories')
    expect(adapterCalls).toBe(2)
    expect(apiCache.get('/events/private-test/memories')).toBeNull()
  })
  it('never saves binary image responses in the shared API cache', async () => {
    responsePolicy = ''
    const response = await apiClient.get('/events/private-test/memories/photo/image', { responseType: 'blob' })
    expect(response.data).toBeInstanceOf(Blob)
    expect(apiCache.get('/events/private-test/memories/photo/image')).toBeNull()
  })
  it('continues caching ordinary public JSON responses', async () => {
    responsePolicy = 'public, max-age=60'
    await apiClient.getCached('/events/public-test')
    await apiClient.getCached('/events/public-test')
    expect(adapterCalls).toBe(1)
  })
  it('does not retry canceled image requests or show network error notifications', async () => {
    cancelRequest = true
    await expect(apiClient.get('/events/private-test/memories/photo/image', { responseType: 'blob' })).rejects.toBeInstanceOf(CanceledError)
    expect(adapterCalls).toBe(1)
    const toast = (await import('react-hot-toast')).default
    expect(toast.error).not.toHaveBeenCalled()
  })
})
