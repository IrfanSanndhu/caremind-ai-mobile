import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Activity, Check, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { goToLoginOnBack, useAuthBackHandler } from '@/hooks/useAuthBackHandler';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { authApi } from '@/api/auth.api';
import { getApiErrorMessage } from '@/api/errors';
import { Button, Card, Input, useToast } from '@/components/ui';
import { colors } from '@/constants/colors';
import { hydrateAuthProfileAfterLogin } from '@/hooks/useAuthProfile';
import { useAuthStore } from '@/stores/auth.store';
import { generateSlug } from '@/utils';
import { cn } from '@/utils/cn';

const step1Schema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  orgSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
});

const step2Schema = z
  .object({
    adminEmail: z.string().email('Enter a valid email'),
    adminPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include one uppercase letter')
      .regex(/[0-9]/, 'Include one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

const STEPS = [
  { num: 1, label: 'Organization' },
  { num: 2, label: 'Admin Account' },
  { num: 3, label: 'Review' },
] as const;

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const barColors = ['bg-danger', 'bg-warning', 'bg-warning', 'bg-success'];

  return {
    score,
    label: labels[score - 1] ?? 'Weak',
    color: barColors[score - 1] ?? 'bg-danger',
  };
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View className="mb-8 flex-row flex-wrap items-center gap-y-2">
      {STEPS.map((step, idx) => {
        const isComplete = currentStep > step.num;
        const isActive = currentStep === step.num;

        return (
          <View key={step.num} className="flex-row items-center">
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{
                backgroundColor: isComplete
                  ? colors.success.DEFAULT
                  : isActive
                    ? colors.primary.DEFAULT
                    : colors.border,
              }}
            >
              {isComplete ? (
                <Check size={16} color={colors.white} />
              ) : (
                <Text
                  className={cn(
                    'text-sm font-inter-semibold',
                    isActive ? 'text-white' : 'text-muted',
                  )}
                >
                  {step.num}
                </Text>
              )}
            </View>

            <Text
              className={cn(
                'ml-2 text-sm font-inter-medium',
                isActive ? 'text-slate-900' : 'text-muted',
              )}
            >
              {step.label}
            </Text>

            {idx < STEPS.length - 1 ? (
              <ChevronRight size={16} color={colors.muted} style={{ marginHorizontal: 6 }} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { login } = useAuthStore();

  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Values | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const goToLogin = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  const handleHardwareBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      return true;
    }
    return goToLoginOnBack(router);
  }, [router, step]);

  useAuthBackHandler(handleHardwareBack);

  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { orgName: '', orgSlug: '' },
  });

  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { adminEmail: '', adminPassword: '', confirmPassword: '' },
  });

  const orgNameValue = form1.watch('orgName', '');
  const passwordValue = form2.watch('adminPassword', '');
  const slugValue = form1.watch('orgSlug', '');
  const strength = passwordStrength(passwordValue);

  const onStep1Submit = (data: Step1Values) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = (data: Step2Values) => {
    setStep2Data(data);
    setStep(3);
  };

  const onFinalSubmit = async () => {
    if (!step1Data || !step2Data) return;

    setIsLoading(true);

    try {
      const res = await authApi.register({
        orgName: step1Data.orgName,
        orgSlug: step1Data.orgSlug,
        adminEmail: step2Data.adminEmail,
        adminPassword: step2Data.adminPassword,
      });

      login(res.user, res.accessToken, res.refreshToken);
      await hydrateAuthProfileAfterLogin();

      toast.show({
        title: 'Organization created! Welcome to CareMind.',
        variant: 'success',
      });

      router.replace('/(app)/dashboard');
    } catch (err: unknown) {
      toast.show({
        title: getApiErrorMessage(err, 'Registration failed. Please try again later.'),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
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
            <View className="mb-2">
              <Text className="text-3xl font-inter-bold text-slate-900">Create your organization</Text>
              <Text className="mt-1 text-muted">Set up CareMind for your practice</Text>
            </View>

            <StepIndicator currentStep={step} />

            {step === 1 ? (
                <View className="gap-4">
                  <Text className="text-lg font-inter-semibold text-slate-900">Organization Details</Text>

                  <Controller
                    control={form1.control}
                    name="orgName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Organization Name"
                        placeholder="Sunrise Medical Center"
                        error={form1.formState.errors.orgName?.message}
                        value={value}
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          onChange(text);
                          const currentSlug = form1.getValues('orgSlug');
                          if (!currentSlug || currentSlug === generateSlug(orgNameValue)) {
                            form1.setValue('orgSlug', generateSlug(text), { shouldValidate: true });
                          }
                        }}
                      />
                    )}
                  />

                  <Controller
                    control={form1.control}
                    name="orgSlug"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Organization Slug"
                        placeholder="sunrise-medical"
                        autoCapitalize="none"
                        error={form1.formState.errors.orgSlug?.message}
                        hint={slugValue ? `Your URL: caremind.ai/org/${slugValue}` : undefined}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />

                  <Button
                    size="lg"
                    onPress={form1.handleSubmit(onStep1Submit)}
                    rightIcon={<ChevronRight size={16} color={colors.white} />}
                  >
                    Continue
                  </Button>
                </View>
              ) : null}

              {step === 2 ? (
                <View className="gap-4">
                  <Text className="text-lg font-inter-semibold text-slate-900">Admin Account</Text>

                  <Controller
                    control={form2.control}
                    name="adminEmail"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Admin Email"
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        placeholder="admin@yourpractice.com"
                        error={form2.formState.errors.adminEmail?.message}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />

                  <Controller
                    control={form2.control}
                    name="adminPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View>
                        <Input
                          label="Password"
                          secureTextEntry={!showPassword}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          error={form2.formState.errors.adminPassword?.message}
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

                        {passwordValue ? (
                          <View className="mt-2 flex-row items-center gap-2">
                            <View className="flex-1 flex-row gap-1">
                              {[1, 2, 3, 4].map((index) => (
                                <View
                                  key={index}
                                  className={cn(
                                    'h-1.5 flex-1 rounded-full',
                                    index <= strength.score ? strength.color : 'bg-border',
                                  )}
                                />
                              ))}
                            </View>
                            <Text className="text-xs text-muted">{strength.label}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  />

                  <Controller
                    control={form2.control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Confirm Password"
                        secureTextEntry={!showConfirm}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        error={form2.formState.errors.confirmPassword?.message}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        trailingIcon={
                          <Pressable
                            onPress={() => setShowConfirm((prev) => !prev)}
                            accessibilityRole="button"
                            accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                            hitSlop={8}
                          >
                            {showConfirm ? (
                              <EyeOff size={18} color={colors.muted} />
                            ) : (
                              <Eye size={18} color={colors.muted} />
                            )}
                          </Pressable>
                        }
                      />
                    )}
                  />

                  <View className="flex-row gap-3">
                    <Button variant="outline" className="flex-1" onPress={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      onPress={form2.handleSubmit(onStep2Submit)}
                      rightIcon={<ChevronRight size={16} color={colors.white} />}
                    >
                      Continue
                    </Button>
                  </View>
                </View>
              ) : null}

              {step === 3 && step1Data && step2Data ? (
                <View className="gap-4">
                  <Text className="text-lg font-inter-semibold text-slate-900">Review & Confirm</Text>

                  <View className="rounded-lg border border-border bg-surface p-4">
                    <View>
                      <Text className="mb-1 text-xs font-inter-medium uppercase tracking-wide text-muted">
                        Organization
                      </Text>
                      <Text className="font-inter-semibold text-slate-900">{step1Data.orgName}</Text>
                      <Text className="text-sm text-muted">caremind.ai/org/{step1Data.orgSlug}</Text>
                    </View>

                    <View className="my-3 h-px bg-border" />

                    <View>
                      <Text className="mb-1 text-xs font-inter-medium uppercase tracking-wide text-muted">
                        Admin Account
                      </Text>
                      <Text className="font-inter-semibold text-slate-900">{step2Data.adminEmail}</Text>
                      <Text className="text-sm text-muted">Role: Administrator</Text>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <Button variant="outline" className="flex-1" onPress={() => setStep(2)}>
                      Back
                    </Button>
                    <Button className="flex-1" size="lg" loading={isLoading} onPress={onFinalSubmit}>
                      Create Organization
                    </Button>
                  </View>
                </View>
              ) : null}

            <Text className="mt-6 text-center text-sm text-muted">
              Already have an account?{' '}
              <Text
                onPress={goToLogin}
                className="font-inter-medium text-primary"
                accessibilityRole="link"
              >
                Sign in
              </Text>
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
