import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Activity } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  useEffect(() => {
    const hydrationFallback = setTimeout(() => {
      if (!useAuthStore.getState()._hasHydrated) {
        setHasHydrated(true);
      }
    }, 1500);

    return () => clearTimeout(hydrationFallback);
  }, [setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(app)/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [hasHydrated, isAuthenticated, router]);

  return (
    <LinearGradient
      colors={[colors.primary[700], colors.primary.DEFAULT, colors.secondary.DEFAULT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.logoWrap}>
          <Activity size={40} color={colors.white} strokeWidth={2.25} />
        </View>
        <Text style={styles.title}>CareMind AI</Text>
        <Text style={styles.subtitle}>Smarter care, powered by AI</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
});
