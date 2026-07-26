import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { ActionBottomSheet } from '@/components/ui';
import { useRouter } from 'expo-router';

interface FabSheetContextType {
  openSheet: () => void;
  closeSheet: () => void;
}

const FabSheetContext = createContext<FabSheetContextType | undefined>(undefined);

export const FabSheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const router = useRouter();

  const openSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleNavigation = (route: string) => {
    closeSheet();
    setTimeout(() => {
      // In expo-router, if we push a deep link, we use router.push
      // However the app seems to be using mixed React Navigation and Expo Router.
      // Easiest is to navigate using the standard approach for this app, 
      // but since we are in root layout we might need to route to the path
      router.push(`/${route}` as any);
    }, 300);
  };

  return (
    <FabSheetContext.Provider value={{ openSheet, closeSheet }}>
      {children}
      <ActionBottomSheet ref={bottomSheetRef} snapPoints={['35%']} title="Crear algo nuevo">
        <View style={styles.sheetContent}>
          <TouchableOpacity 
            style={[styles.sheetButton, theme.glass.light]} 
            onPress={() => handleNavigation('CreateEvent')}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <Text style={styles.sheetButtonText}>Evento</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sheetButton, theme.glass.light]} 
            onPress={() => handleNavigation('CreateTribe')}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.violet }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.sheetButtonText}>Tribu</Text>
          </TouchableOpacity>
        </View>
      </ActionBottomSheet>
    </FabSheetContext.Provider>
  );
};

export const useFabSheet = () => {
  const context = useContext(FabSheetContext);
  if (!context) throw new Error('useFabSheet must be used within FabSheetProvider');
  return context;
};

const styles = StyleSheet.create({
  sheetContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  sheetButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: 100,
    gap: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  sheetButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
