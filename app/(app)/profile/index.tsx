import { useEffect, useState } from 'react';
import { UserRole } from '@/types';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import QRCode from 'react-native-qrcode-svg';
import { Key, LogOut, Monitor, Shield, ShieldCheck, Trash2 } from 'lucide-react-native';
import { authApi } from '@/api/auth.api';
import { getApiErrorMessage } from '@/api/errors';
import { Avatar } from '@/components/ui/Avatar';
import {
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  useToast,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/PageContainer';
import { AppHeader } from '@/components/layout/AppHeader';
import { useLogout } from '@/hooks/useLogout';
import { hydrateAuthProfileAfterLogin } from '@/hooks/useAuthProfile';
import { useAuthStore } from '@/stores/auth.store';
import { DEMO_EMAIL_DOMAIN, isDemoAccountEmail } from '@/constants/demo-accounts';
import { colors } from '@/constants/colors';
import type { TrustedDevice } from '@/types';
import { TimezoneSelect } from '@/components/shared/TimezoneSelect';
import { getUserDisplayName } from '@/utils/display-name';
import { formatDateTime } from '@/utils/formatDate';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();

  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [setupStep, setSetupStep] = useState<'qr' | 'verify'>('qr');

  const displayName = getUserDisplayName(user);
  const mfaEligible = user?.mfaEligible !== false && !isDemoAccountEmail(user?.email ?? '');
  const canSetTimezone = user?.role === UserRole.ADMIN || user?.role === UserRole.DOCTOR;
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC');

  useEffect(() => {
    if (user?.timezone) setTimezone(user.timezone);
  }, [user?.timezone]);

  const timezoneMutation = useMutation({
    mutationFn: (tz: string) => authApi.updateTimezone(tz),
    onSuccess: async (data) => {
      setTimezone(data.timezone);
      showToast({ title: 'Timezone updated', variant: 'success' });
      await hydrateAuthProfileAfterLogin();
    },
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Failed to update timezone'), variant: 'error' }),
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const setupMfaMutation = useMutation({
    mutationFn: authApi.setupMfa,
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Failed to start MFA setup'), variant: 'error' }),
  });

  const enableMfaMutation = useMutation({
    mutationFn: (code: string) => authApi.enableMfa(code),
    onSuccess: async () => {
      showToast({ title: 'MFA enabled successfully', variant: 'success' });
      setMfaSetupOpen(false);
      setMfaCode('');
      setSetupStep('qr');
      await hydrateAuthProfileAfterLogin();
    },
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Invalid code'), variant: 'error' }),
  });

  const trustedDevicesQuery = useQuery({
    queryKey: ['auth', 'trusted-devices'],
    queryFn: authApi.listTrustedDevices,
    enabled: Boolean(user?.mfaEnabled) && mfaEligible,
  });

  const revokeDeviceMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeTrustedDevice(id),
    onSuccess: () => {
      showToast({ title: 'Device removed', variant: 'success' });
      void queryClient.invalidateQueries({ queryKey: ['auth', 'trusted-devices'] });
    },
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Failed to remove device'), variant: 'error' }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      showToast({ title: 'Password updated successfully', variant: 'success' });
      passwordForm.reset();
    },
    onError: (err) =>
      showToast({ title: getApiErrorMessage(err, 'Failed to update password'), variant: 'error' }),
  });

  const handleSetupMfa = () => {
    setMfaSetupOpen(true);
    setSetupStep('qr');
    setMfaCode('');
    setupMfaMutation.mutate();
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Account and security" showProfileAction={false} />

      <PageContainer contentClassName="gap-4 max-w-2xl mx-auto w-full">
        <Card>
          <Text className="mb-3 text-base font-inter-semibold text-slate-900">Account</Text>
          <View className="flex-row items-center gap-4">
            <Avatar name={displayName || user?.email} size="lg" />
            <View className="min-w-0 flex-1">
              <Text className="text-xl font-inter-semibold text-slate-900" numberOfLines={1}>
                {displayName || user?.email}
              </Text>
              <Text className="text-sm text-muted" numberOfLines={1}>
                {user?.email}
              </Text>
              <View className="mt-2 flex-row flex-wrap items-center gap-2">
                <Badge variant="primary">{user?.role}</Badge>
                {user?.mfaEnabled ? <Badge variant="success">MFA Active</Badge> : null}
              </View>
            </View>
          </View>
        </Card>

        {canSetTimezone ? (
          <Card>
            <Text className="mb-3 text-base font-inter-semibold text-slate-900">Timezone</Text>
            <TimezoneSelect
              value={timezone}
              onChange={(tz) => timezoneMutation.mutate(tz)}
              disabled={timezoneMutation.isPending}
            />
          </Card>
        ) : null}

        <Card>
          <View className="mb-3 flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="text-base font-inter-semibold text-slate-900">
                Two-Factor Authentication
              </Text>
              <Text className="mt-1 text-sm text-muted">
                {!mfaEligible
                  ? 'Not available for demo clinic accounts.'
                  : user?.mfaEnabled
                    ? 'Your account is protected with MFA.'
                    : 'Add an extra layer of security.'}
              </Text>
            </View>
            {!mfaEligible ? (
              <Badge variant="gray">Unavailable</Badge>
            ) : user?.mfaEnabled ? (
              <ShieldCheck size={20} color={colors.success.DEFAULT} />
            ) : (
              <Shield size={20} color={colors.muted} />
            )}
          </View>

          {!mfaEligible ? (
            <Text className="text-sm text-muted">
              {`Accounts ending in @${DEMO_EMAIL_DOMAIN} cannot enable two-factor authentication.`}
            </Text>
          ) : null}

          {mfaEligible && !user?.mfaEnabled ? (
            !mfaSetupOpen ? (
              <Button variant="outline" onPress={handleSetupMfa} loading={setupMfaMutation.isPending}>
                Enable Two-Factor Auth
              </Button>
            ) : setupStep === 'qr' ? (
              <View className="items-center gap-4">
                {setupMfaMutation.isPending ? (
                  <>
                    <Skeleton width={200} height={200} rounded="lg" />
                    <Skeleton width={240} height={16} />
                  </>
                ) : setupMfaMutation.data ? (
                  <>
                    <Text className="text-center text-sm text-muted">
                      Scan this QR code with your authenticator app.
                    </Text>
                    <View className="rounded-lg border border-border bg-white p-4">
                      <QRCode value={setupMfaMutation.data.otpAuthUrl} size={200} />
                    </View>
                    <Text className="text-center text-xs text-muted">
                      Manual key:{' '}
                      <Text className="font-mono text-slate-700">
                        {setupMfaMutation.data.secret}
                      </Text>
                    </Text>
                    <Button onPress={() => setSetupStep('verify')}>Continue to verify</Button>
                    <Button
                      variant="ghost"
                      onPress={() => {
                        setMfaSetupOpen(false);
                        setMfaCode('');
                        setSetupStep('qr');
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Text className="text-sm text-danger">Could not load setup QR. Try again.</Text>
                )}
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-sm text-muted">
                  Enter the 6-digit code from your authenticator:
                </Text>
                <Input
                  label="Verification Code"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChangeText={(v) => setMfaCode(v.replace(/\D/g, ''))}
                />
                <Button
                  onPress={() => mfaCode.length === 6 && enableMfaMutation.mutate(mfaCode)}
                  loading={enableMfaMutation.isPending}
                  disabled={mfaCode.length !== 6}
                >
                  Verify & Enable
                </Button>
                <Button variant="ghost" onPress={() => setSetupStep('qr')}>
                  Back to QR code
                </Button>
              </View>
            )
          ) : null}

          {mfaEligible && user?.mfaEnabled ? (
            <View className="rounded-md bg-success/10 p-3">
              <Text className="text-sm text-success">
                Two-factor authentication is active and protecting your account.
              </Text>
            </View>
          ) : null}
        </Card>

        {mfaEligible && user?.mfaEnabled ? (
          <Card>
            <Text className="mb-1 text-base font-inter-semibold text-slate-900">
              Trusted Devices
            </Text>
            <Text className="mb-3 text-sm text-muted">
              Devices that can skip MFA for 30 days after you trust them at sign-in.
            </Text>
            {trustedDevicesQuery.isLoading ? (
              <View className="gap-2">
                <Skeleton height={56} />
                <Skeleton height={56} />
              </View>
            ) : trustedDevicesQuery.data?.length ? (
              <View className="overflow-hidden rounded-lg border border-border">
                {trustedDevicesQuery.data.map((device: TrustedDevice, index: number) => (
                  <View
                    key={device.id}
                    className={`flex-row items-center justify-between gap-3 bg-white px-4 py-3 ${
                      index > 0 ? 'border-t border-border' : ''
                    }`}
                  >
                    <View className="min-w-0 flex-1 flex-row items-start gap-3">
                      <Monitor size={18} color={colors.muted} />
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-inter-medium text-slate-900" numberOfLines={1}>
                          {device.deviceName}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted">
                          {device.isActive
                            ? `Trusted until ${formatDateTime(device.trustedUntil)}`
                            : 'Expired'}
                          {device.lastUsedAt
                            ? ` · Last used ${formatDateTime(device.lastUsedAt)}`
                            : ''}
                        </Text>
                      </View>
                    </View>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => revokeDeviceMutation.mutate(device.id)}
                      loading={revokeDeviceMutation.isPending}
                      leftIcon={<Trash2 size={16} color={colors.danger.DEFAULT} />}
                    >
                      Remove
                    </Button>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-muted">
                No trusted devices yet. After MFA at sign-in, choose Yes on the trust-device prompt.
              </Text>
            )}
          </Card>
        ) : null}

        <Card>
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-base font-inter-semibold text-slate-900">Change Password</Text>
              <Text className="mt-0.5 text-sm text-muted">Update your account password</Text>
            </View>
            <Key size={20} color={colors.muted} />
          </View>
          <View className="gap-3">
            <Controller
              control={passwordForm.control}
              name="currentPassword"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Current Password"
                  secureTextEntry
                  autoCapitalize="none"
                  value={value}
                  onChangeText={onChange}
                  error={passwordForm.formState.errors.currentPassword?.message}
                />
              )}
            />
            <Controller
              control={passwordForm.control}
              name="newPassword"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="New Password"
                  secureTextEntry
                  autoCapitalize="none"
                  value={value}
                  onChangeText={onChange}
                  error={passwordForm.formState.errors.newPassword?.message}
                />
              )}
            />
            <Controller
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Confirm New Password"
                  secureTextEntry
                  autoCapitalize="none"
                  value={value}
                  onChangeText={onChange}
                  error={passwordForm.formState.errors.confirmPassword?.message}
                />
              )}
            />
            <Button
              variant="outline"
              loading={changePasswordMutation.isPending}
              onPress={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))}
            >
              Update Password
            </Button>
          </View>
        </Card>

        <Button
          variant="danger"
          onPress={logout}
          leftIcon={<LogOut size={18} color={colors.white} />}
          className="mb-4"
        >
          Log Out
        </Button>
      </PageContainer>
    </View>
  );
}
