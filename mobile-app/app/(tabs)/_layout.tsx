import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useFabSheet } from '../../src/contexts/FabSheetContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const PINK   = '#ec4899';
const VIOLET = '#8b5cf6';
const BLUE   = '#3b82f6';

function TabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={60}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />
    );
  }
  return (
    <View
      style={[StyleSheet.absoluteFillObject, { backgroundColor: '#050505' }]}
    />
  );
}

export default function TabsLayout() {
  const { openSheet } = useFabSheet();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PINK,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 84 : 64,
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255,255,255,0.07)',
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 6,
        },
        tabBarIconStyle: { marginTop: 4 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              {focused && (
                <LinearGradient
                  colors={[PINK + '30', VIOLET + '10']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              )}
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              {focused && (
                <LinearGradient
                  colors={[BLUE + '30', VIOLET + '10']}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="createHub"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.fabContainer}>
              <LinearGradient
                colors={[PINK, VIOLET]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Ionicons name="add" size={30} color="#fff" />
              </LinearGradient>
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            openSheet();
          },
        })}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              {focused && (
                <LinearGradient
                  colors={[VIOLET + '30', PINK + '10']}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Ionicons
                name={focused ? 'compass' : 'compass-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              {focused && (
                <LinearGradient
                  colors={[PINK + '30', VIOLET + '10']}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    width: 44,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fabContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    marginTop: -20,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
