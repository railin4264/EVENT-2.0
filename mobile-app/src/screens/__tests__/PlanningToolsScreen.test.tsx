jest.mock('../../contexts/ThemeContext', () => { const actual = jest.requireActual('../../contexts/ThemeContext'); return { ...actual, useTheme: () => ({ theme: actual.darkTheme }) }; });
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput, TouchableOpacity, Alert, Text } from 'react-native';
import PlanningToolsScreen from '../PlanningToolsScreen';
import { apiClient } from '../../services/apiClient';
let mockUser: any = { id: 'account-a' };
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../services/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));
const get = apiClient.get as jest.Mock,
  post = apiClient.post as jest.Mock;
let tree: TestRenderer.ReactTestRenderer;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockUser = { id: 'account-a' };
  get.mockResolvedValue({ data: { success: true, data: [] } });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
const create = async () => {
  await act(async () => {
    tree = TestRenderer.create(<PlanningToolsScreen />);
  });
};
const button = (label: string) =>
  tree.root
    .findAllByType(TouchableOpacity)
    .find(b => b.findAllByType(Text).some(t => t.props.children === label))!;
test('opening tools only lists private drafts, never parses or publishes', async () => {
  await create();
  expect(get).toHaveBeenCalledWith('/planning-tools/drafts');
  expect(post).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});
test('parsing is voluntary and never automatically creates or publishes a draft', async () => {
  post.mockResolvedValue({
    data: {
      success: true,
      data: {
        fields: { title: 'Plan revisable' },
        warnings: ['Confirma la hora'],
      },
    },
  });
  await create();
  await act(async () => {
    tree.root
      .findAllByType(TextInput)
      .find(v => v.props.accessibilityLabel === 'Mensaje para revisar')!
      .props.onChangeText('Título: Plan revisable');
  });
  await act(async () => {
    button('Preparar campos para revisar').props.onPress();
  });
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith('/planning-tools/parse', {
    text: 'Título: Plan revisable',
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Plan revisable');
  expect(mockPush).not.toHaveBeenCalled();
});
test('a late account response cannot show another owners private draft', async () => {
  let resolve: any;
  get.mockImplementationOnce(
    () =>
      new Promise(r => {
        resolve = r;
      })
  );
  await create();
  mockUser = { id: 'account-b' };
  await act(async () => {
    tree.update(<PlanningToolsScreen />);
  });
  await act(async () => {
    resolve({
      data: {
        success: true,
        data: [{ _id: 'old', fields: { title: 'Private old owner' } }],
      },
    });
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('Private old owner');
});
test('deleting a private draft requires explicit confirmation', async () => {
  get.mockResolvedValue({
    data: { success: true, data: [{ _id: 'abc', fields: { title: 'Plan' } }] },
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await create();
  await act(async () => {
    button('Eliminar borrador').props.onPress();
  });
  expect(alert).toHaveBeenCalled();
  expect(apiClient.delete).not.toHaveBeenCalled();
  alert.mockRestore();
});
