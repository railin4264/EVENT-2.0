import { eventAuthReturn, isPublicEventRoute } from '../eventAuthReturn';
test('group invitations survive sign in without granting mutations', () => {
  expect(eventAuthReturn(`/group-plans?token=${'a'.repeat(48)}`)).toBe(`/group-plans?token=${'a'.repeat(48)}`);
  expect(eventAuthReturn('/group-plans')).toBe('/group-plans');
  expect(isPublicEventRoute(['group-plans'])).toBe(true);
  expect(isPublicEventRoute(['ideas-market'])).toBe(true);
  expect(isPublicEventRoute(['event-planning', 'id'])).toBe(true);
});
test.each(['//evil.test', 'https://evil.test/group-plans', '/group-plans?token=short', `/group-plans?token=${'a'.repeat(48)}&vote=true`, '/group-plans/vote'])('return target rejects %s', target => {
  expect(eventAuthReturn(target)).toBe('/(tabs)');
});
