// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TribeAccessPanel } from './TribeAccessPanel'
import { TribeRequestsPanel } from './TribeRequestsPanel'
import { readTribeAccess } from './tribe-access'
import { useTribeAccessActions } from './useTribeAccessActions'

const api = vi.hoisted(() => ({ join: vi.fn(), cancel: vi.fn(), approve: vi.fn(), reject: vi.fn(), leave: vi.fn(), success: vi.fn(), error: vi.fn(), userId: 'a' }))
vi.mock('@/lib/api/services/tribes.service', () => ({ tribesService: { joinTribe: api.join, cancelJoinRequest: api.cancel, approveJoinRequest: api.approve, rejectJoinRequest: api.reject, leaveTribe: api.leave } }))
vi.mock('react-hot-toast', () => ({ default: { success: api.success, error: api.error } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ user: { _id: api.userId } }) } }))

function deferred() { let resolve!: (value: any) => void; let reject!: (error: unknown) => void; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function Harness({ userId, pending = false }: { userId: string; pending?: boolean }) {
  const actions = useTribeAccessActions(userId)
  const access = readTribeAccess({ privacy: 'private', membership: 'approval_required', hasPendingRequest: pending }, userId)
  return <TribeAccessPanel name="Amigos" tribeId="tribe-1" access={access} authenticated busy={Boolean(actions.pending)}
    onJoin={message => { void actions.run({ tribeId: 'tribe-1', kind: 'join', message }) }} onCancel={() => { void actions.run({ tribeId: 'tribe-1', kind: 'cancel' }) }}
    error={actions.failure?.message} onRetry={() => { void actions.retry() }} />
}
function mount(pending = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><Harness userId={api.userId} pending={pending} /></QueryClientProvider>)
  return { client, changeAccount: (userId: string) => { api.userId = userId; view.rerender(<QueryClientProvider client={client}><Harness key={userId} userId={userId} pending={pending} /></QueryClientProvider>) } }
}
beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.clearAllMocks()
  api.userId = 'a'
  api.join.mockResolvedValue({ success: true, status: 'pending' })
  api.cancel.mockResolvedValue({ success: true })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('tribe access interactions', () => {
  it('shows pending cancellation without another join button and serializes rapid cancellation', async () => {
    const saving = deferred(); api.cancel.mockReturnValue(saving.promise)
    mount(true)
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).toBeNull()
    const button = screen.getByRole('button', { name: 'Cancelar solicitud' })
    fireEvent.click(button); fireEvent.click(button)
    expect(api.cancel).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Procesando…' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => saving.resolve({ success: true }))
    await waitFor(() => expect(api.success).toHaveBeenCalledWith('Solicitud cancelada.'))
  })
  it('preserves the introduction after failure and retries the same intent without duplicate joins', async () => {
    const saving = deferred(); api.join.mockReturnValueOnce(saving.promise)
    mount()
    fireEvent.change(screen.getByRole('textbox', { name: /Tu presentación/ }), { target: { value: 'Me gusta caminar en grupo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
    fireEvent.click(screen.getByRole('button', { name: 'Procesando…' }))
    expect(api.join).toHaveBeenCalledTimes(1)
    await act(async () => saving.reject({ response: { data: { message: 'Conexión interrumpida' } } }))
    expect((await screen.findByRole('alert')).textContent).toContain('Conexión interrumpida')
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Me gusta caminar en grupo')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar acción' }))
    await waitFor(() => expect(api.success).toHaveBeenCalledTimes(1))
    expect(api.join).toHaveBeenNthCalledWith(2, 'tribe-1', 'Me gusta caminar en grupo')
  })
  it('invalidates detail for the owning account and never applies a late response to another account', async () => {
    const saving = deferred(); api.join.mockReturnValueOnce(saving.promise)
    const { client, changeAccount } = mount()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
    changeAccount('b')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Presentación de B' } })
    await act(async () => saving.resolve({ success: true, status: 'pending' }))
    expect(api.success).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Presentación de B')
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('keeps invitation and banned access honest, and explains rejected requests', () => {
    const base = { name: 'Amigos', tribeId: 'tribe-1', authenticated: true, busy: false, onJoin: vi.fn(), onCancel: vi.fn() }
    const view = render(<TribeAccessPanel {...base} access={readTribeAccess({ privacy: 'private', membership: 'invite_only' }, 'a')} />)
    expect(screen.getByText(/su gestión todavía no está disponible/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    view.rerender(<TribeAccessPanel {...base} access={readTribeAccess({ isBanned: true }, 'a')} />)
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    view.rerender(<TribeAccessPanel {...base} access={readTribeAccess({ membership: 'approval_required', joinRequestStatus: 'rejected' }, 'a')} />)
    expect(screen.getByText(/Tu solicitud anterior no fue aprobada/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeTruthy()
  })
  it('offers moderators the review inbox, requires explicit rejection confirmation, and blocks opposite actions while saving', () => {
    const onReview = vi.fn()
    const props = { requests: [{ user: { _id: 'applicant', firstName: 'Ana', username: 'ana' }, message: 'Hola', requestedAt: 'invalid' }], canManage: true, busy: false, onRefresh: vi.fn(), onReview, onRetry: vi.fn() }
    const view = render(<TribeRequestsPanel {...props} />)
    expect(screen.getByText('Fecha no disponible')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar a ana' }))
    expect(onReview).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    expect(onReview).toHaveBeenCalledWith('applicant', 'reject')
    view.rerender(<TribeRequestsPanel {...props} busy busyUserId="applicant" />)
    expect((screen.getByRole('button', { name: 'Aprobar a ana' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Rechazar a ana' }) as HTMLButtonElement).disabled).toBe(true)
    view.rerender(<TribeRequestsPanel {...props} canManage={false} />)
    expect(screen.queryByRole('heading', { name: /Solicitudes de ingreso/ })).toBeNull()
  })
})
