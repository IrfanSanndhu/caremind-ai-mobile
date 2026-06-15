import { Text, View } from 'react-native';
import {
  VideoTrack,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { VideoOff } from 'lucide-react-native';
import { Spinner } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { resolveParticipantLabel } from './consultation-participants';
import type { ParticipantLabelMap } from './consultation-participants';

interface ConsultationVideoTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  labels: ParticipantLabelMap;
  variant: 'main' | 'pip';
  width: number;
  height: number;
  zOrder?: number;
  mirror?: boolean;
}

export function ConsultationVideoTile({
  trackRef,
  labels,
  variant,
  width,
  height,
  zOrder = 1,
  mirror = false,
}: ConsultationVideoTileProps) {
  const { participant } = trackRef;
  const displayName = resolveParticipantLabel(
    participant.identity,
    participant.name,
    labels,
  );
  const isMain = variant === 'main';

  const trackReference =
    isTrackReference(trackRef) && trackRef.publication ? trackRef : null;
  const publication = trackReference?.publication;
  const cameraOn = Boolean(publication && !publication.isMuted);
  const hasVideo = Boolean(publication?.track && !publication.isMuted);

  return (
    <View
      style={{ width, height }}
      pointerEvents="none"
      collapsable={false}
      className={cn(
        'overflow-hidden bg-slate-950',
        !isMain && 'rounded-2xl border border-white/10',
      )}
    >
      {hasVideo && trackReference ? (
        <VideoTrack
          trackRef={trackReference}
          style={{ width, height }}
          objectFit={isMain ? 'contain' : 'cover'}
          zOrder={zOrder}
          mirror={mirror}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-slate-800">
          {isMain && cameraOn ? (
            <>
              <Spinner size="sm" color={colors.white} />
              <Text className="mt-2 text-xs text-white/60">Starting video…</Text>
            </>
          ) : (
            <>
              <Avatar name={displayName} size={isMain ? 'lg' : 'sm'} />
              {isMain ? (
                <Text className="mt-2 px-2 text-center text-sm font-inter-medium text-white/90">
                  {displayName}
                </Text>
              ) : null}
              <View className="mt-2 flex-row items-center gap-1 rounded-full bg-black/40 px-2 py-0.5">
                <VideoOff size={isMain ? 14 : 12} color={colors.slate400} />
                <Text className="text-[10px] text-white/60">Camera off</Text>
              </View>
            </>
          )}
        </View>
      )}

      {isMain && hasVideo ? (
        <View
          className="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-1.5"
          pointerEvents="none"
          style={{ zIndex: 20, elevation: 20 }}
        >
          <Text className="text-sm font-inter-medium text-white">{displayName}</Text>
        </View>
      ) : null}
    </View>
  );
}
