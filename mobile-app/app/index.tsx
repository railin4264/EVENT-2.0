import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { SplashScreen } from '../src/components/SplashScreen';
import { useTheme } from '../src/contexts/ThemeContext';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      // Browsing is public; protected actions request sign-in when needed.
      router.replace('/(tabs)');
    }
  }, [isLoading, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <SplashScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
