import '../global.css';

import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setAuthStoreGetter } from '@/api/client';
import { ToastProvider } from '@/components/ui';
import { useHydrateAuthProfile } from '@/hooks/useAuthProfile';
import { setUnauthorizedHandler } from '@/lib/navigation';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

SplashScreen.preventAutoHideAsync().catch(() => {});

let livekitReady = false;
if (!livekitReady) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerGlobals } = require('@livekit/react-native') as {
      registerGlobals: () => void;
    };
    registerGlobals();
    livekitReady = true;
  } catch (error) {
    console.warn('LiveKit init skipped:', error);
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Something went wrong' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Root error boundary:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-surface px-6">
          <Text className="text-2xl font-inter-bold text-slate-900">Something went wrong</Text>
          <Text className="mt-2 text-center text-sm text-muted">{this.state.message}</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, message: '' })}
            className="mt-6 rounded-button bg-primary px-6 py-3"
          >
            <Text className="font-inter-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

function AuthBootstrap({ children }: { children: ReactNode }) {
  const router = useRouter();

  useHydrateAuthProfile();

  useEffect(() => {
    setAuthStoreGetter(() => {
      const state = useAuthStore.getState();
      return {
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        setTokens: state.setTokens,
        clearAuth: state.clearAuth,
      };
    });

    setUnauthorizedHandler(() => {
      router.replace('/(auth)/login');
    });
  }, [router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    let cancelled = false;

    const splashTimeout = setTimeout(() => {
      if (!cancelled) {
        setAppReady(true);
        void SplashScreen.hideAsync();
      }
    }, 2500);

    if (fontsLoaded || fontError) {
      clearTimeout(splashTimeout);
      if (!cancelled) {
        setAppReady(true);
        void SplashScreen.hideAsync();
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(splashTimeout);
    };
  }, [fontsLoaded, fontError]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RootErrorBoundary>
              <AuthBootstrap>
                <StatusBar style="light" translucent />
                <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(app)" />
                  <Stack.Screen name="consultation/[id]" options={{ presentation: 'fullScreenModal' }} />
                </Stack>
              </AuthBootstrap>
            </RootErrorBoundary>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
