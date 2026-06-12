import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Activity, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
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
import { goToLoginOnBack, useAuthBackHandler } from '@/hooks/useAuthBackHandler';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = typeof tokenParam === 'string' ? tokenParam : (tokenParam?.[0] ?? '');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = useCallback(() => goToLoginOnBack(router), [router]);
  useAuthBackHandler(handleBack);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.show({ title: 'Reset link is invalid or missing', variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: values.newPassword });
      toast.show({
        title: 'Password updated',
        description: 'You can sign in now.',
        variant: 'success',
      });
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      toast.show({
        title: getApiErrorMessage(err, 'Could not reset password'),
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
            {!token ? (
              <View className="items-center">
                <Text className="text-center text-2xl font-inter-bold text-slate-900">
                  Invalid reset link
                </Text>
                <Text className="mt-2 text-center text-muted">
                  This password reset link is missing or invalid.
                </Text>
                <Button
                  className="mt-6 w-full"
                  onPress={() => router.replace('/(auth)/forgot-password')}
                >
                  Request a new link
                </Button>
              </View>
            ) : (
              <>
                <View className="mb-6 items-center">
                  <View className="mb-4 h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                    <KeyRound size={24} color={colors.primary.DEFAULT} />
                  </View>
                  <Text className="text-center text-3xl font-inter-bold text-slate-900">
                    Set a new password
                  </Text>
                  <Text className="mt-2 text-center text-muted">
                    Choose a strong password for your account.
                  </Text>
                </View>

                <View className="gap-4">
                  <Controller
                    control={control}
                    name="newPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="New password"
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        error={errors.newPassword?.message}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        trailingIcon={
                          <Pressable
                            onPress={() => setShowPassword((prev) => !prev)}
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
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Confirm password"
                        secureTextEntry={!showConfirm}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        error={errors.confirmPassword?.message}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        trailingIcon={
                          <Pressable onPress={() => setShowConfirm((prev) => !prev)} hitSlop={8}>
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

                  <Button size="lg" loading={isLoading} onPress={handleSubmit(onSubmit)}>
                    Reset password
                  </Button>
                </View>
              </>
            )}

            <Pressable onPress={handleBack} className="mt-6 flex-row items-center justify-center gap-2 py-2">
              <ArrowLeft size={16} color={colors.muted} />
              <Text className="text-sm text-muted">Back to sign in</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
