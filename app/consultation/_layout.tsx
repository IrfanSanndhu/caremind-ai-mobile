import { View } from 'react-native';
import { Stack } from 'expo-router';

export default function ConsultationLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </View>
  );
}
