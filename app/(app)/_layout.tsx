import { Redirect, Tabs, useSegments } from 'expo-router';
import { View } from 'react-native';
import { TabBar } from '@/components/layout/TabBar';
import { Spinner } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';

function shouldHideTabBar(segments: string[]): boolean {
  return segments.some((segment) => segment === '[id]' || segment === 'consultation');
}

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const segments = useSegments();
  const hideTabBar = shouldHideTabBar(segments as string[]);

  if (!hasHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Spinner size="lg" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      initialRouteName="dashboard/index"
      tabBar={(props) => (hideTabBar ? null : <TabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        tabBarStyle: hideTabBar ? { display: 'none' } : undefined,
      }}
    >
      <Tabs.Screen name="dashboard/index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="appointments/index" options={{ title: 'Appointments' }} />
      <Tabs.Screen name="users/index" options={{ title: 'Users' }} />
      <Tabs.Screen name="audit/index" options={{ title: 'Audit' }} />
      <Tabs.Screen name="patients/index" options={{ title: 'Patients' }} />
      <Tabs.Screen name="ai/index" options={{ title: 'AI' }} />
      <Tabs.Screen name="documents/index" options={{ title: 'Documents' }} />
      <Tabs.Screen name="profile/index" options={{ title: 'Profile' }} />
      <Tabs.Screen name="admin/audit-logs" options={{ href: null }} />
      <Tabs.Screen name="ai-assistant/index" options={{ href: null }} />
      <Tabs.Screen name="ai-outputs/index" options={{ href: null }} />
      <Tabs.Screen name="ai-outputs/[appointmentId]" options={{ href: null }} />
      <Tabs.Screen name="patients/[id]" options={{ href: null }} />
      <Tabs.Screen name="appointments/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="appointments/[id]/consultation" options={{ href: null }} />
    </Tabs>
  );
}
