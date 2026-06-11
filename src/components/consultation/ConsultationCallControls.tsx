import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  useLocalParticipant,
  useRoomContext,
} from '@livekit/react-native';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { useConsultationSessionStore } from '@/stores/consultation-session.store';

interface ConsultationCallControlsProps {
  onLeave: () => void;
}

export function ConsultationCallControls({ onLeave }: ConsultationCallControlsProps) {
  const room = useRoomContext();
  const { isMicrophoneEnabled, isCameraEnabled, localParticipant } = useLocalParticipant();
  const [busy, setBusy] = useState(false);

  const toggleMic = async () => {
    setBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } finally {
      setBusy(false);
    }
  };

  const toggleCamera = async () => {
    setBusy(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await room.disconnect();
      useConsultationSessionStore.getState().endSession();
      onLeave();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="px-4 pb-8 pt-3">
      <View
        className={cn(
          'mx-auto max-w-md flex-row items-center justify-center gap-3',
          'rounded-[2rem] border border-white/10 bg-slate-900/80 px-5 py-3.5',
        )}
      >
        <ControlButton
          label={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
          active={isMicrophoneEnabled}
          onPress={() => void toggleMic()}
          disabled={busy}
          icon={isMicrophoneEnabled ? Mic : MicOff}
        />
        <ControlButton
          label={isCameraEnabled ? 'Camera off' : 'Camera on'}
          active={isCameraEnabled}
          onPress={() => void toggleCamera()}
          disabled={busy}
          icon={isCameraEnabled ? Video : VideoOff}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave call"
          onPress={() => void handleLeave()}
          disabled={busy}
          className="ml-1 h-12 w-14 items-center justify-center rounded-2xl bg-danger active:opacity-90"
        >
          <PhoneOff size={22} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

function ControlButton({
  label,
  active,
  onPress,
  disabled,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  icon: typeof Mic;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'h-12 w-12 items-center justify-center rounded-2xl border',
        active
          ? 'border-white/15 bg-white/10'
          : 'border-danger/40 bg-danger/20',
        disabled && 'opacity-50',
      )}
    >
      <Icon size={22} color={colors.white} />
    </Pressable>
  );
}
