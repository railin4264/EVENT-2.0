// @vitest-environment jsdom
import React from 'react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { WeekendRadioPill } from './WeekendRadioPill'
vi.mock('next/link', () => ({ default: (props: any) => <a {...props} /> }))
const plan = { _id: 'real-event', title: 'Plan guardado en el catálogo', status: 'published', date: new Date(Date.now() + 86400000).toISOString(), location: { city: 'Madrid' } }
beforeEach(() => { vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text } }); Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: vi.fn(), cancel: vi.fn() } }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('an empty catalogue never displays a fictional weekend agenda', () => { const r = render(<WeekendRadioPill />); expect(r.container.textContent).toBe('') })
it('only reads actual published future public events passed by the selected destination', () => {
  render(<WeekendRadioPill events={[plan, { ...plan, _id: 'private', isPrivate: true }, { ...plan, _id: 'past', date: new Date(Date.now()-1000).toISOString() }, { ...plan, _id: 'draft', status: 'draft' }]} />)
  fireEvent.click(screen.getByText('Ver agenda')); expect(screen.getByRole('link', { name: /Plan guardado/ }).getAttribute('href')).toBe('/events/real-event'); expect(screen.getAllByRole('link')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Escuchar agenda' })); expect(window.speechSynthesis.speak).toHaveBeenCalledOnce(); expect(vi.mocked(window.speechSynthesis.speak).mock.calls[0][0].text).toContain(plan.title); expect(screen.queryByText(/60 seg/)).toBeNull()
})
it('does not pretend to play audio when speech synthesis is unsupported', () => {
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }); delete (window as any).speechSynthesis
  render(<WeekendRadioPill events={[plan]} />); expect((screen.getByRole('button', { name: 'Escuchar agenda' }) as HTMLButtonElement).disabled).toBe(true)
})
