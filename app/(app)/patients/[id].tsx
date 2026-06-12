import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Mail, Phone } from 'lucide-react-native';
import { Avatar, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { AppointmentStatusBadge } from '@/components/shared/StatusBadge';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SCROLL_BOTTOM_INSET } from '@/components/layout/TabBar';
import { patientsApi, patientKeys, formatGender } from '@/api/patients.api';
import type { PatientSession } from '@/types';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { colors } from '@/constants/colors';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const patientId = id ?? '';

  const { data: patient, isLoading } = useQuery({
    queryKey: patientKeys.detail(patientId),
    queryFn: () => patientsApi.get(patientId),
    enabled: !!patientId,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: patientKeys.sessions(patientId, { page: 1, pageSize: 50 }),
    queryFn: () => patientsApi.listSessions(patientId, { page: 1, pageSize: 50 }),
    enabled: !!patientId,
  });

  const renderSession = useCallback(
    ({ item }: { item: PatientSession }) => (
      <Pressable
        onPress={() => router.push(`/(app)/appointments/${item.id}`)}
        className="mb-3 active:opacity-90"
      >
        <Card className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-slate-900">
              {formatDateTime(item.scheduledAt)}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {item.doctor
                ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}`
                : 'No doctor assigned'}
            </Text>
          </View>
          <AppointmentStatusBadge status={item.status} />
        </Card>
      </Pressable>
    ),
    [router],
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title="Patient" />
        <View className="gap-4 p-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </View>
      </View>
    );
  }

  if (!patient) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title="Patient" />
        <View className="p-4">
          <Text className="text-muted">Patient not found.</Text>
          <Button variant="outline" className="mt-4" onPress={() => router.back()}>
            Back to Patients
          </Button>
        </View>
      </View>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title={fullName}
        subtitle={`${patient.sessionCount ?? 0} total sessions`}
        fallbackHref="/(app)/patients"
      />

      <View className="px-4 pt-4">
        <View className="mb-4 flex-row items-center gap-3">
          <Avatar name={fullName} size="lg" />
          <View className="flex-1">
            <Text className="text-xl font-inter-bold text-slate-900">{fullName}</Text>
            <Text className="mt-0.5 text-sm text-muted">{patient.email}</Text>
          </View>
        </View>

        <View className="mb-4 gap-3">
          <Card>
            <Text className="mb-3 text-sm font-inter-semibold text-slate-900">Profile</Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Gender</Text>
                <Text className="text-sm font-inter-medium text-slate-900">
                  {formatGender(patient.gender)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Date of birth</Text>
                <Text className="text-sm font-inter-medium text-slate-900">
                  {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : '—'}
                </Text>
              </View>
            </View>
          </Card>

          <Card>
            <Text className="mb-3 text-sm font-inter-semibold text-slate-900">Contact</Text>
            <View className="flex-row items-center gap-2">
              <Mail size={16} color={colors.slate400} />
              <Text className="text-sm text-slate-700">{patient.email}</Text>
            </View>
            {patient.phone ? (
              <View className="mt-2 flex-row items-center gap-2">
                <Phone size={16} color={colors.slate400} />
                <Text className="text-sm text-slate-700">{patient.phone}</Text>
              </View>
            ) : null}
          </Card>
        </View>

        <Text className="mb-3 text-lg font-inter-semibold text-slate-900">Sessions</Text>
      </View>

      {sessionsLoading ? (
        <View className="gap-3 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-card" />
          ))}
        </View>
      ) : (
        <FlashList
          data={sessions?.items ?? []}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SCROLL_BOTTOM_INSET }}
          ListEmptyComponent={
            <EmptyState
              icon={Calendar}
              title="No sessions yet"
              description="Schedule an appointment for this patient."
            />
          }
        />
      )}
    </View>
  );
}
