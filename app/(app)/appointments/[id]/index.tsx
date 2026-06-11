import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brain, Calendar, Clock, FileCheck, FileText, User } from 'lucide-react-native';
import { aiOutputsApi, aiOutputKeys } from '@/api/aiOutputs.api';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { consultationsApi, consultationKeys } from '@/api/consultations.api';
import { documentsApi, documentKeys } from '@/api/documents.api';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import {
  AiOutputStatusBadge,
  AppointmentStatusBadge,
  ConsentStatusBadge,
  DocumentStatusBadge,
} from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import {
  AppointmentStatus,
  ConsentStatus,
  UserRole,
  type AppointmentStatus as Status,
} from '@/types';
import { getAiOutputTypeLabel } from '@/utils/ai-output-labels';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/formatDate';

type TabKey = 'overview' | 'transcript' | 'ai-outputs' | 'documents';

const TABS: { key: TabKey; label: string; Icon: typeof Calendar }[] = [
  { key: 'overview', label: 'Overview', Icon: Calendar },
  { key: 'transcript', label: 'Transcript', Icon: FileText },
  { key: 'ai-outputs', label: 'AI Outputs', Icon: Brain },
  { key: 'documents', label: 'Documents', Icon: FileCheck },
];

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-inter-semibold text-slate-900">{title}</Text>
        {icon}
      </View>
      {children}
    </Card>
  );
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('overview');
  const [cancelOpen, setCancelOpen] = useState(false);

  const appointmentId = id ?? '';

  const { data: appointment, isLoading } = useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => appointmentsApi.get(appointmentId),
    enabled: Boolean(appointmentId),
  });

  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: consultationKeys.transcript(appointmentId),
    queryFn: () => consultationsApi.getTranscript(appointmentId),
    enabled: Boolean(appointmentId) && tab === 'transcript',
    retry: 1,
  });

  const { data: aiOutputs = [], isLoading: aiLoading } = useQuery({
    queryKey: aiOutputKeys.byAppointment(appointmentId),
    queryFn: () => aiOutputsApi.getByAppointment(appointmentId),
    enabled: Boolean(appointmentId) && tab === 'ai-outputs',
    retry: 1,
  });

  const { data: documentsPage, isLoading: docsLoading } = useQuery({
    queryKey: documentKeys.list({ appointmentId, patientId: appointment?.patientId }),
    queryFn: () =>
      documentsApi.list({
        appointmentId,
        patientId: appointment?.patientId,
        pageSize: 20,
      }),
    enabled: Boolean(appointmentId) && Boolean(appointment?.patientId) && tab === 'documents',
    retry: 1,
  });

  const consentMutation = useMutation({
    mutationFn: (status: 'accepted' | 'declined') =>
      appointmentsApi.updateConsent(appointmentId, status),
    onSuccess: (data) => {
      toast.show({
        title: data.consentStatus === ConsentStatus.ACCEPTED ? 'Consent accepted' : 'Consent declined',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
    },
    onError: () => toast.show({ title: 'Failed to update consent', variant: 'error' }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => appointmentsApi.cancel(appointmentId),
    onSuccess: () => {
      toast.show({ title: 'Appointment cancelled', variant: 'success' });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      router.replace('/(app)/appointments' as never);
    },
    onError: () => toast.show({ title: 'Failed to cancel appointment', variant: 'error' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: Status) => appointmentsApi.updateStatus(appointmentId, status),
    onSuccess: () => {
      toast.show({ title: 'Appointment updated', variant: 'success' });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
    },
    onError: () => toast.show({ title: 'Failed to update appointment', variant: 'error' }),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title="Appointment" />
        <View className="gap-4 p-4">
          <Skeleton height={32} width={256} />
          <Skeleton height={128} className="w-full" />
          <Skeleton height={256} className="w-full" />
        </View>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title="Appointment" />
        <EmptyState title="Appointment not found" description="This appointment may have been removed." />
      </View>
    );
  }

  const canJoin =
    (appointment.status === AppointmentStatus.SCHEDULED ||
      appointment.status === AppointmentStatus.IN_PROGRESS) &&
    (role === UserRole.DOCTOR ||
      (role === UserRole.PATIENT && appointment.consentStatus === ConsentStatus.ACCEPTED));

  const isStaff = role === UserRole.ADMIN || role === UserRole.DOCTOR;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Appointment"
        subtitle={formatDateTime(appointment.scheduledAt)}
        rightAction={<AppointmentStatusBadge status={appointment.status} />}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row flex-wrap gap-2">
          {canJoin ? (
            <Button
              size="sm"
              onPress={() => router.push(`/(app)/appointments/${appointmentId}/consultation` as never)}
            >
              Join Consultation
            </Button>
          ) : null}

          {isStaff && appointment.status === AppointmentStatus.SCHEDULED ? (
            <Button
              size="sm"
              variant="outline"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate(AppointmentStatus.IN_PROGRESS)}
            >
              Start
            </Button>
          ) : null}

          {isStaff && appointment.status === AppointmentStatus.IN_PROGRESS ? (
            <Button
              size="sm"
              variant="outline"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate(AppointmentStatus.COMPLETED)}
            >
              Complete
            </Button>
          ) : null}

          {isStaff &&
          appointment.status !== AppointmentStatus.CANCELLED &&
          appointment.status !== AppointmentStatus.COMPLETED ? (
            <Button size="sm" variant="outline" onPress={() => setCancelOpen(true)}>
              Cancel
            </Button>
          ) : null}
        </View>

        {role === UserRole.PATIENT && appointment.consentStatus === ConsentStatus.PENDING ? (
          <Card className="mb-4 border-warning/40 bg-amber-50">
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <FileText size={20} color={colors.warning.DEFAULT} />
              </View>
              <View className="flex-1">
                <Text className="font-inter-semibold text-amber-900">Recording Consent Required</Text>
                <Text className="mt-1 text-sm leading-5 text-amber-800">
                  This consultation will be recorded for AI-assisted note generation. Please accept or
                  decline consent before joining.
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={consentMutation.isPending}
                    onPress={() => consentMutation.mutate('accepted')}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={consentMutation.isPending}
                    onPress={() => consentMutation.mutate('declined')}
                  >
                    Decline
                  </Button>
                </View>
              </View>
            </View>
          </Card>
        ) : null}

        {role === UserRole.PATIENT && appointment.consentStatus !== ConsentStatus.PENDING ? (
          <View className="mb-4">
            <ConsentStatusBadge status={appointment.consentStatus} />
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 border-b border-border"
          contentContainerStyle={{ gap: 4 }}
        >
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                className={cn(
                  'flex-row items-center gap-2 border-b-2 px-3 py-2.5',
                  active ? 'border-primary' : 'border-transparent',
                )}
              >
                <Icon size={16} color={active ? colors.primary.DEFAULT : colors.muted} />
                <Text
                  className={cn(
                    'text-sm font-inter-medium',
                    active ? 'text-primary' : 'text-muted',
                  )}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === 'overview' ? (
          <View>
            <InfoCard title="Patient" icon={<User size={16} color={colors.muted} />}>
              <Text className="font-inter-semibold text-slate-900">
                {appointment.patient?.firstName} {appointment.patient?.lastName}
              </Text>
              <Text className="mt-0.5 text-sm text-muted">{appointment.patient?.email}</Text>
              {appointment.patient?.phone ? (
                <Text className="text-sm text-muted">{appointment.patient.phone}</Text>
              ) : null}
            </InfoCard>

            <InfoCard title="Doctor" icon={<User size={16} color={colors.muted} />}>
              <Text className="font-inter-semibold text-slate-900">
                Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
              </Text>
              {appointment.doctor?.specialty ? (
                <Text className="mt-0.5 text-sm text-muted">{appointment.doctor.specialty}</Text>
              ) : null}
              <Text className="text-sm text-muted">{appointment.doctor?.email}</Text>
            </InfoCard>

            <InfoCard title="Schedule" icon={<Clock size={16} color={colors.muted} />}>
              <Text className="font-inter-semibold text-slate-900">
                {formatDateTime(appointment.scheduledAt)}
              </Text>
              <View className="mt-2">
                <AppointmentStatusBadge status={appointment.status} />
              </View>
            </InfoCard>

            <InfoCard title="Consent" icon={<FileText size={16} color={colors.muted} />}>
              <ConsentStatusBadge status={appointment.consentStatus} />
              <Text className="mt-2 text-sm text-muted">
                Recording consent is required before starting the consultation.
              </Text>
            </InfoCard>
          </View>
        ) : null}

        {tab === 'transcript' ? (
          <Card>
            <Text className="mb-3 text-base font-inter-semibold text-slate-900">
              Consultation Transcript
            </Text>
            {transcriptLoading ? (
              <Skeleton height={120} className="w-full" />
            ) : transcript?.content ? (
              <MarkdownContent content={transcript.content} />
            ) : (
              <EmptyState
                icon={FileText}
                title="No transcript available"
                description="Transcripts are generated after the consultation recording is processed."
              />
            )}
          </Card>
        ) : null}

        {tab === 'ai-outputs' ? (
          <View>
            {aiLoading ? (
              <Skeleton height={160} className="w-full" />
            ) : aiOutputs.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No AI outputs yet"
                description="AI outputs appear after the consultation transcript is processed."
              />
            ) : (
              aiOutputs.map((output) => (
                <Card key={output.id} className="mb-3">
                  <View className="mb-2 flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-inter-semibold text-slate-900">
                      {getAiOutputTypeLabel(output.type)}
                    </Text>
                    <AiOutputStatusBadge status={output.status} />
                  </View>
                  <MarkdownContent content={output.currentContent} />
                </Card>
              ))
            )}
          </View>
        ) : null}

        {tab === 'documents' ? (
          <View>
            {docsLoading ? (
              <Skeleton height={120} className="w-full" />
            ) : (documentsPage?.items.length ?? 0) === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="No documents"
                description="Documents linked to this appointment will appear here."
              />
            ) : (
              documentsPage?.items.map((doc) => (
                <Card key={doc.id} className="mb-3">
                  <Text className="font-inter-semibold text-slate-900">{doc.fileName}</Text>
                  <Text className="mt-1 text-sm text-muted">{doc.documentType ?? doc.mimeType}</Text>
                  <View className="mt-2">
                    <DocumentStatusBadge status={doc.processingStatus} />
                  </View>
                </Card>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Appointment">
        <Text className="text-slate-700">
          Are you sure you want to cancel this appointment? This cannot be undone.
        </Text>
        <View className="mt-5 flex-row justify-end gap-2">
          <Button variant="outline" onPress={() => setCancelOpen(false)}>
            Keep Appointment
          </Button>
          <Button
            variant="danger"
            loading={cancelMutation.isPending}
            onPress={() => cancelMutation.mutate()}
          >
            Yes, Cancel
          </Button>
        </View>
      </Modal>
    </View>
  );
}
