import { emptyPartnerBrief, emptyPartnerFilters, exportPartnerBrief, filterPartnerNeeds, filterPartnerSpaces, partnerOptions, partnerBriefPrintText } from '../partner-tools'
describe('partner filters and brief', () => {
  const needs = [{ title: 'Música en comunidad', description: 'Equipo de sonido', kind: 'in_kind', resource: { title: 'Encuentro', city: 'Bogotá' } }, { title: 'Un espacio', description: 'Taller', kind: 'space', resource: { title: 'Taller', city: 'Lima' } }, { title: 'Plan sin ubicación pública', description: 'Difusión', kind: 'outreach' }]
  it('searches case/accent-insensitively and combines type and actual city', () => {
    expect(filterPartnerNeeds(needs, { ...emptyPartnerFilters, query: 'MUSICA', kind: 'in_kind', city: 'bogota' })).toEqual([needs[0]])
    expect(filterPartnerNeeds(needs, { ...emptyPartnerFilters, kind: 'space', city: 'Bogotá' })).toEqual([])
    expect(filterPartnerNeeds(needs, { ...emptyPartnerFilters, city: 'Lima' })).toEqual([needs[1]])
  })
  it('never infers cities for undisclosed locations and only offers loaded options', () => {
    expect(partnerOptions(needs.map(n => n.resource?.city))).toEqual(['Bogotá', 'Lima'])
    expect(partnerOptions([' Bogotá ', 'bogota', undefined, ''])).toHaveLength(1)
  })
  it('filters actual venue country and minimum capacity without mutating data', () => {
    const spaces = [{ city: 'Bogotá', country: 'Colombia', capacity: 25 }, { city: 'Lima', country: 'Perú', capacity: 100 }]
    expect(filterPartnerSpaces(spaces, { ...emptyPartnerFilters, country: 'peru', minimumCapacity: '80' })).toEqual([spaces[1]])
    expect(filterPartnerSpaces(spaces, { ...emptyPartnerFilters, minimumCapacity: '101' })).toEqual([])
    expect(filterPartnerSpaces(spaces, { ...emptyPartnerFilters, minimumCapacity: '-2' })).toEqual([])
    expect(filterPartnerSpaces(spaces, { ...emptyPartnerFilters, minimumCapacity: '20.5' })).toEqual([])
    expect(spaces).toHaveLength(2)
  })
  it('exports only draft fields, with personal checkmarks and no invented metrics/server status', () => {
    const draft = { ...emptyPartnerBrief(), objective: '<script>alert(1)</script>', measurement: 'Revisar recibos manualmente', checklist: [true, false, true], owner: 'private', audience: 900, status: 'confirmed', roi: '100%' }
    const json = exportPartnerBrief(draft), data = JSON.parse(json)
    expect(data.objective).toBe(draft.objective)
    expect(data.personalChecklist[0].markedByUser).toBe(true)
    for (const key of ['owner', 'audience', 'status', 'roi']) expect(data).not.toHaveProperty(key)
    expect(json).not.toContain('900'); expect(json).not.toContain('100%')
    expect(data.notice).toContain('no confirman acuerdos')
    expect(partnerBriefPrintText(draft)).toContain('[x] Preparación')
  })
})
