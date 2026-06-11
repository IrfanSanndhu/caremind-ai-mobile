import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return useCallback(() => {
    logout();
    router.replace('/(auth)/login');
  }, [logout, router]);
}
