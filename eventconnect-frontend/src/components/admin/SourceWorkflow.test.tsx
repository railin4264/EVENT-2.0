// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import AdminSourcesPage from '@/app/admin/sources/page'
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), auth: { isAuthenticated: true, user: { id: 'admin', role: 'admin' } as any }, source: {} as any }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post, patch: mocks.patch } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign((selector?: any) => selector ? selector(mocks.auth) : mocks.auth, { getState: () => mocks.auth }) }))
vi.mock('@/components/admin/AdminNav', () => ({ AdminNav: () => null }))
vi.mock('@/components/events/ConnectAgendaModal', () => ({ default: () => null }))
beforeEach(() => {
  vi.stubGlobal('React', React); vi.stubGlobal('FormData', window.FormData); vi.clearAllMocks(); mocks.auth = { isAuthenticated: true, user: { id: 'admin', role: 'admin' } }
  mocks.source = { sourceId: 'reading-agenda', name: 'Agenda de lectura', domain: 'example.org', classification: 'O', status: 'evaluating', adapterType: 'json_feed', accessConfig: { endpointUrl: 'https://example.org/events.json' }, license: { licenseType: 'Unreviewed' }, readiness: { ready: false, blockers: ['source_not_approved', 'permission_not_reviewed', 'terms_missing'] } }
  mocks.get.mockImplementation(async () => ({ data: { success: true, data: [mocks.source] } }))
  mocks.patch.mockImplementation(async (url: string) => {
    if (url.endsWith('/review')) mocks.source = { ...mocks.source, license: { reviewedAt: '2026-10-21', commercialAllowed: true, displayAllowed: true }, readiness: { ready: false, blockers: ['source_not_approved'] } }
    else mocks.source = { ...mocks.source, status: 'active', readiness: { ready: true, blockers: [] } }
    return { data: { success: true } }
  })
});
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('does not fetch source configuration for a non-administrator', async () => {
  mocks.auth.user.role = 'user'; render(<AdminSourcesPage />)
  await screen.findByText(/Necesitas una cuenta administradora/); expect(mocks.get).not.toHaveBeenCalled()
});
it('supports review followed by an explicit activation without importing anything automatically', async () => {
  render(<AdminSourcesPage />); const article = await screen.findByRole('article', { name: 'Agenda de lectura' })
  expect((within(article).getByRole('button', { name: 'Habilitar fuente' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(within(article).getByRole('button', { name: 'Revisar permisos' }))
  const form = screen.getByRole('form', { name: 'Revisar permisos' })
  fireEvent.change(within(form).getByLabelText('Condiciones o acuerdo (HTTPS)'), { target: { value: 'https://example.org/terms' } })
  fireEvent.change(within(form).getByLabelText('Nombre de licencia o acuerdo'), { target: { value: 'Acuerdo autorizado' } })
  fireEvent.click(within(form).getByLabelText('Permite el uso comercial previsto.')); fireEvent.click(within(form).getByLabelText('Permite mostrar estos eventos en EventNow.'))
  fireEvent.submit(form)
  await waitFor(() => expect(screen.queryByRole('form', { name: 'Revisar permisos' })).toBeNull())
  expect(mocks.patch).toHaveBeenCalledWith('/sources/reading-agenda/review', expect.objectContaining({ commercialAllowed: true, displayAllowed: true, termsUrl: 'https://example.org/terms' }))
  fireEvent.click(screen.getByRole('button', { name: 'Habilitar fuente' }))
  await screen.findByText('Lista para importación y moderación')
  expect(mocks.patch).toHaveBeenLastCalledWith('/sources/reading-agenda/status', { status: 'active' }); expect(mocks.post).not.toHaveBeenCalled()
});
it('registers a candidate with selected country and interval and keeps failures visible', async () => {
  mocks.post.mockRejectedValue({ response: { data: { message: 'Identificador ya registrado' } } })
  render(<AdminSourcesPage />); await screen.findByRole('article')
  fireEvent.click(screen.getByRole('button', { name: 'Registrar fuente' }))
  const form = screen.getByRole('form', { name: 'Registrar fuente' })
  fireEvent.change(within(form).getByLabelText('Identificador'), { target: { value: 'new-agenda' } })
  fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Agenda nueva' } })
  fireEvent.change(within(form).getByLabelText('Dirección HTTPS del feed'), { target: { value: 'https://example.org/new.json' } })
  fireEvent.change(within(form).getByLabelText('País (opcional, código de dos letras)'), { target: { value: 'es' } })
  fireEvent.change(within(form).getByLabelText('Intervalo solicitado (horas)'), { target: { value: '12' } })
  fireEvent.submit(form); await screen.findByText('Identificador ya registrado')
  expect(mocks.post).toHaveBeenCalledWith('/sources', expect.objectContaining({ sourceId: 'new-agenda', country: 'ES', frequencyHours: 12 }))
  expect((within(form).getByLabelText('Nombre') as HTMLInputElement).value).toBe('Agenda nueva')
});
it('separates preview counts and incomplete results from saved events', async () => {
  mocks.source.readiness = { ready: true, blockers: [] }; mocks.source.status = 'active'
  mocks.post.mockResolvedValue({ data: { success: true, dryRun: true, incomplete: true, stats: { previewCount: 5, canonicalSaved: 0, skipped: 2, failedSources: 1 }, sources: [] } })
  render(<AdminSourcesPage />); await screen.findByRole('article')
  fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }))
  await screen.findByText('Resultado de la vista previa')
  expect(mocks.post).toHaveBeenCalledWith('/events/pipeline/harvest', { dryRun: true })
  expect(screen.getByText('Guardados').parentElement?.textContent).toContain('0')
  expect(screen.getByRole('alert').textContent).toContain('lectura fue parcial')
});
