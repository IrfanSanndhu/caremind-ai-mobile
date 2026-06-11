import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  className?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  className,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      className={cn('bg-card border-b border-border', className)}
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center min-h-[56px] px-4 py-2">
        <View className="w-11 items-start justify-center">
          {showBack ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-button active:bg-surface"
            >
              <ChevronLeft size={24} color={colors.slate700} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 items-center px-2">
          <Text
            className="text-lg font-inter-semibold text-slate-900 text-center"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-muted text-center mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="w-11 items-end justify-center">{rightAction ?? null}</View>
      </View>
    </View>
  );
}
