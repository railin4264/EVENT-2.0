// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ConnectAgendaModal from './ConnectAgendaModal'
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), auth: { user: { id: 'owner' } as any } }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (selector: any) => selector(mocks.auth) }))
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mocks.auth.user = { id: 'owner' } })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const agenda = { sourceId: 'agenda-1', name: 'Agenda de lectura', endpointUrl: 'https://example.org/events.json', adapterType: 'json_feed' }
it('does not offer an arbitrary URL or an unsupported provider when no agendas are approved', async () => {
  mocks.get.mockResolvedValue({ data: { success: true, data: [] } })
  render(<ConnectAgendaModal isOpen onClose={vi.fn()} />)
  expect(await screen.findByText(/Todavía no tienes agendas aprobadas/)).toBeTruthy()
  expect(screen.queryByRole('combobox')).toBeNull(); expect(mocks.post).not.toHaveBeenCalled()
});
it('requires a successful preview before sending a batch to review and distinguishes actual counters', async () => {
  mocks.get.mockResolvedValue({ data: { success: true, data: [agenda] } })
  mocks.post.mockResolvedValueOnce({ data: { success: true, previewCount: 2, skipped: 1, events: [{ title: 'Lectura al aire libre', date: '2026-11-28T15:00:00Z', timeZone: 'UTC' }] } })
    .mockResolvedValueOnce({ data: { success: true, created: 1, updated: 0, unchanged: 1, failedWrites: 0, events: [] } })
  const updated = vi.fn(); render(<ConnectAgendaModal isOpen onClose={vi.fn()} onSuccess={updated} />)
  await screen.findByRole('combobox', { name: 'Agenda' })
  const importButton = screen.getByRole('button', { name: 'Importar lote para revisión' }) as HTMLButtonElement
  expect(importButton.disabled).toBe(true); expect(mocks.post).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Previsualizar agenda' }))
  await screen.findByText('Vista previa · sin guardar eventos'); expect(updated).not.toHaveBeenCalled()
  expect(mocks.post).toHaveBeenLastCalledWith('/sources/connect-agenda', { agendaUrl: agenda.endpointUrl, dryRun: true })
  fireEvent.click(importButton); await screen.findByText('Lote enviado a revisión')
  expect(mocks.post).toHaveBeenLastCalledWith('/sources/connect-agenda', { agendaUrl: agenda.endpointUrl, dryRun: false })
  expect(screen.getByText('1 nuevos, 0 actualizados y 1 sin cambios.')).toBeTruthy(); expect(updated).toHaveBeenCalledTimes(1)
});
it('does not announce a complete import when the returned batch is partial', async () => {
  mocks.get.mockResolvedValue({ data: { success: true, data: [agenda] } })
  mocks.post.mockResolvedValue({ data: { success: true, previewCount: 1, incomplete: true, events: [] } })
  render(<ConnectAgendaModal isOpen onClose={vi.fn()} />); await screen.findByRole('combobox', { name: 'Agenda' })
  fireEvent.click(screen.getByRole('button', { name: 'Previsualizar agenda' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Lectura parcial: este lote no representa toda la agenda.')
});
it('lets an organizer send their own calendar link to review', async () => {
  mocks.get.mockResolvedValue({ data: { success: true, data: [] } })
  mocks.post.mockResolvedValue({ data: { success: true, message: 'Recibimos tu agenda.' } })
  render(<ConnectAgendaModal isOpen onClose={vi.fn()} />)
  await screen.findByText(/Todavía no tienes agendas aprobadas/)
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Agenda del bar' } })
  fireEvent.change(screen.getByLabelText('Enlace del calendario'), { target: { value: 'https://calendar.google.com/calendar/ical/bar/public/basic.ics' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
  expect(await screen.findByText('Recibimos tu agenda.')).toBeTruthy()
  expect(mocks.post).toHaveBeenCalledWith('/sources/propose', { name: 'Agenda del bar', endpointUrl: 'https://calendar.google.com/calendar/ical/bar/public/basic.ics' })
})
