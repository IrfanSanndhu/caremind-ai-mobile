import { Stack } from 'expo-router';
import { KeyboardAwareView } from '@/components/layout/KeyboardAwareView';

export default function ConsultationLayout() {
  return (
    <KeyboardAwareView>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </KeyboardAwareView>
  );
}
