/* eslint-disable @typescript-eslint/no-require-imports -- Jest hoists mock factories. */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { BackHandler, TouchableOpacity } from 'react-native';
import { FabSheetProvider, useFabSheet } from '../FabSheetContext';
const mockExpand = jest.fn(), mockClose = jest.fn();
jest.mock('../AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/ui', () => ({ ActionBottomSheet: require('react').forwardRef(function MockSheet(props: any, ref: any) {
  require('react').useImperativeHandle(ref, () => ({ expand: mockExpand, close: mockClose }));
  return props.children;
}) }));
function Trigger() { const { openSheet } = useFabSheet(); return <TouchableOpacity testID="open-creation" onPress={openSheet} />; }
test('Android Back closes the open creation menu and releases the listener', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const remove = jest.fn();
  const subscription = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
  let root: TestRenderer.ReactTestRenderer | undefined;
  try {
    await act(async () => { root = TestRenderer.create(<FabSheetProvider><Trigger /></FabSheetProvider>); });
    expect(subscription).not.toHaveBeenCalled();
    await act(async () => root!.root.findByProps({ testID: 'open-creation' }).props.onPress());
    expect(mockExpand).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    const handler = subscription.mock.calls[0][1];
    await act(async () => { expect(handler()).toBe(true); });
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  } finally {
    if (root) await act(async () => root!.unmount());
    subscription.mockRestore();
  }
});
