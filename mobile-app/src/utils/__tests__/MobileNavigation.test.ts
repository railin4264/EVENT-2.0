import fs from 'node:fs';
import path from 'node:path';
import { MOBILE_SECTIONS } from '../../constants/mobileNavigation';
import { eventAuthReturn, isPublicEventRoute } from '../eventAuthReturn';
test('every listed tool has a real mobile route and survives sign-in', () => {
  const routes = MOBILE_SECTIONS.flatMap(section => section.items.map(item => item.route));
  expect(new Set(routes).size).toBe(routes.length);
  for (const route of routes) {
    expect(fs.existsSync(path.resolve(__dirname, '../../../app', route.slice(1) + '.tsx'))).toBe(true);
    expect(eventAuthReturn(route)).toBe(route);
  }
});
test('map and the function hub are public while personal areas stay protected', () => {
  expect(isPublicEventRoute(['map'])).toBe(true); expect(isPublicEventRoute(['(tabs)', 'services'])).toBe(true);
  for (const route of ['feed', 'messages', 'tickets', 'settings', 'create-post']) expect(isPublicEventRoute([route])).toBe(false);
  expect(eventAuthReturn('https://outside.test/feed')).toBe('/(tabs)'); expect(eventAuthReturn('/feed?publish=true')).toBe('/(tabs)');
});
