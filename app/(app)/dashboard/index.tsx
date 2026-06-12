import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  BrainCircuit,
  Calendar,
  ChevronRight,
  Clock,
  Clock3,
  FileCheck,
  FileText,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react-native';
import { adminApi, adminKeys } from '@/api/admin.api';
import { dashboardApi, dashboardKeys } from '@/api/dashboard.api';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { PendingRequestsPanel } from '@/components/booking/PendingRequestsPanel';
import { InCallBadge } from '@/components/shared/InCallBadge';
import { AppointmentStatusBadge } from '@/components/shared/StatusBadge';
import { useLivePresence } from '@/hooks/useLivePresence';
import {
  ADMIN_DATE_PRESETS,
  formatPeriodLabel,
  type AdminDateRangeParams,
} from '@/constants/admin-date-range';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import {
  AppointmentStatus,
  UserRole,
  type Appointment,
  type AdminDashboardData,
} from '@/types';
import { getAuditLogDisplayName, getAuditLogSummary } from '@/utils/audit-log-labels';
import { formatDateTime, formatTimeAgo } from '@/utils/formatDate';

const DEFAULT_ADMIN_RANGE: AdminDateRangeParams = { preset: '7d' };

const STATUS_BAR_COLORS: Record<string, string> = {
  [AppointmentStatus.SCHEDULED]: colors.primary.DEFAULT,
  [AppointmentStatus.PENDING_APPROVAL]: colors.warning.DEFAULT,
  [AppointmentStatus.IN_PROGRESS]: colors.warning.DEFAULT,
  [AppointmentStatus.COMPLETED]: colors.success.DEFAULT,
  [AppointmentStatus.CANCELLED]: colors.danger.DEFAULT,
};

function StatCard({
  label,
  value,
  icon,
  loading,
  hint,
  highlight,
}: {
  label: string;
  value?: number;
  icon: ReactNode;
  loading?: boolean;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className="flex-1 min-w-[46%]"
      style={
        highlight
          ? { borderColor: colors.warning.DEFAULT, borderWidth: 1, backgroundColor: '#FFFBEB' }
          : undefined
      }
    >
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
        {icon}
      </View>
      {loading ? (
        <Skeleton height={32} width={64} className="mb-1" />
      ) : (
        <Text className="text-3xl font-inter-bold text-slate-900">{(value ?? 0).toLocaleString()}</Text>
      )}
      <Text className="mt-0.5 text-sm text-muted">{label}</Text>
      {hint ? <Text className="mt-1 text-xs text-muted">{hint}</Text> : null}
    </Card>
  );
}

function SectionHeader({
  title,
  subtitle,
  onViewAll,
}: {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
}) {
  return (
    <View className="mb-3 flex-row items-start justify-between gap-2">
      <View className="flex-1">
        <Text className="text-base font-inter-semibold text-slate-900">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-sm text-muted">{subtitle}</Text> : null}
      </View>
      {onViewAll ? (
        <Pressable onPress={onViewAll} className="flex-row items-center active:opacity-70">
          <Text className="text-sm font-inter-medium text-primary">View all</Text>
          <ChevronRight size={16} color={colors.primary.DEFAULT} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SimpleBarChart({ data }: { data: AdminDashboardData['timeSeries'] }) {
  const maxCount = useMemo(() => Math.max(...data.map((p) => p.count), 1), [data]);

  if (data.length === 0 || !data.some((p) => p.count > 0)) {
    return (
      <Text className="py-10 text-center text-sm text-muted">No appointments in this period</Text>
    );
  }

  return (
    <View className="mt-2">
      <View className="h-44 flex-row items-end justify-between gap-1 px-1">
        {data.map((point) => {
          const heightPct = (point.count / maxCount) * 100;
          return (
            <View key={point.date} className="flex-1 items-center">
              <View className="h-36 w-full justify-end">
                <View
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
              </View>
              <Text className="mt-1 text-[9px] text-muted" numberOfLines={1}>
                {point.date.slice(5)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatusBreakdownChart({ data }: { data: AdminDashboardData['statusBreakdown'] }) {
  const total = useMemo(() => data.reduce((sum, row) => sum + row.count, 0), [data]);

  if (total === 0) {
    return (
      <Text className="py-10 text-center text-sm text-muted">No appointments in this period</Text>
    );
  }

  return (
    <View className="mt-2 gap-3">
      {data.map((row) => {
        const pct = total > 0 ? (row.count / total) * 100 : 0;
        const barColor = STATUS_BAR_COLORS[row.status] ?? colors.slate400;
        return (
          <View key={row.status}>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-sm text-slate-700">{row.label}</Text>
              <Text className="text-sm font-inter-semibold text-slate-900">{row.count}</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-surface">
              <View
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DashboardAppointmentRow({
  appt,
  viewAs = 'doctor',
  onOpen,
  onJoin,
  inCallParticipants,
}: {
  appt: Appointment;
  viewAs?: 'doctor' | 'patient';
  onOpen: () => void;
  onJoin: () => void;
  inCallParticipants?: { identity: string; name: string; role?: string }[];
}) {
  const showJoin =
    appt.status === AppointmentStatus.SCHEDULED || appt.status === AppointmentStatus.IN_PROGRESS;
  const title =
    viewAs === 'patient'
      ? `Dr. ${appt.doctor?.firstName ?? ''} ${appt.doctor?.lastName ?? ''}`.trim()
      : `${appt.patient?.firstName ?? ''} ${appt.patient?.lastName ?? ''}`.trim();
  const avatarName =
    viewAs === 'patient' ? title : `${appt.patient?.firstName} ${appt.patient?.lastName}`;

  return (
    <Pressable
      onPress={onOpen}
      className="flex-row items-center gap-3 rounded-lg p-3 active:bg-surface"
    >
      <Avatar name={avatarName} size="sm" />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-inter-medium text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-muted">{formatDateTime(appt.scheduledAt)}</Text>
        {inCallParticipants?.length ? (
          <View className="mt-1">
            <InCallBadge participants={inCallParticipants} compact />
          </View>
        ) : null}
      </View>
      <AppointmentStatusBadge status={appt.status} />
      {showJoin ? (
        <View onStartShouldSetResponder={() => true}>
          <Button size="sm" variant="outline" onPress={onJoin}>
            Join
          </Button>
        </View>
      ) : null}
    </Pressable>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<AdminDateRangeParams>(DEFAULT_ADMIN_RANGE);
  const rangeReady = dateRange.preset !== 'custom' || Boolean(dateRange.from && dateRange.to);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: adminKeys.dashboard(dateRange),
    queryFn: () => adminApi.getDashboard(dateRange),
    enabled: rangeReady,
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: adminKeys.activity,
    queryFn: adminApi.getRecentActivity,
  });

  const periodLabel = data
    ? formatPeriodLabel(
        data.period.preset as AdminDateRangeParams['preset'],
        data.period.from,
        data.period.to,
      )
    : '7 days';

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <View className="flex-1">
      <AppHeader subtitle="Organization overview and appointment analytics" />
      <PageContainer refreshing={isRefetching} onRefresh={onRefresh}>
      <Select
        className="mb-4"
        label="Date range"
        value={dateRange.preset}
        options={ADMIN_DATE_PRESETS.filter((p) => p.id !== 'custom').map((preset) => ({
          value: preset.id,
          label: preset.label,
        }))}
        onChange={(preset) => setDateRange({ preset })}
      />

      <View className="mb-4 flex-row flex-wrap gap-3">
        <StatCard
          label="Total Users"
          value={data?.totalUsers}
          icon={<Users size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
          hint="Active doctors and patients"
        />
        <StatCard
          label="Doctors"
          value={data?.totalDoctors}
          icon={<Stethoscope size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
        <StatCard
          label="Patients"
          value={data?.totalPatients}
          icon={<Users size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
        <StatCard
          label="Appointments"
          value={data?.appointmentsInPeriod}
          icon={<Calendar size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
          hint={`Scheduled in ${periodLabel}`}
        />
      </View>

      <Card className="mb-4">
        <SectionHeader
          title="Appointments Over Time"
          subtitle={`By scheduled date · ${periodLabel}`}
        />
        {isLoading ? (
          <Skeleton height={176} className="w-full" />
        ) : (
          <SimpleBarChart data={data?.timeSeries ?? []} />
        )}
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Status Distribution" subtitle={periodLabel} />
        {isLoading ? (
          <Skeleton height={120} className="w-full" />
        ) : (
          <StatusBreakdownChart data={data?.statusBreakdown ?? []} />
        )}
      </Card>

      <Card className="mb-4">
        <SectionHeader
          title="Recent Activity"
          onViewAll={() => router.push('/(app)/audit' as never)}
        />
        {activityLoading ? (
          <Skeleton height={16} width={192} className="mx-auto my-6" />
        ) : activity.length === 0 ? (
          <Text className="py-6 text-center text-sm text-muted">No recent activity</Text>
        ) : (
          activity.slice(0, 8).map((log) => (
            <View key={log.id} className="flex-row items-start gap-3 border-t border-border py-3">
              <Avatar name={getAuditLogDisplayName(log)} size="sm" />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-inter-medium text-slate-900" numberOfLines={1}>
                  {getAuditLogDisplayName(log)}
                </Text>
                <Text className="mt-0.5 text-sm leading-snug text-slate-700">
                  {getAuditLogSummary(log)}
                </Text>
                <Badge variant="gray" className="mt-1 self-start">
                  {log.action}
                </Badge>
              </View>
              <Text className="text-xs text-muted">{formatTimeAgo(log.createdAt)}</Text>
            </View>
          ))
        )}
      </Card>
      </PageContainer>
    </View>
  );
}

function DoctorDashboard() {
  const router = useRouter();
  const { data: livePresence } = useLivePresence();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: dashboardKeys.doctor,
    queryFn: () => dashboardApi.getDoctor(),
    retry: 1,
  });

  const stats = data?.stats;
  const pendingBooking = data?.pendingBookingRequests ?? [];
  const inProgress = data?.inProgressAppointments ?? [];
  const upcoming = data?.upcomingAppointments ?? [];
  const scheduledUpcoming = upcoming.filter((a) => a.status === AppointmentStatus.SCHEDULED);
  const listForUpcomingCard = inProgress.length > 0 ? scheduledUpcoming : upcoming;

  const openAppointment = (id: string) => router.push(`/(app)/appointments/${id}` as never);
  const joinConsultation = (id: string) =>
    router.push(`/(app)/appointments/${id}/consultation` as never);

  return (
    <View className="flex-1">
      <AppHeader subtitle="Your schedule and tasks for today" />
      <PageContainer refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View className="mb-4 flex-row justify-end">
        <Button size="sm" onPress={() => router.push('/(app)/booking' as never)}>
          Booking
        </Button>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-3">
        <StatCard
          label="Today's Appointments"
          value={stats?.todayAppointments}
          icon={<Calendar size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
        <StatCard
          label="Pending Requests"
          value={stats?.pendingBookingRequests}
          icon={<Clock3 size={20} color={colors.warning.DEFAULT} />}
          loading={isLoading}
          highlight={(stats?.pendingBookingRequests ?? 0) > 0}
        />
        <StatCard
          label="In Progress"
          value={stats?.inProgressCount}
          icon={<Video size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
        <StatCard
          label="Pending AI Reviews"
          value={stats?.pendingAiReviews}
          icon={<FileCheck size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
        <StatCard
          label="Active (Scheduled)"
          value={stats?.totalScheduled}
          icon={<Clock size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
      </View>

      {pendingBooking.length > 0 ? (
        <PendingRequestsPanel items={pendingBooking} loading={isLoading} />
      ) : null}

      {inProgress.length > 0 ? (
        <Card className="mb-4">
          <SectionHeader
            title="In Progress"
            subtitle={`${inProgress.length} consultation${inProgress.length === 1 ? '' : 's'} active now`}
            onViewAll={() => router.push('/(app)/appointments' as never)}
          />
          {inProgress.map((appt) => (
            <DashboardAppointmentRow
              key={appt.id}
              appt={appt}
              onOpen={() => openAppointment(appt.id)}
              onJoin={() => joinConsultation(appt.id)}
              inCallParticipants={livePresence?.[appt.id]?.participants}
            />
          ))}
        </Card>
      ) : null}

      <Card className="mb-4">
        <SectionHeader
          title="Upcoming Appointments"
          subtitle="In progress first, then scheduled"
          onViewAll={() => router.push('/(app)/appointments' as never)}
        />
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="mb-3 flex-row items-center gap-3">
              <Skeleton width={32} height={32} rounded="full" />
              <View className="flex-1 gap-1.5">
                <Skeleton height={16} width={192} />
                <Skeleton height={12} width={128} />
              </View>
            </View>
          ))
        ) : listForUpcomingCard.length === 0 ? (
          <Text className="py-6 text-center text-sm text-muted">
            {inProgress.length > 0
              ? 'No further scheduled appointments'
              : 'No active or upcoming appointments'}
          </Text>
        ) : (
          listForUpcomingCard.slice(0, 8).map((appt) => (
            <DashboardAppointmentRow
              key={appt.id}
              appt={appt}
              onOpen={() => openAppointment(appt.id)}
              onJoin={() => joinConsultation(appt.id)}
              inCallParticipants={livePresence?.[appt.id]?.participants}
            />
          ))
        )}
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Pending AI Reviews" />
        {isLoading ? (
          <Skeleton height={32} width={48} className="mb-4" />
        ) : (
          <Text className="mb-1 text-3xl font-inter-bold text-slate-900">
            {stats?.pendingAiReviews ?? 0}
          </Text>
        )}
        <Text className="mb-4 text-sm text-muted">
          AI outputs awaiting your approval before patients can see summaries.
        </Text>
        <Button variant="outline" size="sm" onPress={() => router.push('/(app)/ai' as never)}>
          Review AI Outputs
        </Button>
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Quick Actions" />
        {[
          { label: 'AI Assistant', icon: BrainCircuit, to: '/(app)/ai' },
          { label: 'View Documents', icon: FileText, to: '/(app)/documents' },
          { label: 'AI Outputs', icon: FileCheck, to: '/(app)/ai' },
        ].map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.to as never)}
            className="flex-row items-center gap-2 rounded-md p-2.5 active:bg-surface"
          >
            <action.icon size={16} color={colors.primary.DEFAULT} />
            <Text className="flex-1 text-sm text-slate-700">{action.label}</Text>
            <ChevronRight size={14} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
      </PageContainer>
    </View>
  );
}

function PatientDashboard() {
  const router = useRouter();
  const { data: livePresence } = useLivePresence();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: dashboardKeys.patient,
    queryFn: () => dashboardApi.getPatient(),
    retry: 1,
  });

  const stats = data?.stats;
  const pendingBooking = data?.pendingBookingRequests ?? [];
  const inProgress = data?.inProgressAppointments ?? [];
  const upcoming = data?.upcomingAppointments ?? [];
  const scheduledUpcoming = upcoming.filter((a) => a.status === AppointmentStatus.SCHEDULED);
  const listForUpcomingCard = inProgress.length > 0 ? scheduledUpcoming : upcoming;

  const openAppointment = (id: string) => router.push(`/(app)/appointments/${id}` as never);
  const joinConsultation = (id: string) =>
    router.push(`/(app)/appointments/${id}/consultation` as never);

  return (
    <View className="flex-1">
      <AppHeader subtitle="Your health at a glance" />
      <PageContainer refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View className="mb-4 flex-row justify-end">
        <Button size="sm" onPress={() => router.push('/(app)/booking' as never)}>
          Book appointment
        </Button>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-3">
        <StatCard
          label="Today's Appointments"
          value={stats?.todayAppointments}
          icon={<Calendar size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
        <StatCard
          label="Awaiting Approval"
          value={stats?.pendingBookingRequests}
          icon={<Clock3 size={20} color={colors.warning.DEFAULT} />}
          loading={isLoading}
          highlight={(stats?.pendingBookingRequests ?? 0) > 0}
        />
        <StatCard
          label="In Progress"
          value={stats?.inProgressCount}
          icon={<Video size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
        <StatCard
          label="Active (Scheduled)"
          value={stats?.totalScheduled}
          icon={<Clock size={20} color={colors.primary.DEFAULT} />}
          loading={isLoading}
        />
      </View>

      {pendingBooking.length > 0 ? (
        <Card className="mb-4">
          <SectionHeader
            title="Pending booking requests"
            subtitle="Waiting for doctor approval"
          />
          {pendingBooking.map((appt) => (
            <DashboardAppointmentRow
              key={appt.id}
              appt={appt}
              viewAs="patient"
              onOpen={() => openAppointment(appt.id)}
              onJoin={() => joinConsultation(appt.id)}
            />
          ))}
        </Card>
      ) : null}

      {inProgress.length > 0 ? (
        <Card className="mb-4">
          <SectionHeader
            title="In Progress"
            subtitle={`${inProgress.length} consultation${inProgress.length === 1 ? '' : 's'} active now`}
            onViewAll={() => router.push('/(app)/appointments' as never)}
          />
          {inProgress.map((appt) => (
            <DashboardAppointmentRow
              key={appt.id}
              appt={appt}
              viewAs="patient"
              onOpen={() => openAppointment(appt.id)}
              onJoin={() => joinConsultation(appt.id)}
              inCallParticipants={livePresence?.[appt.id]?.participants}
            />
          ))}
        </Card>
      ) : null}

      <Card className="mb-4">
        <SectionHeader
          title="Upcoming Appointments"
          subtitle="In progress first, then scheduled"
          onViewAll={() => router.push('/(app)/appointments' as never)}
        />
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="mb-3 flex-row items-center gap-3">
              <Skeleton width={32} height={32} rounded="full" />
              <View className="flex-1 gap-1.5">
                <Skeleton height={16} width={192} />
                <Skeleton height={12} width={128} />
              </View>
            </View>
          ))
        ) : listForUpcomingCard.length === 0 ? (
          <View className="items-center py-6">
            <Text className="mb-3 text-center text-sm text-muted">
              {inProgress.length > 0
                ? 'No further scheduled appointments'
                : 'No active or upcoming appointments'}
            </Text>
            <Button size="sm" onPress={() => router.push('/(app)/booking' as never)}>
              Book appointment
            </Button>
          </View>
        ) : (
          listForUpcomingCard.slice(0, 8).map((appt) => (
            <DashboardAppointmentRow
              key={appt.id}
              appt={appt}
              viewAs="patient"
              onOpen={() => openAppointment(appt.id)}
              onJoin={() => joinConsultation(appt.id)}
              inCallParticipants={livePresence?.[appt.id]?.participants}
            />
          ))
        )}
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Quick Actions" />
        {[
          { label: 'Book Appointment', icon: Calendar, to: '/(app)/booking' },
          { label: 'My Documents', icon: FileText, to: '/(app)/documents' },
          { label: 'AI Assistant', icon: BrainCircuit, to: '/(app)/ai' },
          { label: 'Appointments', icon: Calendar, to: '/(app)/appointments' },
        ].map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.to as never)}
            className="flex-row items-center gap-2 rounded-md p-2.5 active:bg-surface"
          >
            <action.icon size={16} color={colors.primary.DEFAULT} />
            <Text className="flex-1 text-sm text-slate-700">{action.label}</Text>
            <ChevronRight size={14} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
      </PageContainer>
    </View>
  );
}

export default function DashboardScreen() {
  const role = useAuthStore((s) => s.role);

  if (role === UserRole.ADMIN) return <AdminDashboard />;
  if (role === UserRole.DOCTOR) return <DoctorDashboard />;
  return <PatientDashboard />;
}
