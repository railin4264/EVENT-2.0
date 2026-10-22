import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import OrganizerReliabilityPanel from '../OrganizerReliabilityPanel';
let mockUser: { id: string } | null = { id: 'a' };
let mockOwn: { eligible: boolean; review: { rating: number; comment: string } | null } = { eligible: true, review: null };
const mockSave = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../hooks/useOrganizerReliability', () => ({ useOrganizerReliability: () => ({ stats: null, own: mockOwn, loading: false, saving: false, saved: false, error: '', save: mockSave, load: jest.fn() }) }));
let root: TestRenderer.ReactTestRenderer;
const create = async () => { await act(async () => { root = TestRenderer.create(<OrganizerReliabilityPanel organizerId="host" eventId="event" isPublic />); }); };
const radios = () => root.root.findAll(node => node.props.accessibilityRole === 'radio' && typeof node.props.onPress === 'function' && String(node.type) !== 'View');
const submit = () => root.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && String(node.type) !== 'View')[0];
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); mockUser = { id: 'a' }; mockOwn = { eligible: true, review: null }; });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
test('new review starts with no score selected and cannot save a default five', async () => {
  await create(); expect(radios().every(button => !button.props.accessibilityState.checked)).toBe(true);
  expect(submit().props.disabled).toBe(true);
  await act(async () => { submit().props.onPress(); }); expect(mockSave).not.toHaveBeenCalled();
  await act(async () => { radios()[2].props.onPress(); });
  await act(async () => { submit().props.onPress(); }); expect(mockSave).toHaveBeenCalledWith(3, '');
});
test('editing preserves the existing score and comment instead of replacing with empty defaults', async () => {
  mockOwn = { eligible: true, review: { rating: 2, comment: 'Comentario anterior' } }; await create();
  expect(radios()[1].props.accessibilityState.checked).toBe(true);
  expect(root.root.findByType(TextInput).props.value).toBe('Comentario anterior');
  await act(async () => { submit().props.onPress(); }); expect(mockSave).toHaveBeenCalledWith(2, 'Comentario anterior');
});
test('refetch cannot replace an edited draft and changing accounts clears it', async () => {
  mockOwn = { eligible: true, review: { rating: 2, comment: 'Original' } }; await create();
  await act(async () => { root.root.findByType(TextInput).props.onChangeText('Borrador'); radios()[3].props.onPress(); });
  mockOwn = { eligible: true, review: { rating: 1, comment: 'Respuesta tardía' } };
  await act(async () => { root.update(<OrganizerReliabilityPanel organizerId="host" eventId="event" isPublic />); });
  expect(root.root.findByType(TextInput).props.value).toBe('Borrador'); expect(radios()[3].props.accessibilityState.checked).toBe(true);
  mockUser = { id: 'b' }; mockOwn = { eligible: true, review: null };
  await act(async () => { root.update(<OrganizerReliabilityPanel organizerId="host" eventId="event" isPublic />); });
  expect(root.root.findByType(TextInput).props.value).toBe(''); expect(submit().props.disabled).toBe(true);
});
