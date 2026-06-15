import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Calendar, Plus, Search, Video } from 'lucide-react-native';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { bookingApi } from '@/api/booking.api';
import { dashboardKeys } from '@/api/dashboard.api';
import { getApiErrorMessage } from '@/api/errors';
import { ScheduleAppointmentSheet } from '@/components/appointments/ScheduleAppointmentSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { InCallBadge } from '@/components/shared/InCallBadge';
import { useLivePresence } from '@/hooks/useLivePresence';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { AppointmentStatusBadge } from '@/components/shared/StatusBadge';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { AppointmentStatus, UserRole, type Appointment, type AppointmentStatus as Status } from '@/types';
import { formatDateTime } from '@/utils/formatDate';

const PAGE_SIZE = 10;

const STATUS_TABS: { label: string; value: Status | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: AppointmentStatus.PENDING_APPROVAL },
  { label: 'Scheduled', value: AppointmentStatus.SCHEDULED },
  { label: 'In Progress', value: AppointmentStatus.IN_PROGRESS },
  { label: 'Completed', value: AppointmentStatus.COMPLETED },
  { label: 'Cancelled', value: AppointmentStatus.CANCELLED },
];

function AppointmentListItem({
  appt,
  role,
  onPress,
  onJoin,
  onStart,
  onComplete,
  onCancel,
  onApprove,
  onDecline,
  actionLoading,
  inCallParticipants,
}: {
  appt: Appointment;
  role: string | null;
  onPress: () => void;
  onJoin: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onApprove: () => void;
  onDecline: () => void;
  actionLoading: boolean;
  inCallParticipants?: { identity: string; name: string; role?: string }[];
}) {
  const isStaff = role === UserRole.DOCTOR || role === UserRole.ADMIN;
  const isPending = appt.status === AppointmentStatus.PENDING_APPROVAL;
  const showJoin =
    !isPending &&
    (appt.status === AppointmentStatus.SCHEDULED || appt.status === AppointmentStatus.IN_PROGRESS);

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-90">
      <Card>
        <View className="flex-row items-start gap-3">
          <Avatar
            name={`${appt.patient?.firstName} ${appt.patient?.lastName}`}
            size="md"
          />
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-slate-900">
              {appt.patient?.firstName} {appt.patient?.lastName}
            </Text>
            <Text className="text-sm text-muted">
              Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}
            </Text>
            <Text className="mt-1 text-sm text-muted">{formatDateTime(appt.scheduledAt)}</Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <AppointmentStatusBadge status={appt.status} />
              {inCallParticipants?.length ? (
                <InCallBadge participants={inCallParticipants} compact />
              ) : null}
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {isStaff && isPending ? (
                <>
                  <Button
                    size="sm"
                    loading={actionLoading}
                    onPress={onApprove}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={actionLoading}
                    onPress={onDecline}
                  >
                    Decline
                  </Button>
                </>
              ) : null}

              {showJoin ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={actionLoading}
                  onPress={onJoin}
                  className="shadow-lg shadow-primary/30"
                  leftIcon={<Video size={16} color={colors.white} />}
                >
                  Join
                </Button>
              ) : null}

              {isStaff && appt.status === AppointmentStatus.SCHEDULED ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={actionLoading}
                  onPress={onStart}
                >
                  Start
                </Button>
              ) : null}

              {isStaff && appt.status === AppointmentStatus.IN_PROGRESS ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={actionLoading}
                  onPress={onComplete}
                >
                  Complete
                </Button>
              ) : null}

              {isStaff &&
              appt.status !== AppointmentStatus.CANCELLED &&
              appt.status !== AppointmentStatus.COMPLETED ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={actionLoading}
                  onPress={onCancel}
                >
                  Cancel
                </Button>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function ListSkeleton() {
  return (
    <View className="gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <View className="flex-row items-center gap-3">
            <Skeleton width={40} height={40} rounded="full" />
            <View className="flex-1 gap-2">
              <Skeleton height={16} width={192} />
              <Skeleton height={12} width={128} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: livePresence } = useLivePresence();

  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const listParams = useMemo(
    () => ({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      pageSize: PAGE_SIZE,
    }),
    [statusFilter],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: appointmentKeys.list(listParams),
    queryFn: ({ pageParam }) =>
      appointmentsApi.list({ ...listParams, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    retry: 1,
  });

  const searchLower = search.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    if (!searchLower) return items;
    return items.filter((appt) => {
      const patient = `${appt.patient?.firstName ?? ''} ${appt.patient?.lastName ?? ''}`.toLowerCase();
      const doctor = `${appt.doctor?.firstName ?? ''} ${appt.doctor?.lastName ?? ''}`.toLowerCase();
      return patient.includes(searchLower) || doctor.includes(searchLower);
    });
  }, [data?.pages, searchLower]);

  const invalidateAppointments = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  }, [queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: (params: { id: string; status: Status }) =>
      appointmentsApi.updateStatus(params.id, params.status),
    onMutate: ({ id }) => setActionId(id),
    onSuccess: () => {
      toast.show({ title: 'Appointment updated', variant: 'success' });
      invalidateAppointments();
    },
    onError: () => toast.show({ title: 'Failed to update appointment', variant: 'error' }),
    onSettled: () => setActionId(null),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onMutate: (id) => setActionId(id),
    onSuccess: () => {
      toast.show({ title: 'Appointment cancelled', variant: 'success' });
      invalidateAppointments();
    },
    onError: () => toast.show({ title: 'Failed to cancel appointment', variant: 'error' }),
    onSettled: () => setActionId(null),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => bookingApi.approveRequest(id),
    onMutate: (id) => setActionId(id),
    onSuccess: () => {
      toast.show({ title: 'Appointment approved', variant: 'success' });
      invalidateAppointments();
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.doctor });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.patient });
    },
    onError: (err) =>
      toast.show({ title: getApiErrorMessage(err, 'Failed to approve'), variant: 'error' }),
    onSettled: () => setActionId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => bookingApi.rejectRequest(id),
    onMutate: (id) => setActionId(id),
    onSuccess: () => {
      toast.show({ title: 'Request declined', variant: 'success' });
      invalidateAppointments();
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.doctor });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.patient });
    },
    onError: (err) =>
      toast.show({ title: getApiErrorMessage(err, 'Failed to decline'), variant: 'error' }),
    onSettled: () => setActionId(null),
  });

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !searchLower) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, searchLower]);

  const isStaff = role === UserRole.DOCTOR || role === UserRole.ADMIN;
  const showFab = isStaff;

  const listHeader = (
    <View className="mb-4">
      <View className="gap-3">
        <Select
          label="Status"
          value={statusFilter}
          options={STATUS_TABS.map((tab) => ({
            value: tab.value,
            label: tab.label,
          }))}
          onChange={setStatusFilter}
        />

        <Input
          placeholder="Search appointments..."
          value={search}
          onChangeText={setSearch}
          trailingIcon={<Search size={18} color={colors.slate400} />}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isError ? (
        <Card className="mt-4 border-danger/30 bg-red-50">
          <Text className="text-sm text-danger">
            {getApiErrorMessage(error, 'Failed to load appointments')}
          </Text>
        </Card>
      ) : null}
    </View>
  );

  const listEmpty = isLoading ? (
    <ListSkeleton />
  ) : isError ? null : (
    <EmptyState
      icon={Calendar}
      title="No appointments found"
      description="Try adjusting your filters or schedule a new appointment."
    />
  );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Manage and view all appointments" />
      <FlashList
        className="flex-1"
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: showFab ? 88 : 16 }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshing={isRefetching}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4">
              <Skeleton height={16} width={120} className="mx-auto" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <AppointmentListItem
            appt={item}
            role={role}
            actionLoading={actionId === item.id}
            onPress={() => router.push(`/(app)/appointments/${item.id}` as never)}
            onJoin={() => router.push(`/(app)/appointments/${item.id}/consultation` as never)}
            onStart={() =>
              updateStatusMutation.mutate({
                id: item.id,
                status: AppointmentStatus.IN_PROGRESS,
              })
            }
            onComplete={() =>
              updateStatusMutation.mutate({
                id: item.id,
                status: AppointmentStatus.COMPLETED,
              })
            }
            onCancel={() => cancelMutation.mutate(item.id)}
            onApprove={() => approveMutation.mutate(item.id)}
            onDecline={() => rejectMutation.mutate(item.id)}
            inCallParticipants={livePresence?.[item.id]?.participants}
          />
        )}
      />

      {isStaff ? (
        <ScheduleAppointmentSheet
          visible={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          role={role}
        />
      ) : null}

      {showFab ? (
        <Pressable
          onPress={() => setScheduleOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Schedule appointment"
          className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
          style={{
            shadowColor: colors.primary.DEFAULT,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Plus size={24} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}
