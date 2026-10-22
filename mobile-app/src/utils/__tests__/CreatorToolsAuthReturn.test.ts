import { eventAuthReturn, isPublicEventRoute } from '../eventAuthReturn';
const id = 'a'.repeat(24);
test.each([`/community-event/${id}`, `/community-event/${id}?scope=ideas`, '/partners', '/planning-tools', `/planning-tools?draftId=${id}`])('preserves the readonly return target %s', target => {
  expect(eventAuthReturn(target)).toBe(target);
});
test.each([`/community-event/${id}?scope=ideas&accept=true`, '/partners/accept', `/planning-tools?draftId=${id}&publish=true`, '/planning-tools?draftId=https://evil.test'])('rejects a mutation-like or invalid return %s', target => {
  expect(eventAuthReturn(target)).toBe('/(tabs)');
});
test.each([{ segments: ['partners'] }, { segments: ['planning-tools'] }, { segments: ['community-event', id] }])('permits public readonly route $segments', ({ segments }) => {
  expect(isPublicEventRoute(segments)).toBe(true);
});
