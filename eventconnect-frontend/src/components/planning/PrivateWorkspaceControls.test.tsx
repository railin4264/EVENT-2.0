// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PrivateWorkspaceControls } from './PrivateWorkspaceControls'
const state = vi.hoisted(() => ({ auth: { user: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }, isAuthenticated: true }, get: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => state.auth }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: state.get, put: state.put, delete: state.delete } }))
const onLoad = vi.fn(), data = { objective: 'Local draft' }
const mount = () => render(<PrivateWorkspaceControls kind="partner-brief" data={data} onLoad={onLoad} />)
beforeEach(() => { vi.clearAllMocks(); state.auth = { user: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }, isAuthenticated: true }; state.get.mockResolvedValue({ data: { data: { version: 'opaque-version', data: { objective: 'Stored draft' } } } }); state.put.mockResolvedValue({ data: { data: { version: 'new-version' } } }) })
afterEach(cleanup)
it('does not save or replace an edited draft until the user explicitly asks', async () => {
  mount()
  await waitFor(() => expect((screen.getByRole('button', { name: 'Guardar en mi cuenta' }) as HTMLButtonElement).disabled).toBe(false))
  expect(onLoad).not.toHaveBeenCalled(); expect(state.put).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar en mi cuenta' }))
  await waitFor(() => expect(state.put).toHaveBeenCalledWith('/users/me/workspaces/partner-brief/personal', { ownerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', data, version: 'opaque-version' }))
})
it('loads only on request and reports conflicts without claiming a save', async () => {
  state.put.mockRejectedValue({ response: { status: 409 } }); mount()
  fireEvent.click(screen.getByRole('button', { name: 'Cargar guardado' }))
  await waitFor(() => expect(onLoad).toHaveBeenCalledWith({ objective: 'Stored draft' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar en mi cuenta' }))
  await screen.findByText(/El guardado cambió/)
  expect(screen.queryByText(/Guardado en tu cuenta/)).toBeNull()
})
it('ignores a previous accounts late load', async () => {
  let finish: (value: unknown) => void = () => {}
  state.get.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const view = mount()
  fireEvent.click(screen.getByRole('button', { name: 'Cargar guardado' }))
  const finishOld = finish
  state.auth = { user: { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb' }, isAuthenticated: true }
  state.get.mockResolvedValue({ data: { data: { data: null, version: 0 } } })
  view.rerender(<PrivateWorkspaceControls kind="partner-brief" data={{ objective: 'New account' }} onLoad={onLoad} />)
  finishOld({ data: { data: { data: { objective: 'Old account private content' }, version: 'old-version' } } })
  await waitFor(() => expect(state.get).toHaveBeenCalledWith('/users/me/workspaces/partner-brief/personal?ownerId=bbbbbbbbbbbbbbbbbbbbbbbb'))
  expect(onLoad).not.toHaveBeenCalled()
})
