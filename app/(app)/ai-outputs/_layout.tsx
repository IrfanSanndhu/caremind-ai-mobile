import { Stack } from 'expo-router';

export default function AiOutputsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[appointmentId]" />
    </Stack>
  );
}
