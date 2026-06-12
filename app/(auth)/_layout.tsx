import { Stack } from 'expo-router';
import { KeyboardAwareView } from '@/components/layout/KeyboardAwareView';

const authScreenOptions = {
  headerShown: false,
  animation: 'none' as const,
  gestureEnabled: false,
};

export default function AuthLayout() {
  return (
    <KeyboardAwareView>
      <Stack initialRouteName="login" screenOptions={authScreenOptions}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </KeyboardAwareView>
  );
}
