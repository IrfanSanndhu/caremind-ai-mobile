import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search } from 'lucide-react-native';
import {
  Avatar,
  BottomSheet,
  Button,
  EmptyState,
  Input,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { SCROLL_BOTTOM_INSET } from '@/components/layout/TabBar';
import { getApiErrorMessage } from '@/api/errors';
import { patientsApi, patientKeys, GENDER_OPTIONS, formatGender } from '@/api/patients.api';
import { usersApi, userKeys } from '@/api/users.api';
import { PatientGender, UserRole, type Patient } from '@/types';
import { formatDate } from '@/utils/formatDate';
import { colors } from '@/constants/colors';

const invitePatientSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
});

type InvitePatientValues = z.infer<typeof invitePatientSchema>;

function PatientsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: patientKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => patientsApi.list({ page: 1, pageSize: 100 }),
    retry: 1,
  });

  const form = useForm<InvitePatientValues>({
    resolver: zodResolver(invitePatientSchema),
    defaultValues: { gender: PatientGender.MALE },
  });

  const inviteMutation = useMutation({
    mutationFn: usersApi.invitePatient,
    onSuccess: () => {
      toast.show({ title: 'Patient invitation sent!', variant: 'success' });
      setInviteOpen(false);
      form.reset({ gender: PatientGender.MALE });
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err: unknown) => {
      toast.show({
        title: 'Failed to send invitation',
        description: getApiErrorMessage(err),
        variant: 'error',
      });
    },
  });

  const searchLower = search.trim().toLowerCase();
  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (!searchLower) return all;
    return all.filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      return name.includes(searchLower) || p.email.toLowerCase().includes(searchLower);
    });
  }, [data?.items, searchLower]);

  const closeInvite = useCallback(() => {
    setInviteOpen(false);
    form.reset({ gender: PatientGender.MALE });
  }, [form]);

  const renderPatient = useCallback(
    ({ item }: { item: Patient }) => (
      <Pressable
        onPress={() => router.push(`/(app)/patients/${item.id}`)}
        className="mb-3 active:opacity-90"
      >
        <View className="flex-row items-center gap-3 rounded-card border border-border bg-white p-4 shadow-sm">
          <Avatar name={`${item.firstName} ${item.lastName}`} size="md" />
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-slate-900">
              {item.firstName} {item.lastName}
            </Text>
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {item.email}
            </Text>
            <Text className="mt-1 text-xs text-muted">
              {formatGender(item.gender)} · {item.sessionCount ?? 0} sessions
              {item.dateOfBirth ? ` · DOB ${formatDate(item.dateOfBirth)}` : ''}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [router],
  );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="View and invite patients" />

      <View className="px-4 pt-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChangeText={setSearch}
          trailingIcon={<Search size={18} color={colors.slate400} />}
        />
      </View>

      {isLoading ? (
        <View className="gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="rounded-card border border-border bg-white p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-64" />
            </View>
          ))}
        </View>
      ) : (
        <FlashList
          data={items}
          renderItem={renderPatient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 88 }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          ListEmptyComponent={
            <EmptyState
              title="No patients found"
              description="Invite a patient to get started."
              action={
                <Button leftIcon={<Plus size={16} color={colors.white} />} onPress={() => setInviteOpen(true)}>
                  Add Patient
                </Button>
              }
            />
          }
        />
      )}

      <Pressable
        onPress={() => setInviteOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add patient"
        className="absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
        style={{ bottom: SCROLL_BOTTOM_INSET }}
      >
        <Plus size={24} color={colors.white} strokeWidth={2.5} />
      </Pressable>

      <BottomSheet visible={inviteOpen} onClose={closeInvite} title="Add Patient">
        <View className="gap-4">
          <Controller
            control={form.control}
            name="firstName"
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                label="First name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="lastName"
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                label="Last name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="email"
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                label="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="gender"
            render={({ field: { onChange, value }, fieldState }) => (
              <Select
                label="Gender"
                value={value}
                options={[...GENDER_OPTIONS]}
                onChange={onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="dateOfBirth"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date of birth (optional)"
                placeholder="YYYY-MM-DD"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          <Controller
            control={form.control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone (optional)"
                keyboardType="phone-pad"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          <View className="flex-row gap-3 pt-2">
            <Button variant="outline" className="flex-1" onPress={closeInvite}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={inviteMutation.isPending}
              onPress={form.handleSubmit((values) => inviteMutation.mutate(values))}
            >
              Send Invite
            </Button>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

export default function PatientsIndexScreen() {
  return (
    <RoleGuard allowedRoles={[UserRole.DOCTOR]}>
      <PatientsScreen />
    </RoleGuard>
  );
}
