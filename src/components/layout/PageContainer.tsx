import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/utils/cn';
import { SCROLL_BOTTOM_INSET } from './TabBar';

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  scrollEnabled?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  safeAreaTop?: boolean;
  bottomPadding?: number;
  showsVerticalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
}

export function PageContainer({
  children,
  className,
  contentClassName,
  scrollEnabled = true,
  refreshing = false,
  onRefresh,
  safeAreaTop = false,
  bottomPadding = SCROLL_BOTTOM_INSET,
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = 'handled',
}: PageContainerProps) {
  const insets = useSafeAreaInsets();
  const topInset = safeAreaTop ? insets.top : 0;

  if (!scrollEnabled) {
    return (
      <View
        className={cn('flex-1 bg-surface', className)}
        style={{ paddingTop: topInset, paddingBottom: bottomPadding }}
      >
        <View className={cn('flex-1', contentClassName)}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      className={cn('flex-1 bg-surface', className)}
      contentContainerClassName={cn('px-4 pt-4', contentClassName)}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingBottom: bottomPadding,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
