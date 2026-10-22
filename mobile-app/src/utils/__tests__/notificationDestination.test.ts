import { notificationDestination } from '../notificationDestination';
import { isPublicEventRoute } from '../eventAuthReturn';
test('notification links resolve to internal read routes and reject external or traversal links', () => {
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  expect(notificationDestination({ data: { eventId: id } })).toBe(`/event/${id}`);
  expect(notificationDestination({ actionUrl: `/events/${id}` })).toBe(`/event/${id}`);
  expect(notificationDestination({ actionUrl: 'https://attacker.test' })).toBe('/notifications');
  expect(notificationDestination({ data: { chatId: '../../settings' } })).toBe('/notifications');
});
test('guests can discover events while account and creation tabs remain protected', () => {
  for (const segments of [[], ['index'], ['(tabs)'], ['(tabs)', 'index'], ['(tabs)', 'discover'], ['(tabs)', 'services'], ['search'], ['map']]) expect(isPublicEventRoute(segments)).toBe(true);
  for (const segments of [['(tabs)', 'profile'], ['(tabs)', 'createHub'], ['settings'], ['messages']]) expect(isPublicEventRoute(segments)).toBe(false);
});
