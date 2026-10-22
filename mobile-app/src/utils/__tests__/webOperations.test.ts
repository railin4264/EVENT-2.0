import { officialWebPage } from '../webOperations';
test.each(['', 'http://public.domain.org', 'https://localhost', 'https://192.168.1.2', 'https://user:password@public.domain.org'])('refuses unsafe or missing official origin %s', origin => {
  expect(officialWebPage('/dashboard', origin)).toBeNull();
});
test('operations use the official origin and never propagate URL credentials or query tokens', () => {
  expect(officialWebPage('/organizers', 'https://events.domain.org/old-path?token=do-not-forward')).toBe('https://events.domain.org/organizers');
});
