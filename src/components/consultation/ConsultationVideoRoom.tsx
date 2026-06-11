import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  VideoTrack,
  isTrackReference,
  useParticipants,
  useTracks,
  type TrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import {
  ChevronRight,
  Circle,
  FileText,
  PanelRightOpen,
  Users,
} from 'lucide-react-native';
import type { Appointment } from '@/types';
import { consultationsApi, consultationKeys } from '@/api/consultations.api';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useConsultationSessionStore } from '@/stores/consultation-session.store';
import { cn } from '@/utils/cn';
import { buildParticipantLabels, getCallTitle, resolveParticipantLabel } from './consultation-participants';
import { ConsultationCallControls } from './ConsultationCallControls';
import { ConsultationDraggablePip } from './ConsultationDraggablePip';
import { ConsultationTranscriptPanel } from './ConsultationTranscriptPanel';

interface ConsultationVideoRoomProps {
  appointment: Appointment;
  isDoctor: boolean;
  onLeave: () => void;
}

export function ConsultationVideoRoom({
  appointment,
  isDoctor,
  onLeave,
}: ConsultationVideoRoomProps) {
  const { show: showToast } = useToast();
  const sidePanelOpen = useConsultationSessionStore((s) => s.sidePanelOpen);
  const isRecording = useConsultationSessionStore((s) => s.isRecording);
  const liveTranscriptText = useConsultationSessionStore((s) => s.liveTranscriptText);
  const toggleSidePanel = useConsultationSessionStore((s) => s.toggleSidePanel);
  const setRecording = useConsultationSessionStore((s) => s.setRecording);

  const labels = useMemo(() => buildParticipantLabels(appointment), [appointment]);
  const callTitle = getCallTitle(appointment);

  const participants = useParticipants();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const cameraTracks = tracks.filter(isTrackReference).filter((t) => t.source === Track.Source.Camera);
  const localTrack = cameraTracks.find((t) => t.participant.isLocal) as TrackReference | undefined;
  const remoteTrack = cameraTracks.find((t) => !t.participant.isLocal) as TrackReference | undefined;
  const remoteCount = participants.filter((p) => !p.isLocal).length;

  const { data: transcript } = useQuery({
    queryKey: consultationKeys.transcript(appointment.id),
    queryFn: () => consultationsApi.getTranscript(appointment.id),
    refetchInterval: isRecording ? 1500 : 10000,
    retry: false,
  });

  const startRecordingMutation = useMutation({
    mutationFn: () => consultationsApi.startRecording(appointment.id),
    onSuccess: (data) => {
      setRecording(data.id);
      showToast({ title: 'Live transcription started', variant: 'success' });
    },
    onError: () => showToast({ title: 'Failed to start recording', variant: 'error' }),
  });

  const stopRecordingMutation = useMutation({
    mutationFn: () => consultationsApi.stopRecording(appointment.id),
    onSuccess: () => {
      setRecording(null);
      showToast({ title: 'Recording stopped', variant: 'success' });
    },
    onError: () => showToast({ title: 'Failed to stop recording', variant: 'error' }),
  });

  const recordingLoading =
    startRecordingMutation.isPending || stopRecordingMutation.isPending;

  const displayContent =
    isRecording && liveTranscriptText
      ? liveTranscriptText
      : transcript?.content ?? (isRecording ? liveTranscriptText : '');
  const displaySegments = isRecording ? undefined : transcript?.segments;
  const isLive = isRecording || transcript?.isLive;
  const hasTranscript = Boolean(displayContent?.trim());

  const remoteLabel = remoteTrack
    ? resolveParticipantLabel(
        remoteTrack.participant.identity,
        remoteTrack.participant.name,
        labels,
      )
    : null;

  return (
    <View className="flex-1 bg-slate-950">
      <View className="z-20 flex-row items-center justify-between border-b border-white/5 bg-slate-950/90 px-4 py-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-inter-semibold uppercase tracking-widest text-primary-100">
            CareMind
          </Text>
          <Text className="text-sm font-inter-medium text-white" numberOfLines={1}>
            {callTitle}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {isDoctor ? (
            <Button
              variant={isRecording ? 'danger' : 'outline'}
              size="sm"
              loading={recordingLoading}
              onPress={() =>
                isRecording
                  ? stopRecordingMutation.mutate()
                  : startRecordingMutation.mutate()
              }
              className={cn(!isRecording && 'border-white/15 bg-white/5')}
              textClassName={!isRecording ? 'text-white' : undefined}
              leftIcon={
                <Circle
                  size={10}
                  color={isRecording ? colors.white : colors.white}
                  fill={isRecording ? colors.white : 'transparent'}
                />
              }
            >
              {isRecording ? 'Stop' : 'Record'}
            </Button>
          ) : null}
          <Pressable
            onPress={toggleSidePanel}
            className={cn(
              'flex-row items-center gap-1.5 rounded-xl px-3 py-2',
              sidePanelOpen ? 'bg-primary' : 'bg-white/5',
            )}
          >
            {sidePanelOpen ? (
              <ChevronRight size={16} color={colors.white} />
            ) : (
              <PanelRightOpen size={16} color={colors.white} />
            )}
            <FileText size={16} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <View className="relative min-h-0 flex-1 flex-row">
        <View className="relative min-h-0 flex-1 bg-slate-950">
          {remoteCount > 0 ? (
            <View className="absolute left-4 top-4 z-10">
              <View className="flex-row items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1">
                <View className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <Text className="text-xs font-inter-medium text-white/90">
                  {remoteCount} in call
                </Text>
              </View>
            </View>
          ) : null}

          {remoteTrack ? (
            <View className="absolute inset-0">
              <VideoTrack trackRef={remoteTrack} style={{ width: '100%', height: '100%' }} />
              {remoteLabel ? (
                <View className="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-1.5">
                  <Text className="text-sm font-inter-medium text-white">{remoteLabel}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center gap-4 px-6">
              <View className="h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Users size={36} color="rgba(255,255,255,0.3)" />
              </View>
              <View className="items-center">
                <Text className="text-lg font-inter-medium text-white/90">Waiting to connect</Text>
                <Text className="mt-1 max-w-xs text-center text-sm text-white/50">
                  The other participant will appear here when they join the call.
                </Text>
              </View>
            </View>
          )}

          {localTrack ? (
            <ConsultationDraggablePip>
              <VideoTrack trackRef={localTrack} style={{ width: '100%', height: '100%' }} />
            </ConsultationDraggablePip>
          ) : null}
        </View>

        {sidePanelOpen ? (
          <View className="w-[85%] max-w-sm border-l border-white/10 bg-slate-950/95">
            <View className="flex-row items-center justify-between border-b border-slate-700 p-4">
              <Text className="text-base font-inter-semibold text-white">Transcript</Text>
              <Pressable onPress={toggleSidePanel} accessibilityLabel="Close side panel">
                <ChevronRight size={20} color={colors.slate400} />
              </Pressable>
            </View>
            <View className="flex-1 p-4">
              {hasTranscript ? (
                <ConsultationTranscriptPanel
                  content={displayContent}
                  segments={displaySegments}
                  isLive={isLive}
                  variant="dark"
                />
              ) : (
                <View className="items-center py-8">
                  <FileText size={28} color={colors.slate500} />
                  <Text className="mt-3 text-center text-sm text-slate-400">
                    {isRecording
                      ? 'Listening… speech will appear here.'
                      : 'Start recording to see a live transcript, or open this panel after the visit is processed.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}
      </View>

      <ConsultationCallControls onLeave={onLeave} />
    </View>
  );
}
