import { useEffect } from 'react';
import { useRoomContext } from '@livekit/react-native';
import {
  ParticipantEvent,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client';

function requestVideoSubscription(publication: RemoteTrackPublication) {
  if (publication.kind !== Track.Kind.Video) return;
  if (publication.isSubscribed && publication.track) return;
  publication.setSubscribed(true);
}

/**
 * Safety net for autoSubscribe: explicitly request a subscription when a remote
 * participant publishes (or unmutes) their camera after we've already joined.
 *
 * The real fix for late web→mobile video lives in the room option
 * `singlePeerConnection: false` (see app/consultation/[id].tsx); this just makes
 * sure the publication is marked as desired in every code path.
 */
export function RemoteTrackSubscriber() {
  const room = useRoomContext();

  useEffect(() => {
    const onPublication = (publication: RemoteTrackPublication) => {
      requestVideoSubscription(publication);
    };

    const attachParticipant = (participant: RemoteParticipant) => {
      participant.trackPublications.forEach((publication) => {
        requestVideoSubscription(publication as RemoteTrackPublication);
      });
      participant.on(ParticipantEvent.TrackPublished, onPublication);
      participant.on(ParticipantEvent.TrackUnmuted, onPublication);
    };

    const detachParticipant = (participant: RemoteParticipant) => {
      participant.off(ParticipantEvent.TrackPublished, onPublication);
      participant.off(ParticipantEvent.TrackUnmuted, onPublication);
    };

    room.remoteParticipants.forEach(attachParticipant);
    room.on(RoomEvent.ParticipantConnected, attachParticipant);
    room.on(RoomEvent.ParticipantDisconnected, detachParticipant);

    return () => {
      room.off(RoomEvent.ParticipantConnected, attachParticipant);
      room.off(RoomEvent.ParticipantDisconnected, detachParticipant);
      room.remoteParticipants.forEach(detachParticipant);
    };
  }, [room]);

  return null;
}
