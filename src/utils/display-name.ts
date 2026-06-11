import type { User } from '@/types';

/** Display name for UI (topbar, avatar, profile). Falls back to email. */
export function getUserDisplayName(
  user: Pick<User, 'name' | 'firstName' | 'lastName' | 'email'> | null | undefined,
): string {
  if (!user) return '';
  if (user.name?.trim()) return user.name.trim();
  const parts = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  return user.email;
}
