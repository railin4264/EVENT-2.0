import { hospitalityPlan } from '../hospitalityPlan'

describe('hospitality destinations', () => {
  it('uses event-local dates and adjusts the stay and group for a future trip', () => {
    const plan = hospitalityPlan({ title: 'Festival', date: '2099-02-02T01:00:00Z', timeZone: 'America/Santo_Domingo', location: { city: 'Samaná' } }, { nightsBefore: 1, nightsAfter: 3, guests: 8 })
    const params = new URL(plan.airbnb!).searchParams
    expect(params.get('checkin')).toBe('2099-01-31')
    expect(params.get('checkout')).toBe('2099-02-04')
    expect(params.get('adults')).toBe('8')
  })
  it('uses international destinations without assuming a country', () => {
    const plan = hospitalityPlan({ title: 'Jazz', location: { city: 'Madrid', country: 'España', venue: 'Sala Central' } })
    expect(new URL(plan.booking!).searchParams.get('ss')).toBe('Madrid, España')
    expect(decodeURIComponent(plan.airbnb!)).toContain('Madrid, España')
    expect(plan.airbnb).not.toContain('Dominican')
  })
  it('keeps unknown destinations unavailable', () => {
    const plan = hospitalityPlan({ title: 'Por anunciar', date: 'invalid' })
    expect(plan.uber).toBeNull()
    expect(plan.airbnb).toBeNull()
    expect(plan.booking).toBeNull()
    expect(plan.trivago).toBeNull()
    expect(plan.stay).toBe('')
  })
  it('accepts valid zero coordinates and rejects invalid coordinates', () => {
    const plan = hospitalityPlan({ title: 'Cerca', location: { coordinates: [0, 0] } })
    expect(new URL(plan.uber!).searchParams.get('dropoff[latitude]')).toBe('0')
    expect(hospitalityPlan({ title: 'Fuera', location: { coordinates: [181, 95] } }).uber).toBeNull()
  })
  it('does not expose a secret venue or its coordinates to transport', () => {
    const plan = hospitalityPlan({ title: 'Privado', isSecretLocation: true, location: { city: 'Miami', venue: 'Privado', coordinates: [-80, 25] } })
    expect(plan.uber).toBeNull()
    expect(plan.venue).toBe('')
    expect(plan.booking).not.toContain('Privado')
  })
  it('suggests nights across a multi-day event and month boundary', () => {
    const plan = hospitalityPlan({ title: 'Festival', date: '2099-01-30T12:00:00Z', endDate: '2099-02-01T18:00:00Z', location: { city: 'Samaná' } })
    const params = new URL(plan.airbnb!).searchParams
    expect(params.get('checkin')).toBe('2099-01-30')
    expect(params.get('checkout')).toBe('2099-02-02')
    expect(params.get('adults')).toBe('4')
  })
  it('allows a confirmed attendee to use a revealed venue', () => {
    const plan = hospitalityPlan({ title: 'Reservado', isSecretLocation: true, isAttending: true, location: { venue: 'Lugar revelado', coordinates: [-69, 18] } })
    expect(plan.uber).not.toBeNull()
    expect(plan.venue).toBe('Lugar revelado')
  })
  it('does not prefill past or recurring dates', () => {
    for (const event of [{ date: '2000-01-01' }, { date: '2099-01-01', isRecurring: true }]) {
      const plan = hospitalityPlan({ title: 'Actividad', location: { city: 'Santiago' }, ...event })
      expect(new URL(plan.airbnb!).searchParams.has('checkin')).toBe(false)
      expect(plan.stay).toBe('')
    }
  })
})
