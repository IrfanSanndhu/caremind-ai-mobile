import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Activity, Eye, EyeOff, Shield } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { authApi } from '@/api/auth.api';
import { getApiErrorMessage } from '@/api/errors';
import { BottomSheet, Button, Card, Input, useToast } from '@/components/ui';
import { colors } from '@/constants/colors';
import { hydrateAuthProfileAfterLogin } from '@/hooks/useAuthProfile';
import { getOrCreateDeviceId } from '@/lib/device';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/utils/cn';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const mfaSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type MfaFormValues = z.infer<typeof mfaSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { login } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [trustPromptOpen, setTrustPromptOpen] = useState(false);
  const [trustRegistering, setTrustRegistering] = useState(false);

  const finishLogin = useCallback(() => {
    router.replace('/(app)/dashboard');
  }, [router]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const {
    control: mfaControl,
    handleSubmit: handleMfaSubmit,
    watch: watchMfa,
    formState: { errors: mfaErrors },
    setValue: setMfaValue,
  } = useForm<MfaFormValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  const mfaCode = watchMfa('code', '');

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    const remember = Boolean(values.rememberMe);
    setRememberMe(remember);

    try {
      const deviceId = await getOrCreateDeviceId();
      const res = await authApi.login({
        email: values.email,
        password: values.password,
        rememberMe: remember,
        deviceId,
      });

      if (res.requiresMfa && res.mfaToken) {
        setLoginEmail(values.email);
        setMfaToken(res.mfaToken);
        setMfaStep(true);
        return;
      }

      if (res.user && res.accessToken && res.refreshToken) {
        login(res.user, res.accessToken, res.refreshToken);
        await hydrateAuthProfileAfterLogin();
        finishLogin();
        return;
      }

      toast.show({ title: 'Sign in failed. Please try again.', variant: 'error' });
    } catch (err: unknown) {
      toast.show({
        title: getApiErrorMessage(err, 'Sign in failed. Please try again.'),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onMfaSubmit = async (values: MfaFormValues) => {
    setIsLoading(true);

    try {
      const res = await authApi.verifyMfa({
        mfaToken,
        code: values.code,
        rememberMe,
      });

      const user = { ...res.user, email: res.user.email || loginEmail };
      login(user, res.accessToken, res.refreshToken);
      await hydrateAuthProfileAfterLogin();
      setTrustPromptOpen(true);
    } catch (err: unknown) {
      toast.show({
        title: getApiErrorMessage(err, 'Verification failed. Please try again.'),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrustYes = async () => {
    setTrustRegistering(true);

    try {
      const deviceId = await getOrCreateDeviceId();
      await authApi.registerTrustedDevice(deviceId);
      toast.show({
        title: 'This device is trusted for 30 days',
        variant: 'success',
      });
      setTrustPromptOpen(false);
      finishLogin();
    } catch (err: unknown) {
      toast.show({
        title: getApiErrorMessage(err, 'Something went wrong. Please try again.'),
        variant: 'error',
      });
    } finally {
      setTrustRegistering(false);
    }
  };

  const handleTrustNo = () => {
    setTrustPromptOpen(false);
    finishLogin();
  };

  const handleMfaCodeChange = (text: string, onChange: (value: string) => void) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    onChange(digits);
    if (digits.length === 6) {
      void handleMfaSubmit(onMfaSubmit)();
    }
  };

  return (
    <View className="flex-1">
      <LinearGradient
        colors={[colors.primary[600], colors.primary.DEFAULT, colors.secondary.DEFAULT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-5 py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8 items-center">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Activity size={24} color={colors.white} />
            </View>
            <Text className="text-2xl font-inter-bold text-white">CareMind AI</Text>
          </View>

          <Card className="shadow-lg shadow-black/10" padded>
            {!mfaStep ? (
                <View>
                  <View className="mb-6">
                    <Text className="text-3xl font-inter-bold text-slate-900">Welcome back</Text>
                    <Text className="mt-1 text-muted">Sign in to your account</Text>
                  </View>

                  <View className="gap-4">
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Email address"
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                          placeholder="you@example.com"
                          error={errors.email?.message}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Password"
                          secureTextEntry={!showPassword}
                          autoComplete="password"
                          placeholder="••••••••"
                          error={errors.password?.message}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          trailingIcon={
                            <Pressable
                              onPress={() => setShowPassword((prev) => !prev)}
                              accessibilityRole="button"
                              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                              hitSlop={8}
                            >
                              {showPassword ? (
                                <EyeOff size={18} color={colors.muted} />
                              ) : (
                                <Eye size={18} color={colors.muted} />
                              )}
                            </Pressable>
                          }
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name="rememberMe"
                      render={({ field: { onChange, value } }) => (
                        <Pressable
                          onPress={() => onChange(!value)}
                          className="flex-row items-start gap-3"
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: Boolean(value) }}
                        >
                          <View
                            className={cn(
                              'mt-0.5 h-5 w-5 items-center justify-center rounded border',
                              value ? 'border-primary bg-primary' : 'border-border bg-white',
                            )}
                          >
                            {value ? <Text className="text-xs text-white">✓</Text> : null}
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm text-slate-700">Remember me</Text>
                            <Text className="mt-0.5 text-xs text-muted">
                              Stay signed in for 5 days on this device
                            </Text>
                          </View>
                        </Pressable>
                      )}
                    />

                    <Button size="lg" loading={isLoading} onPress={handleSubmit(onSubmit)}>
                      Sign in
                    </Button>
                  </View>

                  <Text className="mt-6 text-center text-sm text-muted">
                    New organization?{' '}
                    <Link href="/(auth)/register" asChild>
                      <Text className="font-inter-medium text-primary">Register here</Text>
                    </Link>
                  </Text>
                </View>
              ) : (
                <View>
                  <View className="mb-6 items-center">
                    <View className="mb-4 h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                      <Shield size={24} color={colors.primary.DEFAULT} />
                    </View>
                    <Text className="text-center text-3xl font-inter-bold text-slate-900">
                      Two-Factor Auth
                    </Text>
                    <Text className="mt-2 text-center text-muted">
                      Enter the 6-digit code from your authenticator app
                    </Text>
                  </View>

                  <View className="gap-4">
                    <Controller
                      control={mfaControl}
                      name="code"
                      render={({ field: { onChange, value } }) => (
                        <View className="items-center">
                          <TextInput
                            value={value}
                            onChangeText={(text) => handleMfaCodeChange(text, onChange)}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholder="000000"
                            autoFocus
                            className={cn(
                              'h-14 w-48 rounded-lg border-2 text-center text-3xl font-inter-bold tracking-widest text-slate-900',
                              mfaErrors.code
                                ? 'border-danger'
                                : mfaCode.length === 6
                                  ? 'border-success'
                                  : 'border-border',
                            )}
                            placeholderTextColor={colors.slate400}
                          />
                          {mfaErrors.code ? (
                            <Text className="mt-2 text-center text-sm text-danger">
                              {mfaErrors.code.message}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    />

                    <Button size="lg" loading={isLoading} onPress={handleMfaSubmit(onMfaSubmit)}>
                      Verify
                    </Button>

                    <Pressable
                      onPress={() => {
                        setMfaStep(false);
                        setMfaValue('code', '');
                      }}
                      className="items-center py-2"
                    >
                      <Text className="text-sm text-muted">Back to login</Text>
                    </Pressable>
                  </View>
                </View>
              )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={trustPromptOpen}
        onClose={handleTrustNo}
        title="Trust this device?"
        subtitle="Skip MFA on this device for the next 30 days"
        enableDragToClose={!trustRegistering}
      >
        <Text className="mb-6 text-sm leading-5 text-muted">
          Only trust devices you control. You can revoke trusted devices anytime from your profile
          settings.
        </Text>
        <View className="gap-3">
          <Button loading={trustRegistering} onPress={handleTrustYes}>
            Yes, trust this device
          </Button>
          <Button variant="outline" disabled={trustRegistering} onPress={handleTrustNo}>
            Not now
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}
