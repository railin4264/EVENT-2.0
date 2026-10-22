import {
  buildMobileEventPayload,
  explicitEventInstant,
} from '../planningDraft';
const details = {
  timeZone: 'America/Santo_Domingo',
  latitude: '18.4',
  longitude: '-69.9',
  city: 'Santo Domingo',
  country: 'República Dominicana',
  currency: 'DOP',
};
const data = {
  title: '  Plan musical ',
  description: ' Una descripción completa ',
  category: 'music',
  date: '2026-11-22',
  time: '18:30',
  location: ' Dirección válida ',
  price: '500',
  capacity: '30',
};
test('selected IANA time converts without marking local clock as UTC', () =>
  expect(
    explicitEventInstant('2026-11-22', '18:30', 'America/Santo_Domingo')
  ).toBe('2026-11-22T22:30:00.000Z'));
test.each([
  ['2026-03-08', '02:30'],
  ['2026-11-01', '01:30'],
])('rejects missing or repeated DST hour %s %s', (date, time) =>
  expect(() => explicitEventInstant(date, time, 'America/New_York')).toThrow()
);
test.each([
  ['2026-02-30', '18:00', 'UTC'],
  ['2026-11-22', '25:00', 'UTC'],
  ['2026-11-22', '18:00', ''],
  ['2026-11-22', '18:00', 'Moon/Base'],
])('rejects invalid date/time/zone', (date, time, zone) =>
  expect(() => explicitEventInstant(date, time, zone)).toThrow()
);
test('creation payload has real coordinates and JSON price without guessed end time', () => {
  const p = buildMobileEventPayload(data, details, Date.parse('2026-10-20'));
  expect(p.location.coordinates).toEqual([-69.9, 18.4]);
  expect(p.price).toEqual({ amount: 500, currency: 'DOP' });
  expect(p.maxAttendees).toBe(30);
  expect(p.date).toBe('2026-11-22T22:30:00.000Z');
  expect(p).not.toHaveProperty('endDate');
  expect(p).not.toHaveProperty('status');
});
test.each([
  { latitude: '' },
  { longitude: 'Infinity' },
  { city: '' },
  { country: '' },
  { currency: 'AAA' },
])('incomplete real-world data prevents submission %p', patch =>
  expect(() =>
    buildMobileEventPayload(
      data,
      { ...details, ...patch },
      Date.parse('2026-10-20')
    )
  ).toThrow()
);
test.each([
  { price: '1.001' },
  { capacity: '0' },
  { capacity: 'NaN' },
  { date: '2020-01-01' },
])('invalid form data prevents submission %p', patch =>
  expect(() =>
    buildMobileEventPayload(
      { ...data, ...patch },
      details,
      Date.parse('2026-10-20')
    )
  ).toThrow()
);


test('Japanese events keep their confirmed currency and Tokyo wall time', () => {
  const payload = buildMobileEventPayload({ ...data, date: '2026-11-28', time: '15:00', price: '2500' }, {
    timeZone: 'Asia/Tokyo', latitude: '35.68', longitude: '139.76', city: 'Tokyo', country: 'Japan', currency: 'JPY'
  }, Date.parse('2026-10-21'));
  expect(payload.price).toEqual({ amount: 2500, currency: 'JPY' });
  expect(payload.date).toBe('2026-11-28T06:00:00.000Z');
});
