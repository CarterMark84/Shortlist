import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SetupScreen } from '@/components/SetupScreen';
import { isConfigured } from '@/lib/env';
import { useIsDark, useTheme } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

// Hold the splash screen until the stored session has been read, so the app
// never flashes the sign-in screen at an already-signed-in user.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const isDark = useIsDark();
  const colors = useTheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // Route on auth state. Kept in one effect rather than per-screen guards so
  // there is a single place that decides where an unauthenticated user goes.
  useEffect(() => {
    if (loading || !isConfigured) return;

    const onSignIn = segments[0] === 'sign-in';

    if (!session && !onSignIn) {
      router.replace('/sign-in');
    } else if (session && onSignIn) {
      router.replace('/');
    }
  }, [session, loading, segments, router]);

  if (!isConfigured) {
    return (
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SetupScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="results/[id]" options={{ title: 'Recommendations' }} />
      </Stack>
    </ThemeProvider>
  );
}
