import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import type { Participant } from 'livekit-client';
import { Track } from 'livekit-client';

export function findLocalCameraTrack(
  tracks: TrackReferenceOrPlaceholder[],
  localParticipant: Participant | undefined,
): TrackReferenceOrPlaceholder | undefined {
  const fromTracks = tracks.find((t) => t.source === Track.Source.Camera && t.participant.isLocal);
  if (fromTracks) return fromTracks;

  if (!localParticipant) return undefined;

  return {
    participant: localParticipant,
    source: Track.Source.Camera,
  };
}

export function findRemoteCameraTrack(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder | undefined {
  return tracks.find((t) => t.source === Track.Source.Camera && !t.participant.isLocal);
}
