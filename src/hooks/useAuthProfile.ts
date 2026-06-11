import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi, authKeys } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export function useHydrateAuthProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const { data } = useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!data) return;
    const current = useAuthStore.getState().user;
    if (!current) return;
    setUser({
      ...current,
      ...data,
      email: data.email || current.email,
    });
  }, [data, setUser]);
}

export async function hydrateAuthProfileAfterLogin(): Promise<void> {
  try {
    const profile = await authApi.getMe();
    const current = useAuthStore.getState().user;
    if (current) {
      useAuthStore.getState().setUser({
        ...current,
        ...profile,
        email: profile.email || current.email,
      });
    }
  } catch {
    // Profile is optional for navigation
  }
}
