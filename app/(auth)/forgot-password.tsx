import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Activity, ArrowLeft, Mail } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
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

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleBack = useCallback(() => goToLoginOnBack(router), [router]);
  useAuthBackHandler(handleBack);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(values.email);
      setSubmitted(true);
      toast.show({
        title: 'Check your email',
        description: 'Reset instructions were sent if an account exists.',
        variant: 'success',
      });
    } catch (err: unknown) {
      toast.show({
        title: getApiErrorMessage(err, 'Could not send reset email'),
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

      <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
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
            <View className="mb-6 items-center">
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                <Mail size={24} color={colors.primary.DEFAULT} />
              </View>
              <Text className="text-center text-3xl font-inter-bold text-slate-900">
                Forgot password?
              </Text>
              <Text className="mt-2 text-center text-muted">
                {submitted
                  ? 'If an account exists for that email, you will receive reset instructions shortly.'
                  : 'Enter your email and we will send you a reset link.'}
              </Text>
            </View>

            {!submitted ? (
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

                <Button size="lg" loading={isLoading} onPress={handleSubmit(onSubmit)}>
                  Send reset link
                </Button>
              </View>
            ) : (
              <Button size="lg" variant="outline" onPress={handleBack}>
                Back to sign in
              </Button>
            )}

            {!submitted ? (
              <Pressable onPress={handleBack} className="mt-6 flex-row items-center justify-center gap-2 py-2">
                <ArrowLeft size={16} color={colors.muted} />
                <Text className="text-sm text-muted">Back to sign in</Text>
              </Pressable>
            ) : null}
          </Card>
        </ScrollView>
      </View>
    </View>
  );
}
