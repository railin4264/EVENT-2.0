// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EventAttendeeFaces } from './EventAttendeeFaces'
import { readEventAttendanceSummary } from './event-attendance-summary'

const attendee = (index: number) => ({ id: index.toString(16).padStart(24, '0'), firstName: `Persona ${index}`, username: `persona${index}`, avatar: `https://example.test/${index}.jpg` })
beforeEach(() => vi.stubGlobal('React', React))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('does not infer attendees from a missing projection', () => {
  render(<EventAttendeeFaces summary={undefined} />)
  expect(screen.getByText('La lista de confirmaciones no está disponible.')).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.queryByText('0')).toBeNull()
})

it('distinguishes a verified empty list from unavailable data', () => {
  render(<EventAttendeeFaces summary={{ confirmedCount: 0, visibleAttendees: [], hiddenCount: 0 }} />)
  expect(screen.getByText('Todavía no hay confirmaciones de asistencia.')).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull()
})

it('renders only projected profiles and accurate total including private attendees', () => {
  render(<EventAttendeeFaces summary={{ confirmedCount: 8, visibleAttendees: [attendee(1), attendee(2)], hiddenCount: 6 }} />)
  expect(screen.getByRole('link', { name: 'Ver perfil de Persona 1' }).getAttribute('href')).toBe(`/users/${attendee(1).id}`)
  expect(screen.getAllByRole('link')).toHaveLength(2)
  expect(screen.getByText('Persona 1, Persona 2 y 6 más confirmaron asistencia.')).toBeTruthy()
  expect(screen.getByText(/Las confirmaciones no indican presencia/)).toBeTruthy()
})

it('shows initials after an avatar fails without requesting another image', () => {
  const { container } = render(<EventAttendeeFaces summary={{ confirmedCount: 1, visibleAttendees: [attendee(1)] }} />)
  fireEvent.error(container.querySelector('img')!)
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByText('P1')).toBeTruthy()
})

it('keeps identities reserved when every confirmation is private', () => {
  render(<EventAttendeeFaces summary={{ confirmedCount: 3, visibleAttendees: [], hiddenCount: 3 }} ended />)
  expect(screen.getByRole('heading', { name: 'Quién confirmó asistencia' })).toBeTruthy()
  expect(screen.getByText(/mantienen su perfil reservado/)).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull()
})

it('offers remaining profiles with a keyboard accessible native disclosure', () => {
  const { container } = render(<EventAttendeeFaces summary={{ confirmedCount: 9, visibleAttendees: Array.from({ length: 9 }, (_, i) => attendee(i + 1)) }} />)
  expect(screen.getByText('Ver 3 perfiles públicos más')).toBeTruthy()
  expect(container.querySelector('details > summary')).toBeTruthy()
})

it('rejects malformed counts, unsafe IDs, duplicate identities, unsafe images and raw attendee shapes', () => {
  expect(readEventAttendanceSummary({ confirmedCount: -1, visibleAttendees: [] })).toBeNull()
  expect(readEventAttendanceSummary({ confirmedCount: Infinity, visibleAttendees: [] })).toBeNull()
  expect(readEventAttendanceSummary({ confirmedCount: 1.5, visibleAttendees: [] })).toBeNull()
  expect(readEventAttendanceSummary([{ user: attendee(1), status: 'confirmed' }])).toBeNull()
  const summary = readEventAttendanceSummary({ confirmedCount: 5, visibleAttendees: [attendee(1), attendee(1), { ...attendee(2), id: '../admin' }, { ...attendee(3), avatar: 'javascript:alert(1)' }, null] })!
  expect(summary.visibleAttendees).toHaveLength(2)
  expect(summary.visibleAttendees[1].avatar).toBeUndefined()
  expect(summary.hiddenCount).toBe(3)
})

it('caps visible profiles by verified total and the twelve profile response limit', () => {
  const visibleAttendees = Array.from({ length: 20 }, (_, i) => attendee(i + 1))
  expect(readEventAttendanceSummary({ confirmedCount: 1, visibleAttendees })!.visibleAttendees).toHaveLength(1)
  expect(readEventAttendanceSummary({ confirmedCount: 100, visibleAttendees })!.visibleAttendees).toHaveLength(12)
})
