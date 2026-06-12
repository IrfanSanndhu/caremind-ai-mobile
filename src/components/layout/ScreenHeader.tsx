import { useCallback, type ReactNode } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Used when there is no navigation history (e.g. deep link). */
  fallbackHref?: Href;
  rightAction?: ReactNode;
  className?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  fallbackHref,
  rightAction,
  className,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (fallbackHref) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, onBack, router]);

  useFocusEffect(
    useCallback(() => {
      if (!showBack) return;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });

      return () => subscription.remove();
    }, [handleBack, showBack]),
  );

  return (
    <View
      className={cn('border-b border-border bg-card', className)}
      style={{ paddingTop: insets.top }}
    >
      <View className="min-h-[56px] flex-row items-center gap-2 px-4 py-2">
        {showBack ? (
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            className="h-11 w-11 shrink-0 items-center justify-center rounded-button active:bg-surface"
          >
            <ChevronLeft size={24} color={colors.slate700} strokeWidth={2} />
          </Pressable>
        ) : null}

        <View className="min-w-0 flex-1 justify-center">
          <Text className="text-lg font-inter-semibold text-slate-900" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightAction ? (
          <View className="max-w-[42%] shrink-0 items-end justify-center">{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
}
