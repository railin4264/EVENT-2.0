import React from 'react';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

import { useNetInfo } from '@react-native-community/netinfo';
import { View, Text } from 'react-native';

// Providers
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { NotificationsProvider } from '../src/contexts/NotificationsContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

import { ToastProvider } from '../src/contexts/ToastContext';
import { FabSheetProvider } from '../src/contexts/FabSheetContext';
import { isPublicEventRoute } from '../src/utils/eventAuthReturn';

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function SessionGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key || isLoading) return;
    if (!isAuthenticated && segments[0] !== '(auth)' && !isPublicEventRoute(segments)) router.replace('/(auth)/welcome');
  }, [isAuthenticated, isLoading, navigation?.key, segments, router]);
  return null;
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [loaded, fontError]);

  const netInfo = useNetInfo();

  if (!loaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ToastProvider>
                <AuthProvider>
                  <FabSheetProvider>
                    <NotificationsProvider>
                  {netInfo.isConnected === false && (
                    <View style={{ backgroundColor: '#ef4444', padding: 4, alignItems: 'center', paddingTop: 40 }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Sin conexión a internet</Text>
                    </View>
                  )}
                  <Stack
                    screenOptions={{
                      headerStyle: {
                        backgroundColor: '#0C0B10',
                      },
                      headerTintColor: '#fff',
                      headerTitleStyle: {
                        fontWeight: 'bold',
                      },
                      contentStyle: {
                        backgroundColor: '#0C0B10',
                      },
                    }}
                  >
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="tribe/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="feed" options={{ title: 'Comunidad' }} />
                    <Stack.Screen name="create-post" options={{ headerShown: false }} />
                    <Stack.Screen name="create-story" options={{ headerShown: false }} />
                    <Stack.Screen name="operations" options={{ title: 'Gestión' }} />
                    <Stack.Screen name="services" options={{ title: 'Servicios' }} />
                    <Stack.Screen name="map" options={{ headerShown: false }} />
                    <Stack.Screen name="messages" options={{ headerShown: false }} />
                    <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="search" options={{ headerShown: false }} />
                    <Stack.Screen name="settings" options={{ headerShown: false }} />
                    <Stack.Screen name="create-event" options={{ headerShown: false }} />
                    <Stack.Screen name="create-tribe" options={{ headerShown: false }} />
                    <Stack.Screen name="notifications" options={{ headerShown: false }} />
                    <Stack.Screen name="stories/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="new-chat" options={{ headerShown: false }} />
                    <Stack.Screen name="services-detail" options={{ headerShown: false }} />
                    <Stack.Screen name="qr-scanner" options={{ headerShown: false }} />
                    <Stack.Screen name="passport" options={{ headerShown: false }} />
                    <Stack.Screen name="legal/[document]" options={{ headerShown: false }} />
                  </Stack>
                  <SessionGuard />
                  <AppStatusBar />
                </NotificationsProvider>
              </FabSheetProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
        </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
