import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { useFabSheet } from '../../src/contexts/FabSheetContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { discoveryAppearance } from '../../src/constants/discoveryAppearance';

export default function TabsLayout() {
  const { openSheet } = useFabSheet();
  const { isDark } = useTheme();
  const { fontScale } = useWindowDimensions();
  const palette = discoveryAppearance(isDark);
  const tabHeight = 64 + Math.max(0, fontScale - 1) * 16;
  const icon = (name: keyof typeof Ionicons.glyphMap, color: string, focused: boolean) => (
    <View style={[styles.icon, focused && { backgroundColor: palette.surface }]}>
      <Ionicons name={name} size={23} color={color} />
    </View>
  );
  return (
    <Tabs tabBar={props => (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ backgroundColor: palette.background }}>
        <BottomTabBar {...props} insets={{ top: 0, bottom: 0, left: 0, right: 0 }} />
      </SafeAreaView>
    )} screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: palette.accent,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: {
        backgroundColor: palette.background,
        borderTopColor: palette.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        height: tabHeight,
        paddingBottom: 8,
        paddingTop: 6,
        elevation: 0,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, focused }) => icon(focused ? 'home' : 'home-outline', color, focused) }} />
      <Tabs.Screen name="services" options={{ title: 'Social', tabBarIcon: ({ color, focused }) => icon(focused ? 'people' : 'people-outline', color, focused) }} />
      <Tabs.Screen name="createHub" options={{
        title: 'Crear',
        tabBarAccessibilityLabel: 'Crear un evento o una comunidad',
        tabBarButton: ({ children, style, accessibilityLabel, testID }) => (
          <TouchableOpacity style={style} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={openSheet} activeOpacity={0.75}>{children}</TouchableOpacity>
        ),
        tabBarIcon: () => <View style={[styles.createIcon, { backgroundColor: palette.accent }]}><Ionicons name="add" size={25} color={palette.onAccent} /></View>,
      }} />
      <Tabs.Screen name="discover" options={{ title: 'Explorar', tabBarIcon: ({ color, focused }) => icon(focused ? 'compass' : 'compass-outline', color, focused) }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color, focused }) => icon(focused ? 'person' : 'person-outline', color, focused) }} />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  icon: { width: 46, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  createIcon: { width: 42, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
