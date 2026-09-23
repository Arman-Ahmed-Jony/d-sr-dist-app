import 'react-native-gesture-handler';
import '@/src/i18n';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/tokens';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    const inAuth = segments[0] === '(auth)';

    if (!firebaseUser || !profile) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (inAuth) {
      if (profile.role === 'distributor') {
        router.replace('/(distributor)/(app)/dashboard');
      } else {
        router.replace('/(sr)/(app)/dashboard');
      }
      return;
    }

    if (profile.role === 'sr' && segments[0] === '(distributor)') {
      router.replace('/(sr)/(app)/dashboard');
    }
    if (profile.role === 'distributor' && segments[0] === '(sr)') {
      router.replace('/(distributor)/(app)/dashboard');
    }
  }, [firebaseUser, profile, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(sr)" options={{ headerShown: false }} />
            <Stack.Screen name="(distributor)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = {
  root: {
    flex: 1,
    width: '100%' as const,
    maxWidth: '100%' as const,
    overflow: 'hidden' as const,
  },
};
