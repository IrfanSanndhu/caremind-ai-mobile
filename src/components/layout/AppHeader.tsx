import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types';
import { getUserDisplayName } from '@/utils/display-name';
import { getTimeGreeting } from '@/utils/greeting';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/layout/NotificationBell';

export interface AppHeaderProps {
  subtitle?: string;
  showProfileAction?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.DOCTOR]: 'Doctor',
  [UserRole.PATIENT]: 'Patient',
};

export function AppHeader({ subtitle, showProfileAction = true }: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  const displayName = getUserDisplayName(user) || user?.email?.split('@')[0] || 'CareMind User';
  const roleLabel = role ? ROLE_LABELS[role] : undefined;

  return (
    <LinearGradient
      colors={[colors.primary[700], colors.primary.DEFAULT, colors.primary[500]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-5">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-inter-medium text-white/75">{getTimeGreeting()}</Text>
            <Text className="mt-0.5 text-2xl font-inter-bold text-white" numberOfLines={1}>
              {displayName}
            </Text>
            {subtitle ? (
              <Text className="mt-1 text-sm text-white/80" numberOfLines={2}>
                {subtitle}
              </Text>
            ) : roleLabel ? (
              <Text className="mt-1 text-sm text-white/70">{roleLabel}</Text>
            ) : null}
          </View>

          <View className="flex-row items-center gap-2">
            <NotificationBell />
            {showProfileAction ? (
              <Pressable
                onPress={() => router.push('/(app)/profile')}
                accessibilityRole="button"
                accessibilityLabel="Open profile and settings"
                className="items-center active:opacity-85"
              >
                <View className="rounded-full border-2 border-white/40 p-0.5">
                  {user ? (
                    <Avatar name={displayName} size="md" />
                  ) : (
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <User size={20} color={colors.white} />
                    </View>
                  )}
                </View>
                {/* <Text className="mt-1 text-[10px] font-inter-medium text-white/80">Profile</Text> */}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
