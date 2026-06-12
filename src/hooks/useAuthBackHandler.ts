import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

type AuthBackHandler = () => boolean;

/** Handles Android hardware back on auth screens with predictable, shallow navigation. */
export function useAuthBackHandler(handler: AuthBackHandler) {
  const router = useRouter();

  useEffect(() => {
    const onBack = () => handler();

    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [handler, router]);
}

export function exitAppOnBack(): boolean {
  BackHandler.exitApp();
  return true;
}

export function goToLoginOnBack(router: ReturnType<typeof useRouter>): boolean {
  router.replace('/(auth)/login');
  return true;
}
