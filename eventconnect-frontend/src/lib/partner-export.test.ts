// @vitest-environment jsdom
import { buildPartnerKit, buildPartnerReport, printPartnerKit } from './partner-export'
import { afterEach, describe, expect, it, vi } from 'vitest'
afterEach(() => vi.restoreAllMocks())
describe('partner exports', () => {
  const row = { title: '=DANGEROUS()', description: 'Equipo', status: 'delivered', kind: 'in_kind', resource: { title: 'Un evento', audience: 3, audienceLabel: 'personas interesadas' } }
  it('exports only known kit fields, omitting unsolicited contact and identities', () => {
    const kit = buildPartnerKit({ ...row, owner: 'secret', contact: 'private@example.test' } as typeof row)
    expect(kit).not.toContain('secret'); expect(kit).not.toContain('private@example.test'); expect(JSON.parse(kit).activity.audience).toBe(3)
  })
  it('neutralizes spreadsheet formulas and escapes quotes/newlines', () => {
    const csv = buildPartnerReport([row, { ...row, title: '@SUM(1)', kind: 'Text "quoted"' }])
    expect(csv).toContain('"\'=DANGEROUS()"'); expect(csv).toContain('"\'@SUM(1)"'); expect(csv).toContain('"Text ""quoted"""')
  })
  it('printable kit inserts untrusted strings as text and never prints automatically', () => {
    const doc = document.implementation.createHTMLDocument('Kit')
    const preview = { document: doc, opener: window, print: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(preview as unknown as Window)
    expect(printPartnerKit({ ...row, title: '<img src=x onerror=alert(1)>' })).toBe(true)
    expect(doc.querySelector('img')).toBeNull()
    expect(doc.body.textContent).toContain('<img src=x onerror=alert(1)>')
    expect(preview.print).not.toHaveBeenCalled()
    expect(preview.opener).toBeNull()
  })
  it('reports blocked print window without claiming an export succeeded', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    expect(printPartnerKit(row)).toBe(false)
  })
})
