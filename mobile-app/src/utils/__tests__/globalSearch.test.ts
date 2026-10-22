import { readSearchPage, searchResultPath } from '../globalSearch';
const id = 'a'.repeat(24);
const result = { id, type: 'user' as const, title: 'Ana', metadata: { isHost: true, role: 'creator' } };
test('canonical search results preserve creator metadata and pagination', () => {
  expect(readSearchPage({ success: true, results: [result], pagination: { page: 2, total: 19, hasMore: true } })).toEqual({ results: [result], pagination: { page: 2, total: 19, hasMore: true } });
});
test.each([{ success: false, results: [] }, { success: true, data: {} }, { success: true, results: [{ ...result, id: '../../admin' }] }])('rejects invalid result payloads %p', body => {
  expect(() => readSearchPage(body)).toThrow();
});
test('result destinations are type-specific and reject unsafe IDs', () => {
  expect(searchResultPath(result, true)).toBe(`/user/${id}`); expect(searchResultPath({ ...result, type: 'event' })).toBe(`/events/${id}`);
  expect(searchResultPath({ ...result, type: 'tribe' }, true)).toBe(`/tribe/${id}`); expect(searchResultPath({ ...result, id: 'https://outside.test' })).toBeNull();
});
