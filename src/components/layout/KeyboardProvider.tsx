import { useEffect, type ReactNode } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import { useKeyboardStore } from '@/stores/keyboard.store';

function resolveKeyboardHeight(screenY: number, reportedHeight: number): number {
  if (Platform.OS === 'android') {
    return Math.max(0, Dimensions.get('window').height - screenY);
  }
  return Math.max(0, reportedHeight);
}

/** Mount once at app root — tracks keyboard height for the whole app. */
export function KeyboardProvider({ children }: { children: ReactNode }) {
  const setKeyboardHeight = useKeyboardStore((s) => s.setKeyboardHeight);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(
        resolveKeyboardHeight(event.endCoordinates.screenY, event.endCoordinates.height),
      );
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      setKeyboardHeight(0);
    };
  }, [setKeyboardHeight]);

  return <>{children}</>;
}
