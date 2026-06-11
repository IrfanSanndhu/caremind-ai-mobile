import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { apiClient } from '@/api/client';
import { exposeTokenForSSE } from '@/api/ai.api';
import {
  clearPersistedAuth,
  clearReactQueryCache,
  resetInMemorySessionState,
} from '@/lib/session';
import { secureAuthStorage, setTokens as persistTokens, clearTokens } from '@/lib/secure-storage';
import { useConsultationSessionStore } from './consultation-session.store';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  orgId: string | null;
  _hasHydrated: boolean;
}

interface AuthActions {
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (value: boolean) => void;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  role: null,
  orgId: null,
  _hasHydrated: false,
};

function wipeClientDataForUserSwitch(): void {
  clearReactQueryCache();
  useConsultationSessionStore.getState().endSession();
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      login: (user, accessToken, refreshToken) => {
        wipeClientDataForUserSwitch();
        void persistTokens(accessToken, refreshToken);
        exposeTokenForSSE(accessToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          role: user.role,
          orgId: user.orgId,
        });
      },

      logout: () => {
        void apiClient.post('/api/auth/logout').catch(() => {});
        wipeClientDataForUserSwitch();
        resetInMemorySessionState();
        void clearTokens();
        set({ ...initialState, _hasHydrated: true });
        void useAuthStore.persist.clearStorage();
      },

      setTokens: (accessToken, refreshToken) => {
        void persistTokens(accessToken, refreshToken);
        exposeTokenForSSE(accessToken);
        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        wipeClientDataForUserSwitch();
        resetInMemorySessionState();
        void clearTokens();
        set({ ...initialState, _hasHydrated: true });
        void useAuthStore.persist.clearStorage();
      },

      setUser: (user) => {
        set({ user, role: user.role, orgId: user.orgId });
      },

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'caremind_auth',
      storage: createJSONStorage(() => secureAuthStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        role: state.role,
        orgId: state.orgId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Auth rehydration failed:', error);
        }
        if (state?.accessToken) {
          exposeTokenForSSE(state.accessToken);
        }
        useAuthStore.getState().setHasHydrated(true);
      },
    },
  ),
);

export function getAuthStoreSnapshot() {
  return useAuthStore.getState();
}
