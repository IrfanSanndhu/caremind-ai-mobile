import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
} from '@livekit/react-native';
import { AlertTriangle } from 'lucide-react-native';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { consultationsApi, consultationKeys } from '@/api/consultations.api';
import { dashboardKeys } from '@/api/dashboard.api';
import { getApiErrorMessage } from '@/api/errors';
import { Button, Card, Spinner } from '@/components/ui';
import { ConsultationVideoRoom } from '@/components/consultation/ConsultationVideoRoom';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { useConsultationSessionStore } from '@/stores/consultation-session.store';
import { UserRole } from '@/types';

let globalsRegistered = false;

function ensureLiveKitGlobals() {
  if (!globalsRegistered) {
    registerGlobals();
    globalsRegistered = true;
  }
}

async function requestMediaPermissions(): Promise<boolean> {
  const audio = await Audio.requestPermissionsAsync();
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  return audio.status === 'granted' && camera.status === 'granted';
}

function ConsentGate({
  appointmentId,
  onAccepted,
  onDecline,
}: {
  appointmentId: string;
  onAccepted: () => void;
  onDecline: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setLoading(true);
    setError('');
    try {
      await appointmentsApi.updateConsent(appointmentId, 'accepted');
      onAccepted();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update consent'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-slate-900 px-6">
      <Card className="w-full max-w-md">
        <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-warning/15">
          <AlertTriangle size={32} color={colors.warning.DEFAULT} />
        </View>
        <Text className="text-center text-2xl font-inter-semibold text-slate-900">
          Recording Consent
        </Text>
        <Text className="mt-3 text-center text-base leading-6 text-muted">
          This consultation will be recorded for AI-assisted clinical note generation. Your
          recording is processed securely and used only for this appointment.
        </Text>
        {error ? <Text className="mt-3 text-center text-sm text-danger">{error}</Text> : null}
        <View className="mt-6 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={onDecline}>
            Decline & Leave
          </Button>
          <Button className="flex-1" loading={loading} onPress={() => void handleAccept()}>
            Accept & Join
          </Button>
        </View>
      </Card>
    </View>
  );
}

export default function ConsultationRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const startSession = useConsultationSessionStore((s) => s.startSession);
  const endSession = useConsultationSessionStore((s) => s.endSession);
  const sessionStatus = useConsultationSessionStore((s) => s.status);
  const sessionAppointmentId = useConsultationSessionStore((s) => s.appointmentId);
  const token = useConsultationSessionStore((s) => s.token);
  const livekitUrl = useConsultationSessionStore((s) => s.livekitUrl);
  const appointment = useConsultationSessionStore((s) => s.appointment);

  const [consentGranted, setConsentGranted] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const appointmentId = typeof id === 'string' ? id : '';
  const leavingRef = useRef(false);

  const {
    data: fetchedAppointment,
    isLoading: appointmentLoading,
    isError: appointmentError,
    error: appointmentQueryError,
    refetch: refetchAppointment,
  } = useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => appointmentsApi.get(appointmentId),
    enabled: Boolean(appointmentId),
  });

  const activeAppointment =
    fetchedAppointment ??
    (appointment?.id === appointmentId ? appointment : undefined);

  const sessionReady =
    sessionStatus === 'active' &&
    sessionAppointmentId === appointmentId &&
    Boolean(token) &&
    Boolean(livekitUrl);

  const isDoctor = role === UserRole.DOCTOR || role === UserRole.ADMIN;

  const needsConsent =
    role === UserRole.PATIENT &&
    activeAppointment?.consentStatus !== 'accepted' &&
    !consentGranted;

  useEffect(() => {
    leavingRef.current = false;
  }, [appointmentId]);

  useEffect(() => {
    if (
      sessionStatus === 'active' &&
      sessionAppointmentId &&
      sessionAppointmentId !== appointmentId
    ) {
      endSession();
    }
  }, [appointmentId, sessionStatus, sessionAppointmentId, endSession]);

  useEffect(() => {
    ensureLiveKitGlobals();
    void AudioSession.startAudioSession();
    return () => {
      leavingRef.current = true;
      endSession();
      void AudioSession.stopAudioSession();
    };
  }, [endSession]);

  useEffect(() => {
    if (!needsConsent && activeAppointment && !permissionsGranted) {
      void (async () => {
        const granted = await requestMediaPermissions();
        if (!granted) {
          setPermissionError('Camera and microphone permissions are required to join.');
          return;
        }
        setPermissionError('');
        setPermissionsGranted(true);
      })();
    }
  }, [needsConsent, activeAppointment, permissionsGranted]);

  const fetchToken = useCallback(async () => {
    if (!appointmentId || !activeAppointment) return;
    setTokenLoading(true);
    setTokenError('');
    try {
      const res = await consultationsApi.getJoinToken(appointmentId);
      if (res.requiresConsent) {
        setTokenError('Recording consent is required before joining.');
        return;
      }
      const joinedAppointment =
        res.appointmentStatus && res.appointmentStatus !== activeAppointment.status
          ? { ...activeAppointment, status: res.appointmentStatus }
          : activeAppointment;

      startSession({
        appointmentId,
        token: res.token,
        livekitUrl: res.livekitUrl,
        appointment: joinedAppointment,
        isMinimized: false,
      });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.doctor });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.patient });
      void queryClient.invalidateQueries({ queryKey: consultationKeys.livePresence() });
    } catch (err) {
      setTokenError(getApiErrorMessage(err, 'Failed to join consultation. Please try again.'));
    } finally {
      setTokenLoading(false);
    }
  }, [appointmentId, activeAppointment, startSession, queryClient]);

  useEffect(() => {
    if (
      !needsConsent &&
      permissionsGranted &&
      activeAppointment &&
      !sessionReady &&
      !tokenError
    ) {
      void fetchToken();
    }
  }, [
    needsConsent,
    permissionsGranted,
    activeAppointment,
    sessionReady,
    tokenError,
    fetchToken,
  ]);

  const handleLeave = useCallback(() => {
    leavingRef.current = true;
    endSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/appointments');
    }
  }, [endSession, router]);

  const handleDisconnected = useCallback(() => {
    if (leavingRef.current) return;
    handleLeave();
  }, [handleLeave]);

  const handleConnectionError = useCallback(
    (error: Error) => {
      leavingRef.current = true;
      endSession();
      setTokenError(error.message || 'Failed to connect to the consultation room.');
    },
    [endSession],
  );

  if (!appointmentId) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-white">Invalid consultation link</Text>
      </View>
    );
  }

  if (needsConsent) {
    return (
      <ConsentGate
        appointmentId={appointmentId}
        onAccepted={() => setConsentGranted(true)}
        onDecline={handleLeave}
      />
    );
  }

  if (permissionError) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <Card className="w-full max-w-sm">
          <AlertTriangle size={36} color={colors.danger.DEFAULT} style={{ alignSelf: 'center' }} />
          <Text className="mt-4 text-center text-xl font-inter-semibold text-slate-900">
            Permissions Required
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">{permissionError}</Text>
          <View className="mt-5 flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={handleLeave}>
              Back
            </Button>
            <Button
              className="flex-1"
              onPress={() => {
                setPermissionError('');
                setPermissionsGranted(false);
              }}
            >
              Retry
            </Button>
          </View>
        </Card>
      </View>
    );
  }

  if (appointmentLoading || tokenLoading || !permissionsGranted) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Spinner size="lg" color={colors.white} />
        <Text className="mt-4 text-white/80">Connecting to consultation room…</Text>
      </View>
    );
  }

  if (appointmentError || !activeAppointment) {
    const appointmentLoadError = getApiErrorMessage(
      appointmentQueryError,
      'Could not load this appointment. Please try again.',
    );
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <Card className="w-full max-w-sm">
          <AlertTriangle size={36} color={colors.danger.DEFAULT} style={{ alignSelf: 'center' }} />
          <Text className="mt-4 text-center text-xl font-inter-semibold text-slate-900">
            Appointment Unavailable
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">{appointmentLoadError}</Text>
          <View className="mt-5 flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={handleLeave}>
              Back
            </Button>
            <Button className="flex-1" onPress={() => void refetchAppointment()}>
              Retry
            </Button>
          </View>
        </Card>
      </View>
    );
  }

  if (tokenError) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <Card className="w-full max-w-sm">
          <AlertTriangle size={36} color={colors.danger.DEFAULT} style={{ alignSelf: 'center' }} />
          <Text className="mt-4 text-center text-xl font-inter-semibold text-slate-900">
            Connection Failed
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">{tokenError}</Text>
          <View className="mt-5 flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={handleLeave}>
              Back
            </Button>
            <Button className="flex-1" onPress={() => void fetchToken()}>
              Retry
            </Button>
          </View>
        </Card>
      </View>
    );
  }

  if (sessionReady && token && livekitUrl) {
    return (
      <View className="flex-1 bg-slate-950">
        <LiveKitRoom
          key={token}
          serverUrl={livekitUrl}
          token={token}
          connect
          audio={false}
          video={false}
          options={{
            // Force classic dual peer-connection (subscriber-primary) mode.
            // In single-PC mode (the livekit-client default), react-native-webrtc
            // does not fire `ontrack` for tracks added during mid-call renegotiation,
            // so a remote camera turned on after we joined never reaches the decoder.
            // Dual-PC mode has the server create the subscriber offer, which works.
            singlePeerConnection: false,
          }}
          connectOptions={{
            autoSubscribe: true,
          }}
          onDisconnected={handleDisconnected}
          onError={handleConnectionError}
        >
          <ConsultationVideoRoom
            appointment={activeAppointment}
            isDoctor={isDoctor}
            onLeave={handleLeave}
          />
        </LiveKitRoom>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-slate-950">
      <Spinner size="lg" color={colors.white} />
      <Text className="mt-4 text-white/80">Preparing consultation room…</Text>
    </View>
  );
}
