import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorage } from '@/lib/secure-storage';

interface UIState {
  theme: 'light' | 'dark';
  showOfflineBanner: boolean;
}

interface UIActions {
  setTheme: (theme: 'light' | 'dark') => void;
  setShowOfflineBanner: (show: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      theme: 'light',
      showOfflineBanner: false,
      setTheme: (theme) => set({ theme }),
      setShowOfflineBanner: (show) => set({ showOfflineBanner: show }),
    }),
    {
      name: 'caremind_ui',
      storage: createJSONStorage(() => asyncStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
