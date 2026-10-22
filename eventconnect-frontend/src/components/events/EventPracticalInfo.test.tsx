// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EventPracticalInfo } from './EventPracticalInfo'
import { EventBudgetEditor } from './EventBudgetEditor'
import { formatAlternativeDate, formatAlternativeBudget } from './EventPlanB'
const mock = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: mock }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: (state: unknown) => unknown) => select({ user: { id: 'owner' } }) }))
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }))
const data = { eventId: 'event', canManage: true, practical: { bring: 'Lleva agua' }, budget: { currency: 'DOP', entry: 500, mandatory: [{ label: 'Consumo', amount: 100, currency: 'DOP' }], optional: [{ label: 'Recuerdo', amount: 50, currency: 'DOP' }], complete: false, knownMinimum: 600 }, alternativesAvailable: false }
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mock.get.mockResolvedValue({ data: { success: true, data } }); mock.put.mockResolvedValue({ data: { success: true, data } }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('shows explicit unknowns and separates optional spending without requesting alternatives on an active event', async () => {
  render(<EventPracticalInfo eventId="event" />)
  await screen.findByText('Lleva agua')
  expect(screen.getAllByText('El anfitrión aún no ha informado este detalle.')).toHaveLength(4)
  expect(screen.getByText('Opcionales, fuera del total')).toBeTruthy()
  expect(screen.getByText(/Hay gastos pendientes/)).toBeTruthy()
  expect(mock.get).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('link', { name: 'Editar información' }).getAttribute('href')).toBe('/events/event/planning')
})
it('cancelled events show alternatives and never register attendance', async () => {
  mock.get.mockImplementation((url: string) => Promise.resolve({ data: { success: true, data: url.endsWith('alternatives') ? [{ id: 'next', title: 'Otra salida', city: 'Santo Domingo', date: '2026-11-01T00:00:00Z', budget: { knownMinimum: 250, currency: 'DOP', complete: false } }] : { ...data, alternativesAvailable: true } } }))
  render(<EventPracticalInfo eventId="event" />)
  expect((await screen.findByText('Otra salida')).closest('a')?.getAttribute('href')).toBe('/events/next')
  expect(screen.getByText(/no trasladan tu inscripción/)).toBeTruthy()
  expect(screen.getByText('DOP 250.00 · mínimo conocido; puede haber gastos pendientes')).toBeTruthy()
  expect(mock.put).not.toHaveBeenCalled()
})
it('editor saves declared values and does not alter entry price', async () => {
  render(<EventBudgetEditor eventId="event" />)
  await screen.findByDisplayValue('Lleva agua')
  fireEvent.change(screen.getByRole('textbox', { name: 'Qué llevar' }), { target: { value: 'Agua y gorra' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar información' }))
  await waitFor(() => expect(mock.put).toHaveBeenCalledTimes(1))
  expect(mock.put.mock.calls[0][1].practical.bring).toBe('Agua y gorra')
  expect(mock.put.mock.calls[0][1].price).toBeUndefined()
  expect(await screen.findByText('Información guardada.')).toBeTruthy()
})
it('read failures expose retry rather than fabricated information', async () => {
  mock.get.mockRejectedValueOnce(new Error('offline'))
  render(<EventPracticalInfo eventId="event" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
  expect(await screen.findByText('Lleva agua')).toBeTruthy()
})
it('alternative dates follow the event timezone rather than silently shifting Dominican evening plans to tomorrow', () => {
  const date = '2026-11-01T02:00:00Z'
  expect(formatAlternativeDate(date, 'America/Santo_Domingo')).toBe(new Date(date).toLocaleDateString('es-DO', { timeZone: 'America/Santo_Domingo' }))
  expect(formatAlternativeDate(date, 'America/Santo_Domingo')).not.toBe(formatAlternativeDate(date, 'UTC'))
  expect(() => formatAlternativeDate(date, 'invalid-legacy-zone')).not.toThrow()
})
it('alternative budgets expose pending costs and tolerate incomplete or invalid budget data', () => {
  expect(formatAlternativeBudget({ knownMinimum: 500, currency: 'DOP', complete: false })).toBe('DOP 500.00 · mínimo conocido; puede haber gastos pendientes')
  expect(formatAlternativeBudget({ knownMinimum: 500, currency: 'DOP', complete: true })).toBe('DOP 500.00 · total informado')
  expect(formatAlternativeBudget()).toContain('por informar')
  expect(formatAlternativeBudget({ knownMinimum: NaN, currency: 'DOP', complete: true })).toContain('por informar')
})
