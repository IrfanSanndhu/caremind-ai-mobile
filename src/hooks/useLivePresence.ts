import { useQuery } from '@tanstack/react-query';
import { consultationsApi, consultationKeys } from '@/api/consultations.api';

const LIVE_PRESENCE_POLL_MS = 10_000;

export function useLivePresence() {
  return useQuery({
    queryKey: consultationKeys.livePresence(),
    queryFn: consultationsApi.getLivePresence,
    refetchInterval: LIVE_PRESENCE_POLL_MS,
    staleTime: LIVE_PRESENCE_POLL_MS / 2,
  });
}
