// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import HostReadinessTools from './HostReadinessTools'
const props = { actorKey: 'owner-a', targetKey: 'events:a', title: 'Actividad', roles: [{ title: 'Fotografía', slots: 2, acceptedCount: 1, closed: false }], canManage: true, canShareCall: true }
beforeEach(() => { vi.stubGlobal('React', React) })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('hides private preparation tools from nonmanagers and sharing when the server does not permit it', () => {
  render(<HostReadinessTools {...props} canManage={false} canShareCall={false} />)
  expect(screen.queryByText('Prepara una bienvenida para todos')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Copiar convocatoria de ayuda' })).toBeNull()
})
it('resets private languages and report when changing account or target', () => {
  const { rerender } = render(<HostReadinessTools {...props} />)
  fireEvent.change(screen.getByLabelText('Idiomas confirmados por ti, separados por comas'), { target: { value: 'Idioma privado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Preparar informe JSON' }))
  expect(screen.getByLabelText('Informe privado de preparación').getAttribute('readonly')).not.toBeNull()
  rerender(<HostReadinessTools {...props} actorKey="owner-b" />)
  expect((screen.getByLabelText('Idiomas confirmados por ti, separados por comas') as HTMLInputElement).value).toBe('')
  expect(screen.queryByLabelText('Informe privado de preparación')).toBeNull()
  fireEvent.change(screen.getByLabelText('Idiomas confirmados por ti, separados por comas'), { target: { value: 'Otro borrador' } })
  rerender(<HostReadinessTools {...props} actorKey="owner-b" targetKey="events:b" />)
  expect((screen.getByLabelText('Idiomas confirmados por ti, separados por comas') as HTMLInputElement).value).toBe('')
})
it('reports clipboard rejection without claiming the help call was copied', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Permiso de portapapeles denegado')) } })
  render(<HostReadinessTools {...props} />)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copiar convocatoria de ayuda' })))
  expect(screen.getByRole('alert').textContent).toContain('denegado')
  expect(screen.queryByText(/Convocatoria copiada/)).toBeNull()
})
it('invalidates a previously generated report when its inputs change', () => {
  render(<HostReadinessTools {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Preparar informe JSON' }))
  expect(screen.getByLabelText('Informe privado de preparación')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Idiomas confirmados por ti, separados por comas'), { target: { value: 'Español' } })
  expect(screen.queryByLabelText('Informe privado de preparación')).toBeNull()
})
