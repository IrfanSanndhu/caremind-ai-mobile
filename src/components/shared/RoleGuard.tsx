import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function RoleGuard({
  allowedRoles,
  children,
  redirectTo = '/(app)/dashboard',
}: RoleGuardProps) {
  const role = useAuthStore((s) => s.role);

  if (!role || !allowedRoles.includes(role)) {
    return <Redirect href={redirectTo} />;
  }

  return <>{children}</>;
}
