import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Stethoscope,
} from 'lucide-react-native';
import { usersApi, userKeys } from '@/api/users.api';
import { GENDER_OPTIONS } from '@/api/patients.api';
import { getApiErrorMessage } from '@/api/errors';
import { Avatar } from '@/components/ui/Avatar';
import {
  Badge,
  BottomSheet,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { AppHeader } from '@/components/layout/AppHeader';
import { colors } from '@/constants/colors';
import { UserRole, PatientGender, type User, type UserRole as UserRoleType } from '@/types';
import { formatDate, formatRelative } from '@/utils';
import { cn } from '@/utils/cn';

type RoleFilter = 'all' | 'doctor' | 'patient' | 'admin';

const inviteDoctorSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
});

const invitePatientSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  doctorId: z.string().uuid('Select a doctor'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
});

type InviteDoctorValues = z.infer<typeof inviteDoctorSchema>;
type InvitePatientValues = z.infer<typeof invitePatientSchema>;

const ROLE_TABS: { label: string; value: RoleFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Doctors', value: 'doctor' },
  { label: 'Patients', value: 'patient' },
];

const ROLE_BADGE: Record<UserRoleType, 'primary' | 'secondary' | 'success'> = {
  admin: 'secondary',
  doctor: 'primary',
  patient: 'success',
};

function UsersScreen() {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [inviteDoctorOpen, setInviteDoctorOpen] = useState(false);
  const [invitePatientOpen, setInvitePatientOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const showDoctorFilter = roleFilter !== 'doctor';

  const effectiveRole =
    showDoctorFilter && doctorFilter
      ? 'patient'
      : roleFilter !== 'all'
        ? (roleFilter as 'admin' | 'doctor' | 'patient')
        : undefined;

  const params = {
    role: effectiveRole,
    doctorId: showDoctorFilter && doctorFilter ? doctorFilter : undefined,
    search: search.trim() || undefined,
    page,
    pageSize: 20,
  };

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.list(params),
    retry: 1,
  });

  const { data: doctorProfiles } = useQuery({
    queryKey: userKeys.doctorProfiles(),
    queryFn: () => usersApi.doctorProfiles(),
    retry: 1,
  });

  const visibleUsers = useMemo(() => {
    const items = data?.items ?? [];
    if (!showDoctorFilter || !doctorFilter) return items;
    return items.filter((u: User) => u.role === 'patient');
  }, [data?.items, doctorFilter, showDoctorFilter]);

  const doctorForm = useForm<InviteDoctorValues>({
    resolver: zodResolver(inviteDoctorSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      specialty: '',
      licenseNumber: '',
    },
  });

  const patientForm = useForm<InvitePatientValues>({
    resolver: zodResolver(invitePatientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      doctorId: '',
      gender: PatientGender.MALE,
      dateOfBirth: '',
      phone: '',
    },
  });

  const inviteDoctorMutation = useMutation({
    mutationFn: usersApi.inviteDoctor,
    onSuccess: () => {
      showToast({ title: 'Doctor invitation sent', variant: 'success' });
      setInviteDoctorOpen(false);
      doctorForm.reset();
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Failed to send invitation'), variant: 'error' }),
  });

  const invitePatientMutation = useMutation({
    mutationFn: usersApi.invitePatient,
    onSuccess: () => {
      showToast({ title: 'Patient invitation sent', variant: 'success' });
      setInvitePatientOpen(false);
      patientForm.reset({ gender: PatientGender.MALE });
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Failed to send invitation'), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      showToast({ title: 'User removed', variant: 'success' });
      setDeleteUserId(null);
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Failed to delete user'), variant: 'error' }),
  });

  const doctorOptions = useMemo(
    () =>
      (doctorProfiles ?? []).map((d: { id: string; firstName: string; lastName: string; email?: string }) => ({
        value: d.id,
        label: d.email
          ? `Dr. ${d.firstName} ${d.lastName} (${d.email})`.trim()
          : `Dr. ${d.firstName} ${d.lastName}`.trim(),
      })),
    [doctorProfiles],
  );

  const renderUser = useCallback(
    ({ item }: { item: User }) => (
      <View className="mb-3 rounded-card border border-border bg-white p-4">
        <View className="flex-row items-start gap-3">
          <Avatar name={item.name ?? item.email} size="md" />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-inter-semibold text-slate-900" numberOfLines={1}>
              {item.name ?? item.email}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {item.email}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <Badge variant={ROLE_BADGE[item.role]}>{item.role}</Badge>
              {item.mfaEnabled ? (
                <View className="flex-row items-center gap-1">
                  <ShieldCheck size={14} color={colors.success.DEFAULT} />
                  <Text className="text-xs text-success">MFA</Text>
                </View>
              ) : null}
            </View>
            {item.role === 'patient' && item.primaryDoctorName ? (
              <Text className="mt-1 text-xs text-muted">{item.primaryDoctorName}</Text>
            ) : null}
            <Text className="mt-1 text-xs text-muted">
              {item.lastLogin ? `Last login ${formatRelative(item.lastLogin)}` : 'Never logged in'}
              {item.createdAt ? ` · Joined ${formatDate(item.createdAt)}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => setDeleteUserId(item.id)}
            accessibilityLabel={`Delete ${item.email}`}
            className="rounded-full p-2 active:bg-danger/10"
          >
            <Trash2 size={18} color={colors.danger.DEFAULT} />
          </Pressable>
        </View>
      </View>
    ),
    [],
  );

  const listHeader = (
    <View className="mb-4 gap-3">
      <View className="flex-row flex-wrap gap-2">
        {ROLE_TABS.map((tab) => (
          <Pressable
            key={tab.value}
            onPress={() => {
              setRoleFilter(tab.value);
              setPage(1);
              if (tab.value === 'doctor' || tab.value === 'all') setDoctorFilter('');
            }}
            className={cn(
              'rounded-lg px-3 py-2',
              roleFilter === tab.value ? 'bg-primary' : 'bg-white border border-border',
            )}
          >
            <Text
              className={cn(
                'text-sm font-inter-medium',
                roleFilter === tab.value ? 'text-white' : 'text-muted',
              )}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showDoctorFilter && doctorOptions.length > 0 ? (
        <Select
          label="Filter by doctor"
          placeholder="All doctors"
          value={doctorFilter || null}
          options={[{ value: '', label: 'All doctors' }, ...doctorOptions]}
          onChange={(value) => {
            setDoctorFilter(value);
            setPage(1);
            if (value) setRoleFilter('patient');
          }}
        />
      ) : null}

      <Input
        placeholder="Search users..."
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          setPage(1);
        }}
        trailingIcon={<Search size={18} color={colors.slate400} />}
      />
    </View>
  );

  const listFooter =
    data && data.totalPages > 1 ? (
      <View className="mt-2 flex-row items-center justify-between gap-3 pb-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <Text className="text-sm text-muted">
          Page {page} of {data.totalPages}
        </Text>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= data.totalPages}
          onPress={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </View>
    ) : (
      <View className="h-4" />
    );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Manage doctors and patients" />

      <View className="min-h-0 flex-1 px-4 pt-4">
        {isLoading ? (
          <PageContainer scrollEnabled={false} bottomPadding={0}>
            {listHeader}
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={96} className="mb-3 rounded-card" />
            ))}
          </PageContainer>
        ) : (
          <FlashList
            data={visibleUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            ListEmptyComponent={
              <EmptyState title="No users found" description="Try adjusting your filters or search." />
            }
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            contentContainerStyle={{ paddingBottom: 88 }}
          />
        )}
      </View>

      <View className="absolute bottom-5 right-5 items-end gap-3">
        {fabMenuOpen ? (
          <>
            <Pressable
              onPress={() => {
                setFabMenuOpen(false);
                setInvitePatientOpen(true);
              }}
              className="flex-row items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-md"
            >
              <UserPlus size={18} color={colors.primary.DEFAULT} />
              <Text className="text-sm font-inter-medium text-slate-900">Invite Patient</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFabMenuOpen(false);
                setInviteDoctorOpen(true);
              }}
              className="flex-row items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-md"
            >
              <Stethoscope size={18} color={colors.secondary.DEFAULT} />
              <Text className="text-sm font-inter-medium text-slate-900">Invite Doctor</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          onPress={() => setFabMenuOpen((open) => !open)}
          accessibilityLabel="Invite users"
          className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
        >
          <Plus size={24} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      <BottomSheet
        visible={inviteDoctorOpen}
        onClose={() => {
          setInviteDoctorOpen(false);
          doctorForm.reset();
        }}
        title="Invite Doctor"
        subtitle="Send an invitation to join as a doctor"
      >
        <View className="gap-3 pb-2">
          <Input
            label="First Name"
            value={doctorForm.watch('firstName')}
            onChangeText={(v) => doctorForm.setValue('firstName', v, { shouldValidate: true })}
            error={doctorForm.formState.errors.firstName?.message}
          />
          <Input
            label="Last Name"
            value={doctorForm.watch('lastName')}
            onChangeText={(v) => doctorForm.setValue('lastName', v, { shouldValidate: true })}
            error={doctorForm.formState.errors.lastName?.message}
          />
          <Input
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={doctorForm.watch('email')}
            onChangeText={(v) => doctorForm.setValue('email', v, { shouldValidate: true })}
            error={doctorForm.formState.errors.email?.message}
          />
          <Input
            label="Specialty"
            placeholder="e.g. Cardiology"
            value={doctorForm.watch('specialty') ?? ''}
            onChangeText={(v) => doctorForm.setValue('specialty', v)}
          />
          <Input
            label="License Number"
            placeholder="e.g. MD-12345"
            value={doctorForm.watch('licenseNumber') ?? ''}
            onChangeText={(v) => doctorForm.setValue('licenseNumber', v)}
          />
          <View className="mt-2 flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => {
                setInviteDoctorOpen(false);
                doctorForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={inviteDoctorMutation.isPending}
              onPress={doctorForm.handleSubmit((values) => inviteDoctorMutation.mutate(values))}
            >
              Send Invitation
            </Button>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={invitePatientOpen}
        onClose={() => {
          setInvitePatientOpen(false);
          patientForm.reset({ gender: PatientGender.MALE });
        }}
        title="Invite Patient"
        subtitle="Send an invitation to join as a patient"
      >
        <View className="gap-3 pb-2">
          <Input
            label="First Name"
            value={patientForm.watch('firstName')}
            onChangeText={(v) => patientForm.setValue('firstName', v, { shouldValidate: true })}
            error={patientForm.formState.errors.firstName?.message}
          />
          <Input
            label="Last Name"
            value={patientForm.watch('lastName')}
            onChangeText={(v) => patientForm.setValue('lastName', v, { shouldValidate: true })}
            error={patientForm.formState.errors.lastName?.message}
          />
          <Input
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={patientForm.watch('email')}
            onChangeText={(v) => patientForm.setValue('email', v, { shouldValidate: true })}
            error={patientForm.formState.errors.email?.message}
          />
          <Controller
            control={patientForm.control}
            name="doctorId"
            render={({ field: { value, onChange } }) => (
              <Select
                label="Assign to doctor"
                placeholder="Select doctor"
                value={value || null}
                options={doctorOptions}
                onChange={onChange}
                error={patientForm.formState.errors.doctorId?.message}
              />
            )}
          />
          <Controller
            control={patientForm.control}
            name="gender"
            render={({ field: { value, onChange } }) => (
              <Select
                label="Gender"
                value={value}
                options={[...GENDER_OPTIONS]}
                onChange={onChange}
                error={patientForm.formState.errors.gender?.message}
              />
            )}
          />
          <Input
            label="Date of Birth"
            placeholder="YYYY-MM-DD"
            value={patientForm.watch('dateOfBirth') ?? ''}
            onChangeText={(v) => patientForm.setValue('dateOfBirth', v)}
          />
          <Input
            label="Phone"
            keyboardType="phone-pad"
            placeholder="+1 (555) 000-0000"
            value={patientForm.watch('phone') ?? ''}
            onChangeText={(v) => patientForm.setValue('phone', v)}
          />
          <View className="mt-2 flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => {
                setInvitePatientOpen(false);
                patientForm.reset({ gender: PatientGender.MALE });
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={invitePatientMutation.isPending}
              onPress={patientForm.handleSubmit((values) => invitePatientMutation.mutate(values))}
            >
              Send Invitation
            </Button>
          </View>
        </View>
      </BottomSheet>

      <Modal
        visible={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        title="Remove User"
      >
        <Text className="text-base text-slate-700">
          Are you sure you want to remove this user? They will lose access immediately.
        </Text>
        <View className="mt-5 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={() => setDeleteUserId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={deleteMutation.isPending}
            onPress={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
          >
            Remove
          </Button>
        </View>
      </Modal>
    </View>
  );
}

export default function UsersPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN]}>
      <UsersScreen />
    </RoleGuard>
  );
}
