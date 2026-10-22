import { bindHomeForegroundRefresh, confirmedHomeAttendees, createHomeRequestGate, homeEventPrice, homeEventTiming, homeEventsQuery, visibleHomeEvents, type HomeEvent } from '../homeToday';

const now = Date.parse('2026-10-19T23:30:00-04:00');
const event = (changes: HomeEvent = {}): HomeEvent => ({ _id: 'event-1', status: 'published', date: new Date(now + 3600000).toISOString(), endDate: new Date(now + 7200000).toISOString(), ...changes });

it('sends the exclusive twelve-hour horizon before pagination, including across midnight', () => {
  expect(homeEventsQuery(true, now)).toEqual({ limit: 30, timeFilter: 'upcoming', startsBefore: '2026-10-20T15:30:00.000Z' });
  expect(homeEventsQuery(false, now)).toEqual({ limit: 30, timeFilter: 'upcoming' });
});

it('includes ongoing and future published public events but excludes expiry, private and non-published states', () => {
  const ongoing = event({ _id: 'ongoing', date: new Date(now - 3600000).toISOString(), endDate: new Date(now + 3600000).toISOString() });
  const upcoming = event({ _id: 'future' });
  const excluded = ['draft', 'cancelled', 'completed'].map(status => event({ status: status as HomeEvent['status'] }));
  expect(visibleHomeEvents([upcoming, ongoing, ...excluded, event({ isPrivate: true }), event({ endDate: new Date(now).toISOString(), date: new Date(now - 3600000).toISOString() })], true, now).map(value => value._id)).toEqual(['ongoing', 'future']);
});

it('uses an exclusive start boundary and removes expired events on the next clock tick', () => {
  const horizon = now + 12 * 3600000;
  const edge = event({ date: new Date(horizon).toISOString(), endDate: new Date(horizon + 3600000).toISOString() });
  expect(visibleHomeEvents([edge], true, now)).toHaveLength(0);
  expect(visibleHomeEvents([edge], false, now)).toHaveLength(1);
  const ending = event({ date: new Date(now - 3600000).toISOString(), endDate: new Date(now + 1).toISOString() });
  expect(visibleHomeEvents([ending], true, now)).toHaveLength(1);
  expect(visibleHomeEvents([ending], true, now + 1)).toHaveLength(0);
});

it('matches the backend two-hour fallback without describing estimated starts as live presence', () => {
  const recent = event({ date: new Date(now - 3600000).toISOString(), endDate: undefined });
  expect(homeEventTiming(recent, now)).toMatchObject({ inProgress: true, estimated: true, label: 'Inicio reciente · horario estimado' });
  expect(visibleHomeEvents([recent], true, now)).toHaveLength(1);
  expect(visibleHomeEvents([recent], true, now + 3600000)).toHaveLength(0);
  expect(visibleHomeEvents([event({ date: 'invalid' }), event({ endDate: 'invalid' })], true, now)).toHaveLength(0);
});

it('does not invent confirmed attendees from IDs or generic counts and formats real currency amounts', () => {
  expect(confirmedHomeAttendees(event({ attendees: ['id-a', 'id-b'], attendeesCount: 50 }))).toBeNull();
  expect(confirmedHomeAttendees(event({ confirmedAttendeesCount: 4 }))).toBe(4);
  expect(confirmedHomeAttendees(event({ attendees: [{ user: 'a', status: 'confirmed', joinedAt: '' }, { user: 'b', status: 'maybe', joinedAt: '' }] }))).toBe(1);
  expect(homeEventPrice(event({ price: { amount: 650, currency: 'DOP' } })).label).toContain('650');
  expect(homeEventPrice(event({ price: 0 })).free).toBe(true);
});

it('uses twelve elapsed hours across daylight-saving clock changes', () => {
  const beforeDst = Date.parse('2026-11-01T00:30:00-04:00');
  expect(Date.parse(homeEventsQuery(true, beforeDst).startsBefore!) - beforeDst).toBe(12 * 3600000);
});

it('blocks duplicate refreshes and ignores stale accounts, toggles and unmounted requests', () => {
  const gate = createHomeRequestGate();
  gate.setScope('account-a:true');
  const old = gate.begin('account-a:true')!;
  expect(gate.begin('account-a:true')).toBeNull();
  gate.setScope('account-b:true');
  expect(gate.isCurrent(old)).toBe(false);
  expect(gate.begin('account-a:true')).toBeNull();
  gate.setScope('account-a:true');
  const latest = gate.begin('account-a:true')!;
  gate.finish(old);
  expect(gate.begin('account-a:true')).toBeNull();
  expect(gate.isCurrent(latest)).toBe(true);
  gate.finish(latest);
  const refresh = gate.begin('account-a:true')!;
  gate.setScope('account-a:false');
  expect(gate.isCurrent(refresh)).toBe(false);
  const toggled = gate.begin('account-a:false')!;
  gate.invalidate();
  expect(gate.isCurrent(toggled)).toBe(false);
});

it('refreshes once per foreground minute and removes timers/listeners on background or unmount', () => {
  jest.useFakeTimers();
  try {
    let change!: (_next: string) => void;
    const unsubscribe = jest.fn();
    const refresh = jest.fn();
    const stop = bindHomeForegroundRefresh('active', listener => { change = listener; return unsubscribe; }, refresh, true);
    expect(refresh).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60000);
    expect(refresh).toHaveBeenCalledTimes(2);
    change('background');
    jest.advanceTimersByTime(180000);
    expect(refresh).toHaveBeenCalledTimes(2);
    change('active');
    change('active');
    expect(refresh).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(60000);
    expect(refresh).toHaveBeenCalledTimes(4);
    stop();
    jest.advanceTimersByTime(60000);
    expect(refresh).toHaveBeenCalledTimes(4);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  } finally { jest.useRealTimers(); }
});

it('does not fetch in the background and does not poll when the twelve-hour filter is disabled', () => {
  jest.useFakeTimers();
  try {
    let change!: (_next: string) => void;
    const refresh = jest.fn();
    const stop = bindHomeForegroundRefresh('background', listener => { change = listener; return () => {}; }, refresh, false);
    jest.advanceTimersByTime(120000);
    expect(refresh).not.toHaveBeenCalled();
    change('active');
    jest.advanceTimersByTime(120000);
    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
    expect(jest.getTimerCount()).toBe(0);
  } finally { jest.useRealTimers(); }
});
