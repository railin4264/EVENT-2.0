import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TouchableOpacity, Text } from 'react-native';
import { EventPlanningPanel, alternativeBudgetLabel } from '../EventPlanningPanel';
import { apiClient } from '../../services/apiClient';
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
jest.mock('../../services/apiClient', () => ({ apiClient: { get: jest.fn(), put: jest.fn() } }));
const get = apiClient.get as jest.Mock, put = apiClient.put as jest.Mock;
const data = { canManage: true, practical: { bring: 'Agua' }, budget: { currency: 'DOP', entry: 500, mandatory: [], optional: [{ label: 'Extra', amount: 50, currency: 'DOP' }], complete: false, knownMinimum: 500 }, alternativesAvailable: false };
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); get.mockResolvedValue({ data: { success: true, data } }); put.mockResolvedValue({ data: { success: true, data } }); });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
const mount = async () => { await act(async () => { root = TestRenderer.create(<EventPlanningPanel eventId="event" />); }); };
test('readonly makes incomplete spending explicit and never silently edits', async () => {
  await mount(); const text = JSON.stringify(root.toJSON());
  expect(text).toContain('Agua'); expect(text).toContain('Mínimo conocido'); expect(text).toContain('fuera del total'); expect(text).toContain('pendientes de confirmar');
  expect(get).toHaveBeenCalledTimes(1); expect(put).not.toHaveBeenCalled();
});
test('owner saves only after entering editor and confirming', async () => {
  await mount();
  await act(async () => { root.root.findAllByType(TouchableOpacity).find(button => button.findAllByType(Text).some(node => node.props.children === 'Editar información'))!.props.onPress(); });
  expect(put).not.toHaveBeenCalled();
  await act(async () => { await root.root.findAllByType(TouchableOpacity).find(button => button.findAllByType(Text).some(node => node.props.children === 'Guardar información'))!.props.onPress(); });
  expect(put).toHaveBeenCalledWith('/event-planning/event', { practical: { bring: 'Agua' }, budget: { complete: false, mandatory: [], optional: data.budget.optional } });
  expect(JSON.stringify(root.toJSON())).toContain('Información guardada');
});
test('cancelled plans offer explicit navigation without attendance mutations', async () => {
  get.mockImplementation((url: string) => Promise.resolve({ data: { success: true, data: url.endsWith('alternatives') ? [{ id: 'alternative', title: 'Otro plan', city: 'Santo Domingo', budget: { knownMinimum: 250, currency: 'DOP', complete: false } }] : { ...data, alternativesAvailable: true } } }));
  await mount();
  expect(JSON.stringify(root.toJSON())).toContain('no traslada inscripciones ni pagos');
  expect(JSON.stringify(root.toJSON())).toContain('DOP 250.00 · mínimo conocido; puede haber gastos pendientes');
  await act(async () => { root.root.findAllByType(TouchableOpacity).find(button => button.findAllByType(Text).some(node => Array.isArray(node.props.children) && node.props.children.includes('Otro plan')))!.props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith('/event/alternative'); expect(put).not.toHaveBeenCalled();
});
test('alternative budget distinguishes known minimum from a declared total and guards missing amounts', () => {
  expect(alternativeBudgetLabel({ knownMinimum: 250, currency: 'DOP', complete: false })).toBe('DOP 250.00 · mínimo conocido; puede haber gastos pendientes');
  expect(alternativeBudgetLabel({ knownMinimum: 250, currency: 'DOP', complete: true })).toBe('DOP 250.00 · total informado');
  expect(alternativeBudgetLabel()).toContain('por informar');
  expect(alternativeBudgetLabel({ knownMinimum: Infinity, currency: 'DOP', complete: true })).toContain('por informar');
});
