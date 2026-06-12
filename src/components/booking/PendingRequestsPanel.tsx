import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { bookingApi } from '@/api/booking.api';
import { appointmentKeys } from '@/api/appointments.api';
import { dashboardKeys } from '@/api/dashboard.api';
import { getApiErrorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { Appointment } from '@/types';
import { formatDateTime } from '@/utils/formatDate';

interface PendingRequestsPanelProps {
  items: Appointment[];
  loading?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export function PendingRequestsPanel({
  items,
  loading = false,
  compact = false,
  title = 'Pending requests',
  subtitle = 'Approve or decline patient booking requests',
}: PendingRequestsPanelProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.doctor });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.patient });
  };

  const approveMutation = useMutation({
    mutationFn: bookingApi.approveRequest,
    onSuccess: () => {
      toast.show({ title: 'Appointment approved', variant: 'success' });
      invalidate();
    },
    onError: (err) =>
      toast.show({ title: getApiErrorMessage(err, 'Failed to approve'), variant: 'error' }),
  });

  const rejectMutation = useMutation({
    mutationFn: bookingApi.rejectRequest,
    onSuccess: () => {
      toast.show({ title: 'Request declined', variant: 'success' });
      invalidate();
    },
    onError: (err) =>
      toast.show({ title: getApiErrorMessage(err, 'Failed to decline'), variant: 'error' }),
  });

  const content = loading ? (
    <Skeleton height={compact ? 80 : 120} className="w-full" />
  ) : items.length === 0 ? (
    <EmptyState
      icon={Clock}
      title="No pending requests"
      description="New patient bookings will appear here for your approval."
    />
  ) : (
    <View className="gap-3">
      {items.map((appt) => (
        <View
          key={appt.id}
          className="rounded-lg border border-warning/30 bg-amber-50/60 p-4"
        >
          <Text className="font-inter-semibold text-slate-900">
            {appt.patient?.firstName} {appt.patient?.lastName}
          </Text>
          <Text className="mt-0.5 text-sm text-muted">{formatDateTime(appt.scheduledAt)}</Text>
          <View className="mt-3 flex-row gap-2">
            <Button
              size="sm"
              loading={approveMutation.isPending}
              onPress={() => approveMutation.mutate(appt.id)}
              className="flex-1"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={rejectMutation.isPending}
              onPress={() => rejectMutation.mutate(appt.id)}
              className="flex-1"
            >
              Decline
            </Button>
          </View>
        </View>
      ))}
    </View>
  );

  if (compact) return content;

  return (
    <Card className="mb-4">
      <Text className="mb-0.5 text-base font-inter-semibold text-slate-900">{title}</Text>
      <Text className="mb-4 text-sm text-muted">{subtitle}</Text>
      {content}
    </Card>
  );
}
