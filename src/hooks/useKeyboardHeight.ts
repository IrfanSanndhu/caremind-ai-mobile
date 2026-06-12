import { useKeyboardStore } from '@/stores/keyboard.store';

/** Current keyboard height in px (0 when closed). Updated globally by KeyboardProvider. */
export function useKeyboardHeight(): number {
  return useKeyboardStore((s) => s.height);
}
