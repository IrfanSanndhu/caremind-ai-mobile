import { exposeTokenForSSE } from '@/api/ai.api';
import { useConsultationSessionStore } from '@/stores/consultation-session.store';
import { queryClient } from './query-client';
import { clearTokens } from './secure-storage';

export const AUTH_STORAGE_KEY = 'caremind_auth';

export function clearReactQueryCache(): void {
  void queryClient.cancelQueries();
  queryClient.clear();
}

export async function clearPersistedAuth(): Promise<void> {
  try {
    await clearTokens();
  } catch {
    /* secure store unavailable */
  }
}

export function resetInMemorySessionState(): void {
  exposeTokenForSSE('');
  useConsultationSessionStore.getState().endSession();
}

export async function resetClientSession(): Promise<void> {
  clearReactQueryCache();
  resetInMemorySessionState();
  await clearPersistedAuth();
}
