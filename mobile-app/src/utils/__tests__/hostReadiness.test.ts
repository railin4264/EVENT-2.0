
import { ACCESS_QUESTIONS, WELCOME_QUESTIONS, answerMap, buildHelpCall, buildReadinessReport, calculateSupplies, parseLanguages, prepareAgendaTask } from '../hostReadiness'
describe('host preparation calculations and private reports', () => {
  it('uses exact decimal arithmetic instead of adding a phantom reserve unit', () => {
    expect(calculateSupplies('100', '2', '10').totalUnits).toBe(220)
    expect(calculateSupplies('3', '0.5', '0').totalUnits).toBe(2)
    expect(calculateSupplies('100000', '1000', '100').totalUnits).toBe(200000000)
  })
  it.each([['', '1', '10'], ['1.5', '1', '10'], ['100001', '1', '10'], ['10', '0', '10'], ['10', 'NaN', '10'], ['10', '1', '-1'], ['10', '1', '101'], ['10', '1', '1.2345']])('rejects invalid manual quantities %s %s %s', (people, units, reserve) => expect(() => calculateSupplies(people, units, reserve)).toThrow())
  it('keeps agenda rows sorted, rejects impossible times and does not assign users', () => {
    const rows = prepareAgendaTask('18:30', 'Abrir mesa', 'Equipo de entrada', prepareAgendaTask('19:00', 'Revisar señalización', '', []))
    expect(rows.map(row => row.time)).toEqual(['18:30', '19:00'])
    expect(rows[0]).not.toHaveProperty('userId')
    expect(() => prepareAgendaTask('25:00', 'Abrir', '', [])).toThrow()
    expect(() => prepareAgendaTask('18:30', 'Abrir mesa', 'Equipo de entrada', rows)).toThrow()
    expect(() => prepareAgendaTask('18:00', 'Escribir a persona@example.test', '', [])).toThrow()
  })
  it('exports unknown answers and no contact reference until explicit declared consent', () => {
    const draft = { accessibility: answerMap(ACCESS_QUESTIONS), welcome: answerMap(WELCOME_QUESTIONS), languages: 'Español, inglés, Español', localSupport: 'Referencia privada no consentida', localSupportConsent: false, agenda: [], supplies: null, attendees: [{ userId: 'secret-person' }] }
    const report = buildReadinessReport('Actividad', draft, new Date('2026-10-20T12:00:00Z'))
    expect(report.accessibility.every(row => row.answer === 'unknown')).toBe(true)
    expect(report.localSupport).toBeNull(); expect(report.languages).toEqual(['Español', 'inglés'])
    expect(JSON.stringify(report)).not.toContain('secret-person'); expect(JSON.stringify(report)).not.toContain('Referencia privada no consentida')
    expect(report.notice).toContain('El guardado en tu cuenta es opcional')
    expect(report.notice).toContain('no acredita accesibilidad')
  })
  it('does not export sensitive contact details even with declared consent', () => {
    const draft = { accessibility: {}, welcome: {}, languages: '', localSupport: '809-555-0100', localSupportConsent: true, agenda: [], supplies: null }
    expect(() => buildReadinessReport('Actividad', draft)).toThrow()
    expect(() => parseLanguages('persona@example.test')).toThrow()
  })
  it('generates help only from valid open roles with remaining accepted capacity and no identities', () => {
    const roles = [{ title: 'Fotos', slots: 3, acceptedCount: 1, closed: false, offers: [{ name: 'Persona privada' }] }, { title: 'Cerrada', slots: 3, acceptedCount: 0, closed: true }, { title: 'Completa', slots: 1, acceptedCount: 1, closed: false }, { title: 'Inválida', slots: 1, acceptedCount: -1, closed: false }]
    const text = buildHelpCall('Actividad', roles)!
    expect(text).toContain('Fotos: 2 plaza(s)'); expect(text).not.toContain('Persona privada'); expect(text).not.toContain('Cerrada'); expect(text).not.toContain('Completa'); expect(text).not.toContain('Inválida')
    expect(buildHelpCall('Actividad', roles.slice(1))).toBeNull()
  })
})
