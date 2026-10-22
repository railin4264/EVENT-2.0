// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PartnerBriefTools } from './partner-tools'
import { printPartnerKit } from '@/lib/partner-export'
vi.mock('@/lib/partner-export', () => ({ printPartnerKit: vi.fn(() => true) }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('partner brief tools', () => {
  it('edits and prints personal checklist without sending or confirming anything', () => {
    render(<PartnerBriefTools />)
    fireEvent.change(screen.getByLabelText('Objetivo de la colaboración'), { target: { value: 'Conseguir hidratación' } })
    fireEvent.click(screen.getByLabelText('Entrega: reunir referencias para revisión'))
    fireEvent.click(screen.getByText('Imprimir brief'))
    expect(printPartnerKit).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', description: expect.stringContaining('[x] Entrega') }))
    expect(screen.getByText('Marcar una tarea aquí no confirma una propuesta ni una recepción real.')).toBeTruthy()
  })
  it('clears memory when the account workspace changes', () => {
    const view = render(<PartnerBriefTools key="account-a" />)
    fireEvent.change(screen.getByLabelText('Objetivo de la colaboración'), { target: { value: 'Borrador privado A' } })
    fireEvent.click(screen.getByLabelText('Preparación: definir público y necesidades'))
    view.rerender(<PartnerBriefTools key="account-b" />)
    expect((screen.getByLabelText('Objetivo de la colaboración') as HTMLTextAreaElement).value).toBe('')
    expect((screen.getByLabelText('Preparación: definir público y necesidades') as HTMLInputElement).checked).toBe(false)
  })
  it('reports blocked print instead of claiming an export succeeded', () => {
    vi.mocked(printPartnerKit).mockReturnValueOnce(false); render(<PartnerBriefTools />)
    fireEvent.click(screen.getByText('Imprimir brief'))
    expect(screen.getByRole('alert').textContent).toContain('bloqueó')
  })
})
