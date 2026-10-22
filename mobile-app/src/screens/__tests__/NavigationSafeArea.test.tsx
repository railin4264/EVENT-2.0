/* eslint-disable @typescript-eslint/no-require-imports -- Jest hoists these factories before module imports. */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import TabsLayout from '../../../app/(tabs)/_layout';
let mockBottom = 0;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges, style }: any) => require('react').createElement(require('react-native').View, { testID: 'system-safe-area', accessibilityLabel: edges.join(','), style: [style, { paddingBottom: edges.includes('bottom') ? mockBottom : 0 }] }, children),
}));
jest.mock('@react-navigation/bottom-tabs', () => ({ BottomTabBar: (props: any) => require('react').createElement(require('react-native').View, { testID: 'app-tab-bar', accessibilityValue: { now: props.insets.bottom } }) }));
jest.mock('expo-router', () => { function Tabs({ tabBar }: any) { return tabBar({}); } Tabs.Screen = function TabScreen() { return null; }; return { Tabs }; });
jest.mock('../../contexts/FabSheetContext', () => ({ useFabSheet: () => ({ openSheet: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
let root: TestRenderer.ReactTestRenderer;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await act(async () => root.unmount()); });
test.each([0, 24, 48])('system navigation inset %i stays outside the app menu without double padding', async bottom => {
  mockBottom = bottom;
  await act(async () => { root = TestRenderer.create(<TabsLayout />); });
  const safe = root.root.findByProps({ testID: 'system-safe-area' });
  expect(safe.props.accessibilityLabel).toContain('bottom');
  expect(StyleSheet.flatten(safe.props.style).paddingBottom).toBe(bottom);
  expect(root.root.findByProps({ testID: 'app-tab-bar' }).props.accessibilityValue.now).toBe(0);
});
