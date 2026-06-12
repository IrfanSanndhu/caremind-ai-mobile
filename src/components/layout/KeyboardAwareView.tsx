import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cn } from '@/utils/cn';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

export interface KeyboardAwareViewProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lifts children above the software keyboard (WhatsApp-style).
 * Use on screen roots; modals/sheets handle keyboard insets separately.
 */
export function KeyboardAwareView({ children, className, style }: KeyboardAwareViewProps) {
  const keyboardHeight = useKeyboardHeight();

  return (
    <View className={cn('flex-1', className)} style={[style, { paddingBottom: keyboardHeight }]}>
      {children}
    </View>
  );
}
