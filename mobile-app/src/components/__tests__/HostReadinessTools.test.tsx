jest.mock('../../contexts/ThemeContext', () => { const actual = jest.requireActual('../../contexts/ThemeContext'); return { ...actual, useTheme: () => ({ theme: actual.darkTheme }) }; });
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Share, Text, TextInput, TouchableOpacity } from 'react-native';
import HostReadinessTools from '../HostReadinessTools';
let mockBlur: (() => void) | undefined, mockFocus: (() => void) | undefined;
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => (() => void)) => { require('react').useEffect(() => { mockFocus = callback; const cleanup = callback(); mockBlur = cleanup; return cleanup; }, [callback]); } }));
jest.setTimeout(15000);
jest.mock('react-native/Libraries/Components/Switch/Switch', () => ({ default: 'Switch' }));
const props = { actorKey: 'owner-a', targetKey: 'events:a', title: 'Actividad', roles: [{ title: 'Fotografía', slots: 2, acceptedCount: 1, closed: false }], canManage: true, canShareCall: true };
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.restoreAllMocks(); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
const mount = async (patch = {}) => { await act(async () => { root = TestRenderer.create(<HostReadinessTools {...props} {...patch} />); }); };
const button = (label: string) => root.root.findAllByType(TouchableOpacity).find(item => item.findAllByType(Text).some(text => text.props.children === label))!;
test('private tools and public share are hidden unless their permission is true', async () => {
  await mount({ canManage: false, canShareCall: false }); expect(JSON.stringify(root.toJSON())).not.toContain('Prepara una bienvenida'); expect(button('Compartir convocatoria de ayuda')).toBeUndefined();
});
test('an account change clears private draft values and report', async () => {
  await mount(); await act(async () => button('Abrir herramientas privadas').props.onPress());
  await act(async () => root.root.findAllByType(TextInput).find(input => input.props.accessibilityLabel === 'Idiomas confirmados')!.props.onChangeText('Idioma privado'));
  await act(async () => button('Preparar informe JSON').props.onPress()); expect(JSON.stringify(root.toJSON())).toContain('Idioma privado');
  await act(async () => root.update(<HostReadinessTools {...props} actorKey="owner-b" />));
  expect(JSON.stringify(root.toJSON())).not.toContain('Idioma privado'); expect(button('Compartir informe JSON como texto')).toBeUndefined();
});
test('share failures remain errors and never claim delivery or a copied invitation', async () => {
  const share = jest.spyOn(Share, 'share').mockRejectedValue(new Error('No disponible'));
  await mount({ canManage: false }); expect(share).not.toHaveBeenCalled();
  await act(async () => button('Compartir convocatoria de ayuda').props.onPress());
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Fotografía: 1 plaza(s)') }));
  expect(JSON.stringify(root.toJSON())).toContain('No se pudo abrir'); expect(JSON.stringify(root.toJSON())).not.toContain('procesada por el dispositivo');
});
test('a dismissed share does not claim that anyone received the report', async () => {
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
  await mount(); await act(async () => button('Abrir herramientas privadas').props.onPress()); await act(async () => button('Preparar informe JSON').props.onPress());
  await act(async () => button('Compartir informe JSON como texto').props.onPress());
  expect(JSON.stringify(root.toJSON())).toContain('Se cerró el menú.'); expect(JSON.stringify(root.toJSON())).not.toContain('procesada por el dispositivo');
});
test('leaving the screen clears the private draft even when Expo retains its route', async () => {
  await mount(); await act(async () => button('Abrir herramientas privadas').props.onPress());
  await act(async () => root.root.findAllByType(TextInput).find(input => input.props.accessibilityLabel === 'Idiomas confirmados')!.props.onChangeText('Borrador antes de salir'));
  await act(async () => mockBlur?.());
  expect(JSON.stringify(root.toJSON())).not.toContain('Borrador antes de salir');
  await act(async () => mockFocus?.()); await act(async () => button('Abrir herramientas privadas').props.onPress());
  expect(root.root.findAllByType(TextInput).find(input => input.props.accessibilityLabel === 'Idiomas confirmados')!.props.value).toBe('');
});
