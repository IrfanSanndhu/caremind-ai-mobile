import { create } from 'zustand';

interface KeyboardState {
  height: number;
  setKeyboardHeight: (height: number) => void;
}

export const useKeyboardStore = create<KeyboardState>((set) => ({
  height: 0,
  setKeyboardHeight: (height) => set({ height }),
}));
