// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ImportedEventSourceNotice } from './ImportedEventSourceNotice'
afterEach(cleanup)

describe('public agenda provenance', () => {
  it('links the official listing and explains that local attendance does not replace registration', () => {
    render(<ImportedEventSourceNotice source={{ name: 'Agenda de Madrid', datasetUrl: 'https://datos.madrid.es/dataset', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }} externalUrl="https://www.madrid.es/actividad" />)
    expect(screen.getByRole('link', { name: 'Consultar evento original' }).getAttribute('href')).toBe('https://www.madrid.es/actividad')
    expect(screen.getByText(/no sustituye una reserva oficial/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeTruthy()
    expect(screen.queryByText(/Verificado/)).toBeNull()
  })
  it('does not render unsafe links or an internal account profile as organizer', () => {
    render(<ImportedEventSourceNotice source={{ name: 'Agenda pública', datasetUrl: 'javascript:alert(1)' }} externalUrl="https://secret@example.com/event" />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /perfil/i })).toBeNull()
  })
})
