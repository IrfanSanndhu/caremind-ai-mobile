import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useLocalParticipant,
  useParticipants,
  useRemoteParticipants,
  useTracks,
} from '@livekit/react-native';
import { LocalVideoTrack, Track } from 'livekit-client';
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
import { buildParticipantLabels, getCallTitle } from './consultation-participants';
import { findLocalCameraTrack, findRemoteCameraTrack } from './consultation-camera-tracks';
import { ConsultationCallControls } from './ConsultationCallControls';
import { ConsultationDraggablePip, PIP_HEIGHT, PIP_WIDTH } from './ConsultationDraggablePip';
import { ConsultationTranscriptPanel } from './ConsultationTranscriptPanel';
import { ConsultationVideoTile } from './ConsultationVideoTile';
import { RemoteTrackSubscriber } from './RemoteTrackSubscriber';

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
  const insets = useSafeAreaInsets();
  const { show: showToast } = useToast();
  const sidePanelOpen = useConsultationSessionStore((s) => s.sidePanelOpen);
  const isRecording = useConsultationSessionStore((s) => s.isRecording);
  const liveTranscriptText = useConsultationSessionStore((s) => s.liveTranscriptText);
  const toggleSidePanel = useConsultationSessionStore((s) => s.toggleSidePanel);
  const setRecording = useConsultationSessionStore((s) => s.setRecording);

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const labels = useMemo(() => buildParticipantLabels(appointment), [appointment]);
  const callTitle = getCallTitle(appointment);

  const { localParticipant, isCameraEnabled } = useLocalParticipant();

  const handleSwitchCamera = useCallback(async () => {
    const publication = localParticipant?.getTrackPublication(Track.Source.Camera);
    const track = publication?.track;
    if (!(track instanceof LocalVideoTrack)) return;
    const nextFacing = isFrontCamera ? 'environment' : 'user';
    try {
      await track.restartTrack({ facingMode: nextFacing });
      setIsFrontCamera((prev) => !prev);
    } catch {
      // Device may only have one camera — ignore.
    }
  }, [localParticipant, isFrontCamera]);
  const participants = useParticipants();
  const remoteParticipants = useRemoteParticipants();
  const primaryRemote = remoteParticipants[0];

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const localCameraTrack = findLocalCameraTrack(tracks, localParticipant);
  const remoteCameraTrack = findRemoteCameraTrack(tracks);
  const participantCount = participants.length;
  const stageReady = stageSize.width > 0 && stageSize.height > 0;

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setStageSize({ width, height });
    }
  };

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
    onError: () => showToast({ title: 'Failed to stop recording', variant: 'error' }),
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

  return (
    <View className="flex-1 bg-slate-950">
      <RemoteTrackSubscriber />

      <View
        className="z-20 flex-row items-center justify-between border-b border-white/5 bg-slate-950/90 px-4 py-3"
        style={{ paddingTop: insets.top + 12 }}
      >
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
                  color={colors.white}
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
        <View
          className="relative min-h-0 flex-1"
          collapsable={false}
          onLayout={onStageLayout}
        >
          {participantCount > 0 ? (
            <View
              className="absolute left-4 top-4 z-30"
              pointerEvents="none"
              style={{ elevation: 30 }}
            >
              <View className="flex-row items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1">
                <View className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <Text className="text-xs font-inter-medium text-white/90">
                  {participantCount} in call
                </Text>
              </View>
            </View>
          ) : null}

          {primaryRemote && stageReady && remoteCameraTrack ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: stageSize.width,
                height: stageSize.height,
              }}
              pointerEvents="none"
              collapsable={false}
            >
              <ConsultationVideoTile
                trackRef={remoteCameraTrack}
                labels={labels}
                variant="main"
                width={stageSize.width}
                height={stageSize.height}
                zOrder={0}
              />
            </View>
          ) : primaryRemote && !stageReady ? null : (
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

          {localCameraTrack ? (
            <ConsultationDraggablePip
              showSwitchCamera={isCameraEnabled}
              onSwitchCamera={handleSwitchCamera}
            >
              <ConsultationVideoTile
                trackRef={localCameraTrack}
                labels={labels}
                variant="pip"
                width={PIP_WIDTH}
                height={PIP_HEIGHT}
                zOrder={1}
                mirror={isFrontCamera}
              />
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

      <ConsultationCallControls onLeave={onLeave} bottomInset={insets.bottom} />
    </View>
  );
}
