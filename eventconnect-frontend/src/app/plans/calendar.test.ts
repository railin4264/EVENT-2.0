import { describe, expect, it } from 'vitest'
import { planCalendar } from './calendar'

describe('calendario de un plan confirmado', () => {
  it('preserva la hora UTC y escapa contenido que podría inyectar campos de calendario', () => {
    const result = planCalendar({ id: 'evento', title: 'Jazz, amigos; noche\nEND:VEVENT',
      location: 'Parque\\sur', date: '2026-11-10T19:00:00-04:00', endDate: '2026-11-10T21:00:00-04:00' }, 'https://eventnow.example')
    expect(result).toContain('DTSTART:20261110T230000Z\r\n')
    expect(result).toContain('DTEND:20261111T010000Z\r\n')
    expect(result).toContain('SUMMARY:Jazz\\, amigos\\; noche\\nEND:VEVENT')
    expect(result.match(/\r\nEND:VEVENT/g)).toHaveLength(1)
    expect(result).toContain('URL:https://eventnow.example/events/evento')
  })
  it('omite una hora final ausente o inválida en relación con el comienzo', () => {
    const event = { id: 'id', title: 'Plan', location: 'Lugar', date: '2026-11-10T23:00:00Z' }
    expect(planCalendar(event, 'https://example.com')).not.toContain('DTEND:')
    expect(planCalendar({ ...event, endDate: '2026-11-10T20:00:00Z' }, 'https://example.com')).not.toContain('DTEND:')
  })
})
