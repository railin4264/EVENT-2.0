jest.mock('../../contexts/ThemeContext', () => { const actual = jest.requireActual('../../contexts/ThemeContext'); return { ...actual, useTheme: () => ({ theme: actual.darkTheme }) }; });
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Share, Text, TextInput, TouchableOpacity } from 'react-native';
import { PartnerBriefTools } from '../partner-tools';
let mockOnBlur: (() => void) | undefined;
jest.mock('expo-router', () => ({ useFocusEffect: (fn: () => () => void) => { mockOnBlur = fn(); } }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); jest.restoreAllMocks(); });
const create = async () => { await act(async () => { root = TestRenderer.create(<PartnerBriefTools />); }); };
const input = () => root.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === 'Objetivo de la colaboración')!;
const button = () => root.root.findAllByType(TouchableOpacity).find(n => n.findAllByType(Text).some(t => t.props.children === 'Exportar brief y checklist'))!;
test('exports an editable draft and personal checks without inventing confirmed delivery', async () => {
  await create(); await act(async () => input().props.onChangeText('Hidratación para la comunidad'));
  const checkbox = root.root.findAllByType(TouchableOpacity).find(n => n.props.accessibilityRole === 'checkbox')!;
  await act(async () => checkbox.props.onPress()); await act(async () => button().props.onPress());
  const exported = JSON.parse((Share.share as jest.Mock).mock.calls[0][0].message);
  expect(exported.objective).toBe('Hidratación para la comunidad');
  expect(exported.personalChecklist[0].markedByUser).toBe(true);
  expect(exported).not.toHaveProperty('status'); expect(exported).not.toHaveProperty('roi');
});
test('leaving the screen clears the memory draft and personal checklist', async () => {
  await create(); await act(async () => input().props.onChangeText('Dato temporal'));
  await act(async () => mockOnBlur?.());
  expect(input().props.value).toBe('');
  const checkbox = root.root.findAllByType(TouchableOpacity).find(n => n.props.accessibilityRole === 'checkbox')!;
  expect(checkbox.props.accessibilityState.checked).toBe(false);
});
test('export failures stay errors and the draft remains editable', async () => {
  (Share.share as jest.Mock).mockRejectedValueOnce(new Error('No disponible'));
  await create(); await act(async () => input().props.onChangeText('Conservar este borrador'));
  await act(async () => button().props.onPress());
  expect(JSON.stringify(root.toJSON())).toContain('No pudimos abrir las opciones');
  expect(input().props.value).toBe('Conservar este borrador');
});
test('a different account key starts with an empty brief and checklist', async () => {
  await act(async () => { root = TestRenderer.create(<PartnerBriefTools key="account-a" />); });
  await act(async () => input().props.onChangeText('Contenido privado A'));
  await act(async () => root.update(<PartnerBriefTools key="account-b" />));
  expect(input().props.value).toBe('');
  expect(JSON.stringify(root.toJSON())).not.toContain('Contenido privado A');
});
