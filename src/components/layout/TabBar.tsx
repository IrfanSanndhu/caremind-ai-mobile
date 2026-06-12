import { Platform, Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  BrainCircuit,
  Calendar,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole, type UserRole as UserRoleType } from '@/types';

export const TAB_BAR_HEIGHT = 64;
/** Small inset at the end of scrollable tab content (tab bar already reserves layout space). */
export const SCROLL_BOTTOM_INSET = 16;

interface TabDefinition {
  name: string;
  label: string;
  roles: UserRoleType[];
  Icon: LucideIcon;
}

/** Expo Router route names for tab screens (folder/index.tsx → "folder/index"). */
const TAB_DEFINITIONS: TabDefinition[] = [
  {
    name: 'dashboard/index',
    label: 'Dashboard',
    roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT],
    Icon: LayoutDashboard,
  },
  {
    name: 'appointments/index',
    label: 'Appointments',
    roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT],
    Icon: Calendar,
  },
  {
    name: 'booking/index',
    label: 'Book',
    roles: [UserRole.DOCTOR, UserRole.PATIENT],
    Icon: CalendarCheck,
  },
  {
    name: 'users/index',
    label: 'Users',
    roles: [UserRole.ADMIN],
    Icon: Users,
  },
  {
    name: 'audit/index',
    label: 'Audit',
    roles: [UserRole.ADMIN],
    Icon: ScrollText,
  },
  {
    name: 'patients/index',
    label: 'Patients',
    roles: [UserRole.DOCTOR],
    Icon: Users,
  },
  {
    name: 'ai/index',
    label: 'AI',
    roles: [UserRole.DOCTOR, UserRole.PATIENT],
    Icon: BrainCircuit,
  },
  {
    name: 'documents/index',
    label: 'Documents',
    roles: [UserRole.PATIENT],
    Icon: FileText,
  },
];

function getVisibleTabs(role: UserRoleType | null): TabDefinition[] {
  const resolvedRole = role ?? UserRole.PATIENT;
  return TAB_DEFINITIONS.filter((tab) => tab.roles.includes(resolvedRole));
}

function findTabRoute(
  routes: BottomTabBarProps['state']['routes'],
  tabRouteName: string,
) {
  const shortName = tabRouteName.replace(/\/index$/, '');
  return routes.find(
    (route) =>
      route.name === tabRouteName ||
      route.name === shortName ||
      route.name === `${shortName}/index`,
  );
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((s) => s.role);
  const visibleTabs = getVisibleTabs(role);

  return (
    <View
      style={{
        paddingBottom: insets.bottom,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        ...Platform.select({
          ios: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
          android: {
            elevation: 16,
          },
        }),
      }}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={60}
          tint="light"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}

      <View
        className="flex-row items-stretch"
        style={{ height: TAB_BAR_HEIGHT }}
      >
        {visibleTabs.map((tab) => {
          const route = findTabRoute(state.routes, tab.name);
          if (!route) return null;

          const routeIndex = state.routes.findIndex((item) => item.key === route.key);
          const isFocused = state.index === routeIndex;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? tab.label);

          const iconColor = isFocused ? colors.primary.DEFAULT : colors.slate400;
          const { Icon } = tab;

          const onPress = () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
              className="flex-1 items-center justify-center gap-0.5 active:opacity-80"
            >
              <View
                className="items-center justify-center rounded-xl px-3 py-1"
                style={isFocused ? { backgroundColor: colors.primary[50] } : undefined}
              >
                <Icon
                  size={22}
                  color={iconColor}
                  strokeWidth={isFocused ? 2.25 : 1.75}
                  fill={isFocused ? iconColor : 'transparent'}
                />
              </View>
              <Text
                className="text-[10px] font-inter-semibold"
                style={{ color: iconColor }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
