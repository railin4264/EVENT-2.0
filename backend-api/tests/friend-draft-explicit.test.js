const { extractFriendPlanDraft } = require('../src/services/eventIngestion/friendPlanDraftService');

test('a Tokyo announcement never turns into a Dominican venue or invented date', () => {
  const result = extractFriendPlanDraft('Lectura en el parque Ueno, Tokio, el 28 de noviembre de 2026 a las 15:00. Precio por confirmar.');
  expect(result.localDate).toBe('2026-11-28'); expect(result.localTime).toBe('15:00');
  expect(result.date).toBeNull(); expect(result.timeZone).toBeNull(); expect(result.venue).toBeNull();
  expect(result.estimatedBudget).toBeNull(); expect(JSON.stringify(result)).not.toContain('Mirador');
  expect(result.needsConfirmation).toBe(true);
});
test.each(['Coro este viernes en el parque', 'Cena mañana', 'Juegos esta noche', 'Nos juntamos el 03/04'])('relative or ambiguous text needs confirmation: %s', text => {
  const result = extractFriendPlanDraft(text);
  expect(result.date).toBeNull(); expect(result.localDate).toBeNull(); expect(result.localTime).toBeNull();
  expect(result.endDate).toBeNull(); expect(result.estimatedBudget).toBeNull();
});
test('explicit labels preserve venue, timezone and price text without converting to a payment promise', () => {
  const result = extractFriendPlanDraft('Club de lectura\n28 de noviembre de 2026 a las 3:30 PM\nLugar: Parque Ueno, Tokio\nZona horaria: Asia/Tokyo\nPrecio: por confirmar');
  expect(result.venue).toBe('Parque Ueno, Tokio'); expect(result.timeZone).toBe('Asia/Tokyo');
  expect(result.localTime).toBe('15:30'); expect(result.estimatedBudget).toBe('por confirmar');
  expect(result.date).toBeNull(); expect(result.suggestedVisibility).toBe('private');
});
test('an explicit offset keeps its local date and time instead of shifting to the server zone', () => {
  const result = extractFriendPlanDraft('Concierto\n2026-11-28T00:30:00+09:00\nLugar: Tokyo Hall');
  expect(result.date.toISOString()).toBe('2026-11-27T15:30:00.000Z');
  expect(result.localDate).toBe('2026-11-28'); expect(result.localTime).toBe('00:30');
  expect(result.timeZone).toBeNull();
});
test.each(['31 de febrero de 2027 a las 25:90', '2027-02-30', 'Coro\nZona horaria: Mars/Olympus'])('invalid calendar values remain unset: %s', text => {
  const result = extractFriendPlanDraft(text);
  expect(result.date).toBeNull(); expect(result.localDate).toBeNull(); expect(result.timeZone).toBeNull();
});
