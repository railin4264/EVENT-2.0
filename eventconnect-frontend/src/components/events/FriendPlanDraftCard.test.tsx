// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import FriendPlanDraftCard from './FriendPlanDraftCard'
const mocks = vi.hoisted(() => ({ post: vi.fn(), auth: { user: { id: 'owner' } as any } }))
vi.mock('@/lib/api/client', () => ({ apiClient: { post: mocks.post } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (selector: any) => selector(mocks.auth) }))
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mocks.auth.user = { id: 'owner' } })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const draft = { title: 'Lectura en Tokio', description: 'Plan de lectura', category: 'literature', date: null, localDate: '2026-11-28', localTime: '15:00', timeZone: null, venue: null, estimatedBudget: null }
it('shows unknown fields explicitly and applies only after deliberate review without inventing a Date', async () => {
  mocks.post.mockResolvedValue({ data: { success: true, draft } }); const apply = vi.fn()
  render(<FriendPlanDraftCard onApplyDraft={apply} />)
  fireEvent.change(screen.getByLabelText('Texto del anuncio'), { target: { value: 'Lectura en Tokio el 28 de noviembre' } })
  fireEvent.click(screen.getByRole('button', { name: 'Preparar borrador' }))
  const button = await screen.findByRole('button', { name: /Usar campos revisados/ }) as HTMLButtonElement
  expect(button.disabled).toBe(true); expect(screen.getAllByText('Por confirmar').length).toBe(3)
  expect(apply).not.toHaveBeenCalled(); expect(screen.queryByText(/Mirador Sur|Invalid Date/)).toBeNull()
  fireEvent.click(screen.getByRole('checkbox', { name: /Revisé los datos/ })); fireEvent.click(button)
  expect(apply).toHaveBeenCalledWith({ ...draft, isPrivate: true })
});
it('discarding or editing text invalidates the previous result', async () => {
  mocks.post.mockResolvedValue({ data: { success: true, draft } }); render(<FriendPlanDraftCard onApplyDraft={vi.fn()} />)
  const input = screen.getByLabelText('Texto del anuncio'); fireEvent.change(input, { target: { value: 'Texto original' } })
  fireEvent.click(screen.getByRole('button', { name: 'Preparar borrador' })); await screen.findByText('Revisa antes de aplicar')
  fireEvent.change(input, { target: { value: 'Otro anuncio' } }); expect(screen.queryByText('Revisa antes de aplicar')).toBeNull()
});
it('ignores responses received after the account changes', async () => {
  let finish!: (value: any) => void; mocks.post.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const view = render(<FriendPlanDraftCard onApplyDraft={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Texto del anuncio'), { target: { value: 'Texto original' } }); fireEvent.click(screen.getByRole('button', { name: 'Preparar borrador' }))
  mocks.auth.user = { id: 'someone-else' }; view.rerender(<FriendPlanDraftCard onApplyDraft={vi.fn()} />)
  finish({ data: { success: true, draft } }); await waitFor(() => expect(screen.queryByText('Revisa antes de aplicar')).toBeNull())
});
