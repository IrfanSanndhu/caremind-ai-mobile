import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import {
  bookingApi,
  bookingKeys,
  type AvailabilityRule,
  type SlotDuration,
} from '@/api/booking.api';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { dashboardKeys } from '@/api/dashboard.api';
import { getApiErrorMessage } from '@/api/errors';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { BookingSlotPicker } from '@/components/booking/BookingSlotPicker';
import { PendingRequestsPanel } from '@/components/booking/PendingRequestsPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { AppointmentStatus, UserRole } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/cn';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayRule = {
  enabled: boolean;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

function rulesToDayState(rules: AvailabilityRule[]): DayRule[] {
  const byDay = new Map(rules.map((r) => [r.dayOfWeek, r]));
  return DAY_LABELS.map((_, dayOfWeek) => {
    const rule = byDay.get(dayOfWeek);
    return {
      enabled: Boolean(rule),
      dayOfWeek,
      startTime: rule?.startTime ?? '09:00',
      endTime: rule?.endTime ?? '17:00',
    };
  });
}

function PatientBookingView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [doctorId, setDoctorId] = useState(user?.primaryDoctorId ?? '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const doctorsQuery = useQuery({
    queryKey: bookingKeys.doctors(),
    queryFn: bookingApi.listDoctors,
  });

  const slotsQuery = useQuery({
    queryKey: bookingKeys.slots(doctorId),
    queryFn: () => bookingApi.getDoctorSlots(doctorId),
    enabled: Boolean(doctorId),
  });

  const timeZone = slotsQuery.data?.timezone ?? 'UTC';
  const slots = slotsQuery.data?.slots ?? [];
  const firstAvailableDate = useMemo(() => {
    const keys = Array.from(
      new Set(
        slots.map((s) =>
          new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(s)),
        ),
      ),
    ).sort();
    return keys[0] ?? null;
  }, [slots, timeZone]);

  useEffect(() => {
    setSelectedDate(null);
    setSelectedSlot(null);
  }, [doctorId]);

  useEffect(() => {
    if (!firstAvailableDate) {
      setSelectedDate(null);
      setSelectedSlot(null);
      return;
    }
    setSelectedDate((prev) => {
      if (prev) return prev;
      return firstAvailableDate;
    });
  }, [firstAvailableDate]);

  const bookMutation = useMutation({
    mutationFn: () => {
      if (!doctorId || !selectedSlot) throw new Error('Select a slot');
      return bookingApi.bookAppointment({ doctorId, scheduledAt: selectedSlot });
    },
    onSuccess: () => {
      toast.show({
        title: 'Booking request sent',
        description: 'Waiting for doctor approval',
        variant: 'success',
      });
      setSelectedSlot(null);
      void queryClient.invalidateQueries({ queryKey: bookingKeys.slots(doctorId) });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.patient });
      router.push('/(app)/appointments');
    },
    onError: (err) =>
      toast.show({ title: getApiErrorMessage(err, 'Could not book appointment'), variant: 'error' }),
  });

  const doctors = doctorsQuery.data ?? [];
  const sessionLabel =
    slotsQuery.data?.slotDurationMinutes === 'sixty' ? '1 hour' : '30 min';

  return (
    <PageContainer>
      <Card className="mb-4">
        <Text className="mb-3 text-base font-inter-semibold text-slate-900">Select doctor</Text>
        {doctorsQuery.isLoading ? (
          <Skeleton height={48} className="w-full" />
        ) : doctors.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No doctors available"
            description="Your organization has no doctors to book with yet."
          />
        ) : (
          <Select
            label="Doctor"
            value={doctorId || null}
            placeholder="Select a doctor…"
            onChange={setDoctorId}
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.fullName}${d.specialty ? ` — ${d.specialty}` : ''}`,
            }))}
          />
        )}
      </Card>

      {doctorId ? (
        <Card className="mb-4">
          <Text className="mb-1 text-base font-inter-semibold text-slate-900">Pick a time</Text>
          <Text className="mb-4 text-sm text-muted">
            {sessionLabel} sessions · times in doctor&apos;s timezone
          </Text>
          {slotsQuery.isLoading ? (
            <Skeleton height={160} className="w-full" />
          ) : (
            <BookingSlotPicker
              slots={slots}
              timeZone={timeZone}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
              }}
              onSelectSlot={setSelectedSlot}
            />
          )}
        </Card>
      ) : null}

      {selectedSlot ? (
        <Card className="mb-4">
          <Text className="text-sm text-muted">Selected time</Text>
          <Text className="mt-1 text-base font-inter-semibold text-slate-900">
            {formatDateTime(selectedSlot)}
          </Text>
          <Button
            className="mt-4"
            loading={bookMutation.isPending}
            onPress={() => bookMutation.mutate()}
          >
            Request appointment
          </Button>
        </Card>
      ) : null}
    </PageContainer>
  );
}

function DoctorBookingView() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [slotDuration, setSlotDuration] = useState<SlotDuration>('thirty');
  const [minLeadTimeHours, setMinLeadTimeHours] = useState('2');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');
  const [dayRules, setDayRules] = useState<DayRule[]>(rulesToDayState([]));

  const configQuery = useQuery({
    queryKey: bookingKeys.config(),
    queryFn: bookingApi.getMyConfig,
  });

  const pendingQuery = useQuery({
    queryKey: appointmentKeys.list({ status: AppointmentStatus.PENDING_APPROVAL, pageSize: 50 }),
    queryFn: () =>
      appointmentsApi.list({ status: AppointmentStatus.PENDING_APPROVAL, pageSize: 50 }),
  });

  useEffect(() => {
    if (!configQuery.data) return;
    const { settings, rules } = configQuery.data;
    setSlotDuration(settings.slotDurationMinutes);
    setMinLeadTimeHours(String(settings.minLeadTimeHours));
    setMaxAdvanceDays(String(settings.maxAdvanceDays));
    setDayRules(rulesToDayState(rules));
  }, [configQuery.data]);

  const settingsMutation = useMutation({
    mutationFn: () =>
      bookingApi.updateSettings({
        slotDurationMinutes: slotDuration,
        minLeadTimeHours: Number(minLeadTimeHours) || 0,
        maxAdvanceDays: Number(maxAdvanceDays) || 1,
      }),
    onSuccess: () => {
      toast.show({ title: 'Booking settings saved', variant: 'success' });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.config() });
    },
    onError: (err) =>
      toast.show({ title: getApiErrorMessage(err, 'Failed to save settings'), variant: 'error' }),
  });

  const availabilityMutation = useMutation({
    mutationFn: () => {
      const rules = dayRules
        .filter((d) => d.enabled)
        .map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
        }));
      if (rules.length === 0) throw new Error('Enable at least one day');
      return bookingApi.updateAvailability(rules);
    },
    onSuccess: () => {
      toast.show({ title: 'Availability updated', variant: 'success' });
      void queryClient.invalidateQueries({ queryKey: bookingKeys.config() });
    },
    onError: (err) =>
      toast.show({
        title: getApiErrorMessage(err, 'Failed to update availability'),
        variant: 'error',
      }),
  });

  const pendingItems = pendingQuery.data?.items ?? [];

  return (
    <PageContainer>
      <PendingRequestsPanel
        items={pendingItems}
        loading={pendingQuery.isLoading}
      />

      <Card className="mb-4">
        <Text className="mb-1 text-base font-inter-semibold text-slate-900">Booking settings</Text>
        <Text className="mb-4 text-sm text-muted">Session length and booking window</Text>

        {configQuery.isLoading ? (
          <Skeleton height={120} className="w-full" />
        ) : (
          <View className="gap-3">
            <Select
              label="Session length"
              value={slotDuration}
              onChange={setSlotDuration}
              options={[
                { value: 'thirty', label: '30 minutes' },
                { value: 'sixty', label: '1 hour' },
              ]}
            />
            <Input
              label="Minimum lead time (hours)"
              value={minLeadTimeHours}
              onChangeText={setMinLeadTimeHours}
              keyboardType="number-pad"
            />
            <Input
              label="Max advance booking (days)"
              value={maxAdvanceDays}
              onChangeText={setMaxAdvanceDays}
              keyboardType="number-pad"
            />
            <Button loading={settingsMutation.isPending} onPress={() => settingsMutation.mutate()}>
              Save settings
            </Button>
          </View>
        )}
      </Card>

      <Card className="mb-4">
        <Text className="mb-1 text-base font-inter-semibold text-slate-900">Weekly availability</Text>
        <Text className="mb-4 text-sm text-muted">Enable days and set working hours</Text>

        {configQuery.isLoading ? (
          <Skeleton height={200} className="w-full" />
        ) : (
          <View className="gap-3">
            {dayRules.map((day, index) => (
              <View
                key={day.dayOfWeek}
                className={cn(
                  'rounded-xl border p-3',
                  day.enabled ? 'border-primary/30 bg-primary-50/30' : 'border-border',
                )}
              >
                <Pressable
                  onPress={() => {
                    const next = [...dayRules];
                    next[index] = { ...day, enabled: !day.enabled };
                    setDayRules(next);
                  }}
                  className="mb-2 flex-row items-center justify-between"
                >
                  <Text className="font-inter-medium text-slate-900">{DAY_LABELS[day.dayOfWeek]}</Text>
                  <Text className="text-sm text-primary">{day.enabled ? 'On' : 'Off'}</Text>
                </Pressable>
                {day.enabled ? (
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Input
                        label="Start"
                        value={day.startTime}
                        onChangeText={(v) => {
                          const next = [...dayRules];
                          next[index] = { ...day, startTime: v };
                          setDayRules(next);
                        }}
                        placeholder="09:00"
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="End"
                        value={day.endTime}
                        onChangeText={(v) => {
                          const next = [...dayRules];
                          next[index] = { ...day, endTime: v };
                          setDayRules(next);
                        }}
                        placeholder="17:00"
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
            <Button
              loading={availabilityMutation.isPending}
              onPress={() => availabilityMutation.mutate()}
            >
              Save availability
            </Button>
          </View>
        )}
      </Card>
    </PageContainer>
  );
}

export default function BookingScreen() {
  const role = useAuthStore((s) => s.role);
  const isDoctor = role === UserRole.DOCTOR || role === UserRole.ADMIN;

  return (
    <View className="flex-1">
      <AppHeader
        subtitle={
          isDoctor
            ? 'Manage availability and approve booking requests'
            : 'Choose a doctor and request an appointment'
        }
      />
      {isDoctor ? <DoctorBookingView /> : <PatientBookingView />}
    </View>
  );
}
