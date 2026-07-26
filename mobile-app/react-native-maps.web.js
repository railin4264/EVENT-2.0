// Web mock for react-native-maps
import React from 'react';
import { View, Text } from 'react-native';

// Mock MapView component
export default function MapView({ children, style, ...props }) {
  return (
    <View style={[{
      backgroundColor: '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 200,
      borderRadius: 8
    }, style]}>
      <Text style={{ color: '#6b7280', fontSize: 16 }}>Map not available on web</Text>
      {children}
    </View>
  );
}

// Mock Marker component
export function Marker({ children, ...props }) {
  return (
    <View style={{ padding: 4 }}>
      <Text style={{ fontSize: 12 }}>📍</Text>
      {children}
    </View>
  );
}

// Mock provider
export const PROVIDER_GOOGLE = 'google';

// Mock Callout
export function Callout({ children, ...props }) {
  return (
    <View style={{ backgroundColor: 'white', padding: 8, borderRadius: 4 }}>
      {children}
    </View>
  );
}