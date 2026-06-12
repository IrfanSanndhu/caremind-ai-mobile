import { cn } from '@/utils/cn';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISMISS_THRESHOLD = 100;
const DISMISS_VELOCITY = 1.05;
const DISMISS_DURATION_MS = 240;
/** Ignore backdrop taps right after open (FAB / button press can bleed through). */
const BACKDROP_GUARD_MS = 400;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHandle?: boolean;
  enableDragToClose?: boolean;
  className?: string;
  contentClassName?: string;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  title,
  subtitle,
  showHandle = true,
  enableDragToClose = true,
  className,
  contentClassName,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();
  const dragY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  const isDismissingRef = useRef(false);
  const openedAtRef = useRef(0);
  onCloseRef.current = onClose;

  const finishDismiss = useCallback(() => {
    isDismissingRef.current = false;
    onCloseRef.current();
  }, []);

  const startDismiss = useCallback(
    (fromY?: number) => {
      if (isDismissingRef.current) return;
      isDismissingRef.current = true;

      if (fromY != null) {
        dragY.value = fromY;
      }

      const currentY = fromY ?? 0;
      const remaining = Math.max(screenHeight - currentY, 0);
      const duration = Math.min(
        DISMISS_DURATION_MS,
        Math.max(160, remaining * 0.45),
      );

      backdropOpacity.value = withTiming(0, { duration });
      dragY.value = withTiming(screenHeight, { duration }, (finished) => {
        if (finished) {
          runOnJS(finishDismiss)();
        }
      });
    },
    [backdropOpacity, dragY, finishDismiss, screenHeight],
  );

  const handleBackdropPress = useCallback(() => {
    if (Date.now() - openedAtRef.current < BACKDROP_GUARD_MS) return;
    startDismiss();
  }, [startDismiss]);

  useEffect(() => {
    if (visible) {
      openedAtRef.current = Date.now();
      isDismissingRef.current = false;
      dragY.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 180 });
    }
  }, [visible, dragY, backdropOpacity]);

  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          enableDragToClose && !isDismissingRef.current,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          enableDragToClose &&
          !isDismissingRef.current &&
          gesture.dy > 4 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          if (isDismissingRef.current) return;
          if (gesture.dy > 0) {
            dragY.value = gesture.dy;
            const progress = Math.min(gesture.dy / screenHeight, 1);
            backdropOpacity.value = 1 - progress * 0.85;
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          if (isDismissingRef.current) return;
          if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > DISMISS_VELOCITY) {
            startDismiss(gesture.dy);
            return;
          }
          dragY.value = withTiming(0, { duration: 160 });
          backdropOpacity.value = withTiming(1, { duration: 160 });
        },
        onPanResponderTerminate: () => {
          if (isDismissingRef.current) return;
          dragY.value = withTiming(0, { duration: 160 });
          backdropOpacity.value = withTiming(1, { duration: 160 });
        },
      }),
    [backdropOpacity, dragY, enableDragToClose, screenHeight, startDismiss],
  );

  const maxSheetHeight = screenHeight * 0.92 - insets.top;

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => startDismiss()}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.container} pointerEvents="box-none">
          <Pressable
            style={styles.backdrop}
            onPress={handleBackdropPress}
            accessibilityLabel="Close sheet"
          >
            <Animated.View
              style={[StyleSheet.absoluteFillObject, backdropStyle]}
              className="bg-slate-900/50"
            />
          </Pressable>

          <Animated.View
            style={[styles.sheet, sheetStyle, { maxHeight: maxSheetHeight }]}
            className={cn(
              'rounded-t-[20px] border border-border bg-white shadow-2xl',
              className,
            )}
            collapsable={false}
          >
            {enableDragToClose ? (
              <View
                {...handlePanResponder.panHandlers}
                className="items-center px-5 pt-3"
                accessibilityLabel="Swipe down to close"
              >
                {showHandle ? (
                  <View className="mb-2 h-1.5 w-12 rounded-full bg-slate-300" />
                ) : null}
                {(title || subtitle) && (
                  <View className={cn('w-full', showHandle ? 'pb-3' : 'py-2')}>
                    {title ? (
                      <Text className="text-lg font-inter-semibold text-slate-900">{title}</Text>
                    ) : null}
                    {subtitle ? (
                      <Text className="mt-1 text-sm text-muted">{subtitle}</Text>
                    ) : null}
                  </View>
                )}
                {(title || subtitle) && <View className="w-full border-b border-border" />}
              </View>
            ) : (
              <>
                {showHandle ? (
                  <View className="items-center py-4">
                    <View className="h-1.5 w-12 rounded-full bg-slate-300" />
                  </View>
                ) : null}
                {(title || subtitle) && (
                  <View
                    className={cn(
                      'border-b border-border px-5 pb-4',
                      showHandle ? 'pt-0' : 'pt-4',
                    )}
                  >
                    {title ? (
                      <Text className="text-lg font-inter-semibold text-slate-900">{title}</Text>
                    ) : null}
                    {subtitle ? (
                      <Text className="mt-1 text-sm text-muted">{subtitle}</Text>
                    ) : null}
                  </View>
                )}
              </>
            )}

            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
              contentContainerClassName={cn('px-5 pt-2', contentClassName)}
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 16) + keyboardHeight,
              }}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  sheet: {
    width: '100%',
    zIndex: 1,
    elevation: 24,
    flexDirection: 'column',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
});
