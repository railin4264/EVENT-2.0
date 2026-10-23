import { eventPhase, eventCoordinates, eventSectionPlan } from '../eventSectionPlan';

const now = Date.parse('2027-03-01T12:00:00Z');
const at = (hours: number) => new Date(now + hours * 3600000).toISOString();
const santoDomingo = { type: 'Point', coordinates: [-69.93, 18.48], countryCode: 'DO' };

describe('eventSectionPlan (mobile)', () => {
  it('computes the phase with the two-hour convention', () => {
    expect(eventPhase({ date: at(5) }, now)).toBe('upcoming');
    expect(eventPhase({ date: at(-1) }, now)).toBe('live');
    expect(eventPhase({ date: at(-3) }, now)).toBe('ended');
    expect(eventPhase({ date: at(5), status: 'cancelled' }, now)).toBe('cancelled');
  });

  it('never falls back to a default city for navigation', () => {
    expect(eventCoordinates({ location: santoDomingo })).toEqual({ latitude: 18.48, longitude: -69.93 });
    expect(eventCoordinates({ location: { address: 'Por confirmar' } })).toBeNull();
    expect(eventCoordinates({ location: { coordinates: [0, 0] } })).toBeNull();
    expect(eventSectionPlan({ date: at(5), location: { address: 'Por confirmar' } }, now).navigation).toBe(false);
  });

  it('gives a virtual event no transport, stays or song requests', () => {
    expect(eventSectionPlan({ date: at(5), isVirtual: true, category: 'music', location: santoDomingo }, now))
      .toMatchObject({ navigation: false, hospitality: false, tripBudget: false, transitDominicanRepublic: false, splitCosts: false });
  });

  it('shows Dominican emergency contacts only for events in the Dominican Republic', () => {
    expect(eventSectionPlan({ date: at(5), location: santoDomingo }, now).transitDominicanRepublic).toBe(true);
    expect(eventSectionPlan({ date: at(5), location: { coordinates: [-3.7, 40.4], countryCode: 'ES' } }, now).transitDominicanRepublic).toBe(false);
  });

  it('keeps song requests to musical, active events with an organizer on EventNow', () => {
    expect(eventSectionPlan({ date: at(5), category: 'nightlife', location: santoDomingo }, now).songVoting).toBe(true);
    expect(eventSectionPlan({ date: at(5), category: 'business', location: santoDomingo }, now).songVoting).toBe(false);
    expect(eventSectionPlan({ date: at(-3), category: 'music', location: santoDomingo }, now).songVoting).toBe(false);
    expect(eventSectionPlan({ date: at(5), category: 'music', location: santoDomingo, publicSource: { name: 'Agenda' } }, now).songVoting).toBe(false);
  });
});
