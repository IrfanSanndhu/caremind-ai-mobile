import { Stack } from 'expo-router';

const authScreenOptions = {
  headerShown: false,
  animation: 'none' as const,
  gestureEnabled: false,
};

export default function AuthLayout() {
  return (
    <Stack initialRouteName="login" screenOptions={authScreenOptions}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
