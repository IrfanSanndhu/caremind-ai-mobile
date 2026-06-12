import { cn } from '@/utils/cn';
import { X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
  type ModalProps as RNModalProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  presentation?: RNModalProps['presentationStyle'];
}

export function Modal({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  className,
  contentClassName,
  presentation = 'overFullScreen',
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle={presentation}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-slate-900/45"
          onPress={onClose}
          accessibilityLabel="Close modal"
        />

        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) + keyboardHeight }}
          className={cn(
            'max-h-[92%] rounded-t-[20px] border border-border bg-white',
            className,
          )}
        >
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          {(title || showCloseButton) && (
            <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
              <Text className="flex-1 text-lg font-inter-semibold text-slate-900">
                {title ?? ''}
              </Text>
              {showCloseButton ? (
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  className="h-8 w-8 items-center justify-center rounded-full bg-surface"
                >
                  <X size={18} color={colors.slate700} />
                </Pressable>
              ) : null}
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerClassName={cn('px-5 py-4', contentClassName)}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}
