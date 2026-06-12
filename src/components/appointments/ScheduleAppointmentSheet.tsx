import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, Text, View } from 'react-native';
import { z } from 'zod';

import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { getApiErrorMessage } from '@/api/errors';
import { patientsApi, patientKeys } from '@/api/patients.api';
import { usersApi, userKeys } from '@/api/users.api';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/colors';
import { UserRole, type UserRole as UserRoleType } from '@/types';
import { formatDateTime } from '@/utils/formatDate';

const createSchema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  doctorId: z.string().min(1, 'Select a doctor'),
});

type CreateFormValues = z.infer<typeof createSchema>;

function defaultScheduledAt(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(0);
  d.setHours(d.getHours() + 1);
  return d;
}

interface ScheduleAppointmentSheetProps {
  visible: boolean;
  onClose: () => void;
  role: UserRoleType | null;
}

export function ScheduleAppointmentSheet({
  visible,
  onClose,
  role,
}: ScheduleAppointmentSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isAdmin = role === UserRole.ADMIN;
  const isDoctor = role === UserRole.DOCTOR;

  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { doctorId: '', patientId: '' },
  });

  const selectedDoctorId = form.watch('doctorId');
  const selectedPatientId = form.watch('patientId');

  const { data: doctorProfiles, isLoading: doctorsLoading } = useQuery({
    queryKey: userKeys.doctorProfiles(),
    queryFn: () => usersApi.doctorProfiles(),
    enabled: visible && (isAdmin || isDoctor),
    retry: 1,
  });

  const resolvedDoctorId =
    selectedDoctorId ||
    (isDoctor && doctorProfiles?.length === 1 ? doctorProfiles[0].id : '');

  useEffect(() => {
    if (!visible) return;
    form.setValue('patientId', '');
    if (!isDoctor) {
      form.setValue('doctorId', '');
    }
    setScheduledAt(defaultScheduledAt());
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, [visible, isDoctor, form]);

  useEffect(() => {
    if (!visible) return;
    if (isDoctor && doctorProfiles?.length === 1) {
      form.setValue('doctorId', doctorProfiles[0].id, { shouldValidate: true });
    }
  }, [visible, isDoctor, doctorProfiles, form]);

  const patientsEnabled = visible && (isDoctor || (isAdmin && Boolean(selectedDoctorId)));
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: patientKeys.list({
      doctorId: isAdmin ? selectedDoctorId : undefined,
      pageSize: 100,
    }),
    queryFn: () =>
      patientsApi.list({
        doctorId: isAdmin ? selectedDoctorId : undefined,
        pageSize: 100,
      }),
    enabled: patientsEnabled,
    retry: 1,
  });

  useEffect(() => {
    if (isAdmin) {
      form.setValue('patientId', '');
    }
  }, [selectedDoctorId, isAdmin, form]);

  const createMutation = useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: () => {
      toast.show({ title: 'Appointment scheduled', variant: 'success' });
      onClose();
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
    onError: (err) =>
      toast.show({
        title: getApiErrorMessage(err, 'Failed to schedule appointment'),
        variant: 'error',
      }),
  });

  const doctorOptions = (doctorProfiles ?? []).map((d) => ({
    value: d.id,
    label: d.email
      ? `Dr. ${d.firstName} ${d.lastName} (${d.email})`.trim()
      : `Dr. ${d.firstName} ${d.lastName}`.trim(),
  }));

  const patientOptions = (patientsData?.items ?? []).map((p) => ({
    value: p.id,
    label: `${p.firstName} ${p.lastName}`.trim(),
  }));

  const noDoctors = isAdmin && !doctorsLoading && doctorOptions.length === 0;
  const noPatients = patientsEnabled && !patientsLoading && patientOptions.length === 0;

  const submitDisabled =
    createMutation.isPending ||
    doctorsLoading ||
    (patientsEnabled && patientsLoading) ||
    noDoctors ||
    noPatients ||
    !selectedPatientId ||
    !resolvedDoctorId;

  const onSubmit = form.handleSubmit((values) => {
    const doctorId = values.doctorId || resolvedDoctorId;
    if (!doctorId) return;
    createMutation.mutate({
      patientId: values.patientId,
      doctorId,
      scheduledAt: scheduledAt.toISOString(),
    });
  });

  const onDateChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (!date) return;
    const next = new Date(scheduledAt);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setScheduledAt(next);
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    }
  };

  const onTimeChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (!date) return;
    const next = new Date(scheduledAt);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setScheduledAt(next);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Schedule appointment"
      subtitle="Create an appointment for a patient"
      enableDragToClose={!createMutation.isPending}
    >
      <View className="gap-4 pb-2">
          {noDoctors ? (
            <Text className="rounded-lg bg-surface p-3 text-sm text-muted">
              No doctors found. Invite a doctor first before scheduling appointments.
            </Text>
          ) : null}

          {isAdmin ? (
            <Controller
              control={form.control}
              name="doctorId"
              render={({ field: { value, onChange } }) => (
                <Select
                  label="Doctor"
                  placeholder={doctorsLoading ? 'Loading doctors…' : 'Select doctor'}
                  value={value || null}
                  options={doctorOptions}
                  onChange={(id) => {
                    onChange(id);
                    form.setValue('patientId', '');
                  }}
                  disabled={doctorsLoading || doctorOptions.length === 0}
                  error={form.formState.errors.doctorId?.message}
                />
              )}
            />
          ) : null}

          <Controller
            control={form.control}
            name="patientId"
            render={({ field: { value, onChange } }) => (
              <Select
                label="Patient"
                placeholder={
                  isAdmin && !selectedDoctorId
                    ? 'Select a doctor first'
                    : patientsLoading
                      ? 'Loading patients…'
                      : 'Select patient'
                }
                value={value || null}
                options={patientOptions}
                onChange={onChange}
                disabled={isAdmin ? !selectedDoctorId || patientsLoading : patientsLoading}
                error={form.formState.errors.patientId?.message}
              />
            )}
          />

          {noPatients ? (
            <Text className="rounded-lg bg-surface p-3 text-sm text-muted">
              {isAdmin
                ? 'This doctor has no assigned patients. Invite a patient and assign them to this doctor first.'
                : 'You have no assigned patients yet. Invite a patient before scheduling.'}
            </Text>
          ) : null}

          <View>
            <Text className="mb-1.5 text-sm font-inter-medium text-slate-700">Date & time</Text>
            <Pressable
              onPress={() => {
                if (Platform.OS === 'ios') {
                  setShowDatePicker((v) => !v);
                } else {
                  setShowDatePicker(true);
                }
              }}
              className="rounded-xl border border-border bg-white px-4 py-3 active:bg-surface"
            >
              <Text className="text-sm text-slate-900">{formatDateTime(scheduledAt.toISOString())}</Text>
            </Pressable>
            {Platform.OS === 'ios' && showDatePicker ? (
              <View className="mt-2 overflow-hidden rounded-xl border border-border">
                <DateTimePicker
                  value={scheduledAt}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_e, date) => {
                    if (date) setScheduledAt(date);
                  }}
                  textColor={colors.slate900}
                />
              </View>
            ) : null}
            {Platform.OS === 'android' && showDatePicker ? (
              <DateTimePicker
                value={scheduledAt}
                mode="date"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            ) : null}
            {Platform.OS === 'android' && showTimePicker ? (
              <DateTimePicker value={scheduledAt} mode="time" onChange={onTimeChange} />
            ) : null}
          </View>

          <View className="flex-row gap-3 pt-2">
            <Button variant="outline" className="flex-1" onPress={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button className="flex-1" loading={createMutation.isPending} disabled={submitDisabled} onPress={onSubmit}>
              Schedule
            </Button>
          </View>
      </View>
    </BottomSheet>
  );
}
