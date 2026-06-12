import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Brain, ChevronRight } from 'lucide-react-native';
import { Card, EmptyState, Skeleton } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SCROLL_BOTTOM_INSET } from '@/components/layout/TabBar';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { aiOutputsApi, aiOutputKeys } from '@/api/aiOutputs.api';
import { UserRole, type Appointment } from '@/types';
import { formatDateTime } from '@/utils/formatDate';
import { colors } from '@/constants/colors';

interface PendingAppointment extends Appointment {
  pendingOutputCount: number;
}

function AiOutputsScreen() {
  const router = useRouter();

  const { data: appointments, isLoading } = useQuery({
    queryKey: appointmentKeys.list({ pageSize: 50 }),
    queryFn: () => appointmentsApi.list({ pageSize: 50 }),
    retry: 1,
  });

  const appointmentItems = appointments?.items ?? [];

  const statusQueries = useQueries({
    queries: appointmentItems.map((appt) => ({
      queryKey: aiOutputKeys.generationStatus(appt.id),
      queryFn: () => aiOutputsApi.getGenerationStatus(appt.id),
      enabled: !!appt.id,
      staleTime: 30_000,
    })),
  });

  const pendingAppointments = useMemo<PendingAppointment[]>(() => {
    return appointmentItems
      .map((appt, index) => {
        const status = statusQueries[index]?.data;
        const pendingOutputCount = status?.pendingOutputCount ?? 0;
        return { ...appt, pendingOutputCount };
      })
      .filter((appt) => appt.pendingOutputCount > 0)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [appointmentItems, statusQueries]);

  const statusesLoading = statusQueries.some((q) => q.isLoading);

  const renderAppointment = ({ item }: { item: PendingAppointment }) => (
    <Pressable
      onPress={() => router.push(`/(app)/ai-outputs/${item.id}`)}
      className="mb-3 active:opacity-90"
    >
      <Card>
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-inter-semibold text-slate-900" numberOfLines={1}>
                {item.patient?.firstName} {item.patient?.lastName}
              </Text>
              <Badge variant="warning">{item.pendingOutputCount} pending</Badge>
            </View>
            <Text className="mt-1 text-sm text-muted" numberOfLines={2}>
              Dr. {item.doctor?.firstName} {item.doctor?.lastName} · {formatDateTime(item.scheduledAt)}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.slate400} />
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="AI Outputs"
        subtitle="Appointments with outputs pending review"
        fallbackHref="/(app)/dashboard"
      />

      {isLoading || statusesLoading ? (
        <View className="gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="mb-2 h-6 w-64" />
              <Skeleton className="h-4 w-40" />
            </Card>
          ))}
        </View>
      ) : (
        <FlashList
          data={pendingAppointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: SCROLL_BOTTOM_INSET }}
          ListEmptyComponent={
            <EmptyState
              icon={Brain}
              title="No outputs pending review"
              description="AI outputs appear here after consultation recordings are processed and need your approval."
            />
          }
        />
      )}
    </View>
  );
}

export default function AiOutputsIndexScreen() {
  return (
    <RoleGuard allowedRoles={[UserRole.DOCTOR, UserRole.ADMIN]}>
      <AiOutputsScreen />
    </RoleGuard>
  );
}
