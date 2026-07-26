import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web-compatible MapView mock component
export const MapView = ({ children, style, ...props }: any) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>Mapa no disponible en web</Text>
      <Text style={styles.subText}>La vista de mapa solo está disponible en dispositivos móviles</Text>
      {children}
    </View>
  );
};

export const Marker = ({ children, ...props }: any) => {
  return (
    <View style={styles.marker}>
      <Text style={styles.markerText}>📍</Text>
      {children}
    </View>
  );
};

export const Callout = ({ children, ...props }: any) => {
  return (
    <View style={styles.callout}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerText: {
    fontSize: 20,
  },
  callout: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

// Default export for compatibility
export default MapView;