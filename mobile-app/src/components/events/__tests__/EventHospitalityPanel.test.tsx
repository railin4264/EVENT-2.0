import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import EventHospitalityPanel from '../EventHospitalityPanel';

jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await act(async () => root.unmount()); jest.restoreAllMocks(); });

test('opens the destination and handles a rejected external link', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('unavailable'));
  const serrucho = jest.fn();
  await act(async () => { root = TestRenderer.create(<EventHospitalityPanel event={{ title: 'Salida', location: { city: 'Madrid', venue: 'Sala Central' } }} onOpenSerrucho={serrucho} />); });
  const uber = root.root.findAll(node => node.props.accessibilityLabel === 'Abrir Uber, servicio externo' && typeof node.props.onPress === 'function')[0];
  await act(async () => { uber.props.onPress(); });
  expect(open).toHaveBeenCalledWith(expect.stringContaining('m.uber.com'));
  expect(JSON.stringify(root.toJSON())).toContain('No se pudo abrir el servicio');
  const expenses = root.root.findAll(node => node.props.onPress === serrucho)[0];
  await act(async () => { expenses.props.onPress(); });
  expect(serrucho).toHaveBeenCalledTimes(1);
});

test('keeps missing destinations disabled with readable light theme text', async () => {
  await act(async () => { root = TestRenderer.create(<EventHospitalityPanel event={{ title: 'Pendiente' }} onOpenSerrucho={jest.fn()} />); });
  const links = root.root.findAll(node => node.props.accessibilityRole === 'link' && typeof node.props.onPress === 'function');
  expect(links.length).toBeGreaterThanOrEqual(4);
  expect(links.every(link => link.props.disabled)).toBe(true);
  expect(JSON.stringify(root.toJSON())).toContain('#241C24');
});
