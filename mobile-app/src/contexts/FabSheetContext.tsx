import React, { createContext, useContext, useRef, useCallback, useEffect, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryAppearance } from '@/constants/discoveryAppearance';
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
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();
  const palette = discoveryAppearance(isDark);

  const openSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
    setIsOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSheet();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, closeSheet]);

  const handleNavigation = (route: string) => {
    closeSheet();
    setTimeout(() => {
      // In expo-router, if we push a deep link, we use router.push
      // However the app seems to be using mixed React Navigation and Expo Router.
      // Easiest is to navigate using the standard approach for this app, 
      // but since we are in root layout we might need to route to the path
      if (isAuthenticated) router.push(`/${route}` as any);
      else router.push({ pathname: '/(auth)/login', params: { returnTo: `/${route}` } });
    }, 300);
  };

  return (
    <FabSheetContext.Provider value={{ openSheet, closeSheet }}>
      {children}
      <ActionBottomSheet ref={bottomSheetRef} snapPoints={['45%', '70%']} title="Dale forma a tu idea" onClose={() => setIsOpen(false)}>
        <View style={styles.sheetContent}>
          {([
            { route: 'create-event', icon: 'calendar-outline', title: 'Crear un evento', hint: 'Un lugar, una fecha y gente por conectar.' },
            { route: 'create-tribe', icon: 'people-outline', title: 'Crear una tribu', hint: 'Una comunidad que comparte tus intereses.' },
          ] as const).map(action => (
            <TouchableOpacity key={action.route} accessibilityRole="button" activeOpacity={0.8}
              style={[styles.sheetButton, { backgroundColor: palette.surface }]}
              onPress={() => handleNavigation(action.route)}>
              <View style={[styles.iconContainer, { backgroundColor: palette.accent }]}>
                <Ionicons name={action.icon} size={23} color={palette.onAccent} />
              </View>
              <View style={{ flex: 1 }}><Text style={[styles.sheetButtonText, { color: palette.text }]}>{action.title}</Text><Text style={[styles.hint, { color: palette.muted }]}>{action.hint}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </TouchableOpacity>
          ))}
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
  sheetContent: { gap: 12 },
  sheetButton: { padding: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 88 },
  iconContainer: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sheetButtonText: { fontWeight: '600', fontSize: 16, lineHeight: 23 },
  hint: { fontSize: 13, lineHeight: 20, marginTop: 4 },
});
